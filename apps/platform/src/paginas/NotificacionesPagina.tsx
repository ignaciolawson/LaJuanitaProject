import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router'

import { ApiError } from '../api/cliente'
import { marcarLeida, marcarTodasLeidas, misNotificaciones } from '../api/portal'
import type { NotificacionResumen } from '../api/tiposPortal'
import { Aviso, Boton } from '../componentes/Boton'
import { cuando } from '../componentes/presentacion'
import { CabeceraDePagina } from '../componentes/CabeceraDePagina'
import { EstadoVacio } from '../componentes/EstadoVacio'

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
      <CabeceraDePagina
        titulo="Notificaciones"
        aclaracion={<>{cargando ? 'Cargando…' : sinLeer === 0 ? 'Nada sin leer' : `${sinLeer} sin leer`}</>}
        acciones={<>{sinLeer > 0 && (
          <Boton
            variante="secundario"
            onClick={() => {
              void marcarTodasLeidas().then(cargar)
            }}
          >
            Marcar todas como leídas
          </Boton>
        )}</>}
      />

      {error && (
        <div className="mb-4">
          <Aviso>{error}</Aviso>
        </div>
      )}

      {!cargando && avisos.length === 0 && (
        <EstadoVacio titulo="No tenés notificaciones." />
      )}

      <ul className="space-y-2">
        {avisos.map((a) => (
          <li
            key={a.idNotificacion}
            className={`rounded-lg border border-linea px-5 py-4 transition-colors ${
              a.leida ? 'bg-superficie-2' : 'bg-superficie shadow-tarjeta'
            }`}
          >
            <div className="flex items-baseline justify-between gap-3">
              <p className="t-mono flex min-w-0 items-baseline gap-2 text-tenue">
                {/* ⚠️ El punto rojo es la única excepción a "un rojo por
                    pantalla", y lo que la sostiene es el tamaño: seis píxeles.
                    Acá el marcador es por ítem por naturaleza —hay diez sin leer o
                    ninguno— y a esa escala una columna de puntos se lee como una
                    lista de marcas, no como diez alarmas. Cualquier cosa más
                    grande (un borde, un fondo) sí rompería la regla. */}
                {!a.leida && (
                  <span
                    aria-hidden
                    className="h-1.5 w-1.5 shrink-0 self-center rounded-full bg-red"
                  />
                )}
                <span className="truncate">{a.titulo ?? 'Aviso'}</span>
                {!a.leida && <span className="sr-only">(sin leer)</span>}
              </p>

              <span className="t-mono shrink-0 text-apagado">{cuando(a.fechaCreacion)}</span>
            </div>

            {/* EL MENSAJE ES EL PROTAGONISTA, y antes estaba al revés.
                Era `text-sm text-tenue` —más chico y más gris que el título—,
                o sea: lo único que hay que leer, tipografiado como metadato.
                Y acá pesa más que en otras pantallas porque **esto no es una
                notificación que se entrega**: no hay mail ni WhatsApp, es un
                buzón adentro del sistema, así que el texto tiene que sostenerse
                solo. Los avisos automáticos están escritos justamente así
                —"Juan debe $50.000 desde hace 12 días"— y el título es apenas de
                qué clase de aviso se trata. */}
            <p className={`mt-2 text-base leading-relaxed ${a.leida ? 'text-tenue' : ''}`}>
              {a.contenido}
            </p>

            <div className="mt-3 flex items-center gap-4">
              {a.urlDestino && (
                <Link
                  to={a.urlDestino}
                  className="text-sm font-medium underline underline-offset-2 transition-colors hover:text-acento"
                >
                  Ver
                </Link>
              )}
              {!a.leida && (
                <Boton
                  variante="enlace"
                  type="button"
                  onClick={() => {
                    void marcarLeida(a.idNotificacion).then(cargar)
                  }}
                >
                  Marcar leída
                </Boton>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
