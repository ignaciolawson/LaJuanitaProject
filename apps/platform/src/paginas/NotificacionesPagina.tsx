import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { marcarLeida, marcarTodasLeidas, misNotificaciones } from '../api/portal'
import type { NotificacionResumen } from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { cuando } from '../componentes/presentacion'

/**
 * Módulo 4 — mis notificaciones.
 *
 * **Es una bandeja adentro del sistema, no un envío.** No hay mail —no existe
 * infraestructura de correo ni se planea— ni WhatsApp, que es el canal real del
 * estudio y quedó fuera del alcance inicial. El aviso se ve cuando la persona
 * entra, y por eso el contenido tiene que bastarse solo: el motivo de un rechazo
 * viaja adentro del texto y no como un "entrá a ver".
 *
 * **La tabla existe desde `V1` y hasta este módulo nadie la escribía.** Su primer
 * escritor es la resolución de un pedido de sala. Lo que todavía no existe es el
 * aviso automático de la deuda a los 7 días: eso corre sin que nadie pida nada
 * —necesita un scheduler y decidir qué pasa si corre dos veces el mismo día— y
 * es otra máquina, no un tipo de notificación que falte.
 */
export function NotificacionesPagina() {
  const [avisos, setAvisos] = useState<NotificacionResumen[]>([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const cargar = useCallback(async () => {
    try {
      setAvisos(await misNotificaciones())
      setError(null)
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'No se pudieron cargar tus notificaciones.')
    } finally {
      setCargando(false)
    }
  }, [])

  useEffect(() => {
    void cargar()
  }, [cargar])

  const sinLeer = avisos.filter((a) => !a.leida).length

  return (
    <div className="max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">Notificaciones</h2>
          <p className="mt-1 text-sm text-tenue">
            {cargando ? 'Cargando…' : sinLeer === 0 ? 'Nada sin leer' : `${sinLeer} sin leer`}
          </p>
        </div>
        {sinLeer > 0 && (
          <Boton
            variante="secundario"
            onClick={() => {
              void marcarTodasLeidas().then(cargar)
            }}
          >
            Marcar todas como leídas
          </Boton>
        )}
      </div>

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && avisos.length === 0 && (
        <p className="rounded-lg border border-linea bg-white px-5 py-8 text-center text-sm text-tenue">
          No tenés notificaciones.
        </p>
      )}

      <ul className="space-y-2">
        {avisos.map((a) => (
          <li
            key={a.idNotificacion}
            className={`rounded-lg border bg-white px-5 py-4 ${
              a.leida ? 'border-linea' : 'border-ink'
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                {a.titulo && (
                  <h3 className={a.leida ? 'font-medium text-tenue' : 'font-semibold'}>
                    {a.titulo}
                  </h3>
                )}
                <p className="mt-0.5 text-sm text-tenue">{a.contenido}</p>
                {a.urlDestino && (
                  <Link
                    to={a.urlDestino}
                    className="mt-2 inline-block text-sm underline underline-offset-2 hover:text-red"
                  >
                    Ver
                  </Link>
                )}
              </div>

              <div className="shrink-0 text-right">
                <div className="text-xs text-apagado">{cuando(a.fechaCreacion)}</div>
                {!a.leida && (
                  <button
                    type="button"
                    onClick={() => {
                      void marcarLeida(a.idNotificacion).then(cargar)
                    }}
                    className="mt-2 text-xs text-tenue underline underline-offset-2 hover:text-red"
                  >
                    Marcar leída
                  </button>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
