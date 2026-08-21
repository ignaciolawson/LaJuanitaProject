import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { cancelarSolicitud, misSolicitudes } from '../api/portal'
import { NOMBRE_DE_ESTADO_SOLICITUD, type SolicitudResumen } from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { diaYMes, hhmm } from '../componentes/semana'

/**
 * Módulo 4 — mis pedidos de sala.
 *
 * **Muestra todos los estados, no solo los pendientes.** Lo que te rechazaron, y
 * por qué, es la mitad útil de esta pantalla: sin el motivo a la vista la
 * persona vuelve a pedir lo mismo. Y lo cancelado queda porque una solicitud no
 * se borra nunca — la base lo impide, y cancelar es un estado que deja registro.
 */
export function MisSolicitudesPagina() {
  const [solicitudes, setSolicitudes] = useState<SolicitudResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    setCargando(true)
    try {
      setSolicitudes(await misSolicitudes())
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus pedidos.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  async function cancelar(id: number) {
    try {
      await cancelarSolicitud(id)
      await cargar()
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudo cancelar el pedido.')
    }
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Mis pedidos</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : `${solicitudes.length} en total`}
          </p>
        </div>
        <Link to="/reservar">
          <Boton>Pedir una cabina</Boton>
        </Link>
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && solicitudes.length === 0 && (
        <p className="rounded-lg border border-linea bg-white px-5 py-8 text-center text-sm text-tenue">
          Todavía no pediste ninguna sala.
        </p>
      )}

      <ul className="space-y-3">
        {solicitudes.map((s) => (
          <li key={s.idSolicitud} className="rounded-lg border border-linea bg-white px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">
                  {s.tipoUso} · {s.sala}
                </div>
                <div className="text-sm text-tenue">
                  {diaYMes(s.fecha)} de {hhmm(s.horaInicio)} a {hhmm(s.horaFin)}
                </div>
                {s.comentario && (
                  <div className="mt-1 text-xs text-apagado">{s.comentario}</div>
                )}
              </div>

              <div className="text-right">
                <Estado estado={s.estado} />
                {s.estado === 'PENDIENTE' && (
                  <div className="mt-2">
                    <Boton variante="secundario" onClick={() => void cancelar(s.idSolicitud)}>
                      Cancelar
                    </Boton>
                  </div>
                )}
              </div>
            </div>

            {/* La respuesta de administración. En un rechazo la base la exige, y
                es lo único que le permite a la persona pedir otra cosa. */}
            {s.respuesta && (
              <p className="mt-3 border-t border-linea pt-3 text-sm text-tenue">
                {s.respuesta}
                {s.resueltaPor && <span className="text-apagado"> — {s.resueltaPor}</span>}
              </p>
            )}

            {s.estado === 'APROBADA' && (
              <p className="mt-3 border-t border-linea pt-3 text-sm">
                <Link to="/mis-reservas" className="underline underline-offset-2 hover:text-acento">
                  Ver la reserva en mis reservas
                </Link>
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function Estado({ estado }: { estado: SolicitudResumen['estado'] }) {
  const estilo =
    estado === 'APROBADA'
      ? 'border-linea text-ink'
      : estado === 'RECHAZADA'
        ? 'border-red/30 text-acento'
        : 'border-linea text-tenue'

  return (
    <span className={`rounded-full border px-2.5 py-1 text-xs ${estilo}`}>
      {NOMBRE_DE_ESTADO_SOLICITUD[estado]}
    </span>
  )
}
