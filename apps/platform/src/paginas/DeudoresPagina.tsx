import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { listarDeudores } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { type Deudor, NOMBRE_DE_MOTIVO } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { useErrorPasajero } from '../componentes/aviso'
import { antiguedad, importe } from '../componentes/dinero'
import { NOMBRE_DE_DISCIPLINA, cuando } from '../componentes/presentacion'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { fecha } from '../componentes/semana'

/**
 * Módulo 3, pantalla 4 — quién debe, cuánto y hace cuántos días.
 *
 * <p><b>Los días de atraso se cuentan desde el renglón más viejo</b>, y esa
 * cuenta la hace el servidor. Si alguien debe desde hace dos meses y ayer se le
 * anotó otra cuota, sigue debiendo desde hace dos meses: contarlo desde el
 * renglón más nuevo haría que la deuda se rejuvenezca sola cada vez que crece,
 * que es lo contrario de lo que esta pantalla existe para mostrar.
 *
 * <p>Lo mismo con {@code vencido}, que espeja la regla dura de §6 —alerta pasados
 * los 7 días—: viene calculado para que el umbral viva en un solo lugar cuando
 * se convierta en la notificación automática.
 *
 * <p>Ordenados por antigüedad y no por monto: la pregunta de Micaela es a quién
 * hay que llamar primero, y esa es la deuda más vieja, no la más grande.
 */
export function DeudoresPagina() {
  const [deudores, setDeudores] = useState<Deudor[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useErrorPasajero()

  const cargar = useCallback(async () => {
    setCargando(true)
    setError(null)
    try {
      setDeudores(await listarDeudores())
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cargar el listado.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const vencidos = deudores.filter((d) => d.vencido).length
  const sinSeniar = deudores.filter((d) => d.motivo === 'SIN_SENIAR').length

  return (
    <div>
      <CabeceraDePagina
        titulo="Deudores"
        aclaracion={<>{cargando
            ? 'Cargando…'
            : deudores.length === 0
              ? 'Nadie debe nada'
              : `${deudores.length} ${deudores.length === 1 ? 'pendiente' : 'pendientes'}` +
                (vencidos > 0 ? ` · ${vencidos} ${vencidos === 1 ? 'vencido' : 'vencidos'}` : '') +
                (sinSeniar > 0 ? ` · ${sinSeniar} sin señar` : '')}</>}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <Tabla columnas={['Quién', 'Contacto', 'Por qué', { etiqueta: 'Debe', alineacion: 'derecha' }, 'Desde']}>
            {deudores.map((d) => (
              // La clave lleva la moneda: quien debe en las dos aparece dos
              // veces, y son dos deudas distintas que se reclaman por separado.
              // Sin cuenta no hay id, así que la clave lleva el nombre: dos
              // deudores externos distintos no pueden colapsar en la misma fila.
              // Y la inscripción, desde P72: la misma persona puede tener una
              // deuda anotada y un programa sin señar.
              <tr key={`${d.idUsuario ?? d.nombre}-${d.moneda}-${d.idInscripcion ?? 'pago'}`}>
                <Celda>
                  {/* **El deudor sin cuenta entra igual, pero no se linkea.**
                      Aparece porque una deuda que no está en esta pantalla es una
                      deuda que nadie va a ir a cobrar (`V19`, `mejoras.md` §9.1);
                      no se linkea porque no tiene estado de cuenta al que llevar,
                      y un link a `/estado-de-cuenta/null` es peor que ninguno. */}
                  {d.idUsuario === null ? (
                    <div className="font-medium">
                      {d.nombre}
                      <span className="ml-2 text-xs font-normal text-apagado">sin cuenta</span>
                    </div>
                  ) : (
                    <Link
                      to={`/admin/estado-de-cuenta/${d.idUsuario}`}
                      className="font-medium underline underline-offset-2 hover:text-acento"
                    >
                      {d.apellido}, {d.nombre}
                    </Link>
                  )}
                  <div className="text-xs text-tenue">
                    {d.motivo !== 'DEUDA_ANOTADA'
                      ? `Programa de ${NOMBRE_DE_DISCIPLINA[d.disciplina!]}`
                      : d.cantidadDePagos === 1
                        ? '1 pago pendiente'
                        : `${d.cantidadDePagos} pagos pendientes`}
                  </div>
                </Celda>
                <Celda className="text-tenue">
                  {/* El teléfono primero: el reclamo se hace por WhatsApp, que
                      es el canal que el relevamiento marca como el único real.
                      Para el deudor sin cuenta es lo único que hay: el contacto
                      que se anotó al cobrar. */}
                  {d.telefono ?? <span className="text-apagado">Sin teléfono</span>}
                  {d.email && <div className="text-xs">{d.email}</div>}
                </Celda>
                <Celda>
                  <PorQue deudor={d} />
                </Celda>
                <Celda numerica className="whitespace-nowrap font-medium">
                  {importe(d.adeudado, d.moneda)}
                </Celda>
                <Celda className="whitespace-nowrap">
                  {/* El saldo de un programa no tiene reloj (P72): se dice desde
                      cuándo, nunca "vencido". */}
                  <span className={d.vencido ? 'font-medium text-acento' : 'text-tenue'}>
                    {antiguedad(d.diasDeAtraso)}
                  </span>
                  <div className="text-xs text-tenue">{fecha(d.desde)}</div>
                </Celda>
              </tr>
            ))}
          
            {/* Adentro de la tabla y no debajo: vacía pero con encabezados, se
                ve qué columnas hay y que ninguna tiene filas. Sueltos, no se
                distingue "no hay deudas" de "filtré de más" ni de "no cargó". */}
            {!cargando && deudores.length === 0 && (
              <FilaVacia columnas={5}>Nadie debe nada. Todo al día.</FilaVacia>
            )}
          </Tabla>

    </div>
  )
}

/**
 * De qué se trata cada fila (P72). Deudores tiene dos fuentes desde la §16 ·
 * Fase 6, y sin esto una preinscripta sin señar y una deuda anotada se leen
 * igual — y son dos llamados distintos. **La preinscripta dice su plazo**, que
 * es lo que decide si hay que llamar; el saldo no dice ninguno porque no lo
 * tiene: se paga antes de empezar, cuando sea.
 */
function PorQue({ deudor }: { deudor: Deudor }) {
  if (deudor.motivo === 'SIN_SENIAR' && deudor.vence) {
    return (
      <>
        <span className={deudor.vencido ? 'font-medium text-acento' : ''}>
          {NOMBRE_DE_MOTIVO.SIN_SENIAR}
        </span>
        <div className="text-xs text-tenue">
          {deudor.vencido ? `Venció el ${cuando(deudor.vence)}` : `Hasta el ${cuando(deudor.vence)}`}
        </div>
      </>
    )
  }
  return <span className={deudor.motivo === 'DEUDA_ANOTADA' ? '' : 'text-tenue'}>{NOMBRE_DE_MOTIVO[deudor.motivo]}</span>
}
