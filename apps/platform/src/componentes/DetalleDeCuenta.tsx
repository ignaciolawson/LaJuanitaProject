import {
  NOMBRE_DE_ESTADO_PAGO,
  NOMBRE_DE_MEDIO,
  type EstadoDeCuenta,
} from '../api/tiposAdmin'
import { importe } from './dinero'
import { NOMBRE_DE_DISCIPLINA, capitalizar } from './presentacion'

/**
 * Las tres partes de un estado de cuenta: saldos por moneda, qué se contrató y
 * los movimientos.
 *
 * **Salió de `EstadoDeCuentaPagina` a un componente compartido con el Módulo 4**,
 * cuando el portal empezó a mostrarle a cada uno su propia cuenta. Es el mismo
 * DTO y tiene que ser la misma lectura: dos versiones del mismo saldo son la
 * forma más fácil de que un día no coincidan, y de las dos la que se equivoca es
 * siempre la que ve el cliente.
 *
 * Lo único que cambia entre las dos pantallas es el encabezado —administración
 * muestra de quién es la cuenta, el portal no necesita decírtelo—, así que eso
 * queda afuera.
 *
 * **No hay un saldo único, y no puede haberlo** (§3.3): un alumno puede tener el
 * curso de DJ al día y el de producción con deuda, uno en pesos y otro en
 * dólares. Las monedas nunca se restan entre sí (§2.3) — unificarlas exigiría
 * elegir una cotización y el número no correspondería a ninguna caja real.
 */
export function DetalleDeCuenta({ cuenta }: { cuenta: EstadoDeCuenta }) {
  return (
    <>
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
    </>
  )
}
