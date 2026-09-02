import { useCallback, useEffect, useState } from 'react'
import { useLocation } from 'react-router'

import { pendientes } from '../api/administracion'
import { notificacionesSinLeer } from '../api/portal'
import type { UsuarioActual } from '../api/tipos'
import type { ClaveDePendiente } from './menu'
import { puedeAdministrar } from './menu'

/**
 * Cuántas cosas esperan, para los números del sidebar (`mejoras.md` §13 · B1).
 *
 * ─────────────────────────────────────────────────────────────────────────
 * **DOS ENDPOINTS, Y NO UNO.** Las notificaciones son de cada persona
 * (`GET /api/me/notificaciones/sin-leer`, que existe desde el Módulo 4); las
 * tres bandejas son de administración (`GET /api/pendientes`). El segundo sólo
 * se pide si la persona administra: a un `USUARIO` le contestaría 403, y pedir
 * algo que va a ser rechazado es exactamente lo que `puedeOperar` evita en los
 * botones.
 *
 * **CUÁNDO SE REFRESCA: al montar y en cada cambio de ruta.** Es lo que hace
 * honesto el pedido de Ignacio —*"cuando se marque como leída, baja"*— sin tener
 * que cablear cuatro pantallas para que avisen cuando resuelven algo. El
 * razonamiento es que **navegar es justo lo que pasa después de resolver**: se
 * aprueba un pedido de sala y se vuelve al calendario, se atiende una ficha del
 * buzón y se va a crear la inscripción. El caso que esto no cubre —resolver algo
 * y quedarse quieto en la misma pantalla— es para lo que está `refrescar`.
 *
 * **UN ERROR ACÁ NO ROMPE NADA.** Si un pedido falla, ese contador queda en
 * `undefined` y el ítem se dibuja como se dibujaba antes de existir esto. Es el
 * mismo criterio que el Inicio: un bloque caído no puede vaciar la pantalla, y
 * mucho menos puede hacerlo el menú, que está en las 36.
 * ─────────────────────────────────────────────────────────────────────────
 */
export type Contadores = Partial<Record<ClaveDePendiente, number>>

export function usePendientes(usuario: UsuarioActual): {
  contadores: Contadores
  refrescar: () => void
} {
  const [contadores, setContadores] = useState<Contadores>({})
  const { pathname } = useLocation()
  const administra = puedeAdministrar(usuario)

  const refrescar = useCallback(() => {
    // Cada pedido escribe sólo lo suyo, así que uno que falla no borra el número
    // que el otro trajo bien.
    notificacionesSinLeer()
      .then((notificaciones) => setContadores((previos) => ({ ...previos, notificaciones })))
      .catch(() => {})

    if (!administra) return

    pendientes()
      .then((bandejas) => setContadores((previos) => ({ ...previos, ...bandejas })))
      .catch(() => {})
  }, [administra])

  useEffect(() => {
    refrescar()
    // `pathname` está en las dependencias a propósito: es el disparador. Sin él
    // los números se traen una vez al entrar y quedan viejos toda la sesión, que
    // es peor que no tenerlos — un (3) que ya no es cierto manda a alguien a una
    // bandeja vacía.
  }, [refrescar, pathname])

  return { contadores, refrescar }
}
