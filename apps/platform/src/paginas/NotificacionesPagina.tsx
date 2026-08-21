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
 * escritor fue la resolución de un pedido de sala; desde el 2026-08-20 tiene un
 * segundo escritor que no es una persona sino el disparador automático, que corre
 * todos los días y deja acá la deuda vencida y la entrega de M&M sin cobrar.
 *
 * **Esta pantalla no cambió al llegar esa máquina, y eso es parte del diseño.** No
 * decide nada por el tipo de aviso: muestra título y contenido, y quien escribió la
 * fila es problema del que la escribió. Por eso el aviso automático tiene que
 * bastarse solo igual que el otro — *"Juan debe $50.000 desde hace 12 días"*, no
 * *"tenés una deuda para revisar"*.
 *
 * **Y por eso también la ve administración**: `Notificaciones` no tiene predicado
 * en `menu.ts`, va para todo el mundo. Los dos avisos automáticos son de cobranza
 * y le llegan a quien puede actuar (ADMIN·STAFF); sin esta entrada visible para
 * ellos, la máquina escribiría en una bandeja que nadie abre.
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
                    className="mt-2 inline-block text-sm underline underline-offset-2 hover:text-acento"
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
                    className="mt-2 text-xs text-tenue underline underline-offset-2 hover:text-acento"
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
