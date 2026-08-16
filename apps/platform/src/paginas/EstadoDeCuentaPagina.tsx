import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router'

import { estadoDeCuenta } from '../api/administracion'
import { ApiError } from '../api/cliente'
import {
  NOMBRE_DE_ESTADO_PAGO,
  NOMBRE_DE_MEDIO,
  type EstadoDeCuenta,
} from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { importe } from '../componentes/dinero'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from '../componentes/presentacion'

/**
 * Módulo 3, pantalla 2 — qué contrató una persona, qué pagó y qué debe.
 *
 * <p><b>No hay un saldo único, y no puede haberlo.</b> §3.3 lo dejó dicho desde
 * el principio: *"el estado de pago de Juan" no es un valor único*. Un alumno
 * puede tener el curso de DJ al día y el de producción con deuda, y puede haber
 * pagado uno en pesos y otro en dólares. Esta pantalla muestra tres cosas
 * distintas —saldos por moneda, contratos y movimientos— en vez de un semáforo
 * que tendría que elegir cuál de las tres miente.
 *
 * <p>Las monedas nunca se restan entre sí (§2.3): unificarlas exigiría elegir
 * una cotización y el número resultante no correspondería a ninguna caja real.
 */
export function EstadoDeCuentaPagina() {
  const { idUsuario } = useParams()

  const [cuenta, setCuenta] = useState<EstadoDeCuenta | null>(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setCuenta(await estadoDeCuenta(Number(idUsuario)))
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el estado de cuenta.')
      setCuenta(null)
    } finally {
      setCargando(false)
    }
  }, [idUsuario])

  useEffect(() => {
    void cargar()
  }, [cargar])

  if (cargando) return <p className="text-sm text-tenue">Cargando…</p>

  if (error) return <Aviso>{error}</Aviso>

  if (!cuenta) return null

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-xl font-semibold tracking-tight">
          {cuenta.apellido}, {cuenta.nombre}
        </h2>
        <p className="mt-1 text-sm text-tenue">{cuenta.email}</p>
      </div>

      {/* 1. Los saldos, por moneda */}
      <section className="mb-8">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tenue">
          Saldos
        </h3>
        {cuenta.saldos.length === 0 ? (
          <p className="text-sm text-apagado">Todavía no tiene movimientos.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {cuenta.saldos.map((s) => (
              <div key={s.moneda} className="rounded-lg border border-linea bg-white p-5">
                <h4 className="font-semibold">{s.moneda === 'USD' ? 'Dólares' : 'Pesos'}</h4>
                <p className="mt-1 text-2xl font-semibold tracking-tight">
                  {importe(s.pagado, s.moneda)}
                </p>
                <p className="text-xs text-tenue">pagado</p>
                {s.adeudado > 0 && (
                  <p className="mt-3 text-sm text-red">
                    Debe {importe(s.adeudado, s.moneda)}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* 2. Los contratos */}
      <section className="mb-8">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tenue">
          Qué contrató
        </h3>
        {cuenta.contratos.length === 0 ? (
          <p className="text-sm text-apagado">No tiene inscripciones.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-linea bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
                  <th className="px-4 py-3 font-semibold">Curso</th>
                  <th className="px-4 py-3 font-semibold">Precio</th>
                  <th className="px-4 py-3 font-semibold">Pagado</th>
                  <th className="px-4 py-3 font-semibold">Saldo</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {cuenta.contratos.map((c) => (
                  <tr key={c.idInscripcion}>
                    <td className="px-4 py-3">
                      <div className="font-medium">{NOMBRE_DE_DISCIPLINA[c.disciplina]}</div>
                      <div className="text-xs text-tenue">
                        {c.nivel ? capitalizar(c.nivel) : 'Sin nivel'} ·{' '}
                        {capitalizar(c.estado)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums text-tenue">
                      {importe(c.precioTotal, c.moneda)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      {importe(c.pagado, c.moneda)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap tabular-nums">
                      <span className={c.saldo > 0 ? 'font-medium text-red' : 'text-tenue'}>
                        {importe(c.saldo, c.moneda)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {c.saldado ? (
                        <span className="text-xs text-tenue">Saldado</span>
                      ) : c.senado ? (
                        // §13: con el 50% cubierto ya se puede reservar. Es el
                        // dato que Micaela necesita antes de dar un horario.
                        <span className="text-xs text-tenue">Seña cubierta</span>
                      ) : (
                        <span className="text-xs text-red">Sin seña</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* 3. Los movimientos */}
      <section>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-tenue">
          Movimientos ({cuenta.pagos.length})
        </h3>
        {cuenta.pagos.length === 0 ? (
          <p className="text-sm text-apagado">Sin pagos registrados.</p>
        ) : (
          <div className="overflow-x-auto rounded-lg border border-linea bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-linea text-left text-xs uppercase tracking-wider text-tenue">
                  <th className="px-4 py-3 font-semibold">Fecha</th>
                  <th className="px-4 py-3 font-semibold">Qué salda</th>
                  <th className="px-4 py-3 font-semibold">Monto</th>
                  <th className="px-4 py-3 font-semibold">Medio</th>
                  <th className="px-4 py-3 font-semibold">Estado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-linea">
                {cuenta.pagos.map((p) => (
                  <tr key={p.idPago} className={p.estadoPago === 'ANULADO' ? 'text-apagado' : ''}>
                    <td className="px-4 py-3 whitespace-nowrap text-tenue">
                      {p.fechaPago.split('-').reverse().join('/')}
                    </td>
                    <td className="px-4 py-3">
                      <div>{p.queSalda}</div>
                      {p.concepto && <div className="text-xs text-tenue">{p.concepto}</div>}
                    </td>
                    <td
                      className={`px-4 py-3 whitespace-nowrap tabular-nums ${
                        p.estadoPago === 'ANULADO' ? 'line-through' : ''
                      }`}
                    >
                      {importe(p.monto, p.moneda)}
                    </td>
                    <td className="px-4 py-3 text-tenue">{NOMBRE_DE_MEDIO[p.medioPago]}</td>
                    <td className="px-4 py-3">
                      <div className="text-xs">{NOMBRE_DE_ESTADO_PAGO[p.estadoPago]}</div>
                      {/* El motivo se muestra: una fila anulada sin explicación
                          obliga a preguntarle a quien la anuló, que es
                          exactamente lo que `V7` quiso evitar al exigirlo. */}
                      {p.motivoAnulacion && (
                        <div className="text-xs text-apagado">{p.motivoAnulacion}</div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
