import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { listarDeudores } from '../api/administracion'
import { ApiError } from '../api/cliente'
import { DIAS_PARA_VENCER, type Deudor } from '../api/tiposAdmin'
import { Aviso } from '../componentes/Boton'
import { antiguedad, importe } from '../componentes/dinero'
import { Tabla, Celda, FilaVacia } from '../componentes/Tabla'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'

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
  const [error, setError] = useState<string | null>(null)

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

  return (
    <div>
      <CabeceraDePagina
        titulo="Deudores"
        aclaracion={<>{cargando
            ? 'Cargando…'
            : deudores.length === 0
              ? 'Nadie debe nada'
              : `${deudores.length} ${deudores.length === 1 ? 'deuda' : 'deudas'}` +
                (vencidos > 0 ? ` · ${vencidos} de más de ${DIAS_PARA_VENCER} días` : '')}</>}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      <Tabla columnas={['Quién', 'Contacto', { etiqueta: 'Debe', alineacion: 'derecha' }, 'Desde']}>
            {deudores.map((d) => (
              // La clave lleva la moneda: quien debe en las dos aparece dos
              // veces, y son dos deudas distintas que se reclaman por separado.
              // Sin cuenta no hay id, así que la clave lleva el nombre: dos
              // deudores externos distintos no pueden colapsar en la misma fila.
              <tr key={`${d.idUsuario ?? d.nombre}-${d.moneda}`}>
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
                    {d.cantidadDePagos === 1
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
                <Celda numerica className="whitespace-nowrap font-medium">
                  {importe(d.adeudado, d.moneda)}
                </Celda>
                <Celda className="whitespace-nowrap">
                  <span className={d.vencido ? 'font-medium text-acento' : 'text-tenue'}>
                    {antiguedad(d.diasDeAtraso)}
                  </span>
                  <div className="text-xs text-tenue">{fechaCorta(d.desde)}</div>
                </Celda>
              </tr>
            ))}
          
            {/* Adentro de la tabla y no debajo: vacía pero con encabezados, se
                ve qué columnas hay y que ninguna tiene filas. Sueltos, no se
                distingue "no hay deudas" de "filtré de más" ni de "no cargó". */}
            {!cargando && deudores.length === 0 && (
              <FilaVacia columnas={4}>No hay deudas anotadas. Todo al día.</FilaVacia>
            )}
          </Tabla>

    </div>
  )
}

function fechaCorta(iso: string): string {
  return iso.split('-').reverse().join('/')
}
