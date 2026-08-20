import { pedir } from './cliente'
import type { Pagina } from './tiposAdmin'
import type {
  AltaTrabajo,
  CobroTrabajo,
  EdicionTrabajo,
  EstadoTrabajo,
  TrabajoDelPortal,
  TrabajoResumen,
} from './tiposMastering'

/**
 * Los pedidos del Módulo 6 — Mix & Mastering.
 *
 * **Este archivo tiene los dos lados y es a propósito.** Arriba, lo de
 * administración (`/api/mastering`), que se acota por rol; abajo, lo del cliente
 * (`/api/me/mastering`), que se acota por identidad —el id sale del token y no hay
 * dónde escribir el de otro—. Son dos modelos de autorización distintos y en el
 * backend son dos controllers, pero son un solo módulo: separarlos acá obligaría a
 * abrir dos archivos para entender una pantalla.
 *
 * **Cinco operaciones de escritura y ninguna es un PUT genérico**: editar el
 * expediente, mover el estado, sumar una revisión, liberar el premaster y cobrar
 * son cinco hechos distintos. Metidos en un solo guardado, liberar un premaster
 * sería un checkbox más del formulario — sin motivo, sin autor, y sin nada que
 * distinga "lo entregué" de "guardé la ficha".
 */

// == Administración =========================================================

export function listarTrabajos(opciones: {
  buscar?: string
  estado?: EstadoTrabajo
  pagina?: number
}) {
  const partes = Object.entries(opciones)
    .filter(([, valor]) => valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`)

  return pedir<Pagina<TrabajoResumen>>(
    `/api/mastering${partes.length > 0 ? `?${partes.join('&')}` : ''}`,
  )
}

export function obtenerTrabajo(id: number) {
  return pedir<TrabajoResumen>(`/api/mastering/${id}`)
}

export function registrarTrabajo(datos: AltaTrabajo) {
  return pedir<TrabajoResumen>('/api/mastering', { metodo: 'POST', cuerpo: datos })
}

/** El expediente: presupuesto, fechas y links. No el estado ni la liberación. */
export function editarTrabajo(id: number, datos: EdicionTrabajo) {
  return pedir<TrabajoResumen>(`/api/mastering/${id}`, { metodo: 'PUT', cuerpo: datos })
}

/** Solo avanza. Un retroceso vuelve como 409 con el texto del trigger. */
export function cambiarEstadoDelTrabajo(id: number, estado: EstadoTrabajo) {
  return pedir<TrabajoResumen>(`/api/mastering/${id}/estado?estado=${estado}`, {
    metodo: 'PATCH',
  })
}

/**
 * Suma una revisión.
 *
 * De a una y no editando el número: el dato contesta *"¿este trabajo se pasó de
 * lo que se vendió?"*, y un campo escrito a mano no distingue "se hicieron
 * cuatro" de "alguien puso cuatro". **Puede pasarse de las incluidas** — la
 * alerta es de la pantalla, la base no lo impide desde `V15`.
 */
export function registrarRevision(id: number) {
  return pedir<TrabajoResumen>(`/api/mastering/${id}/revision`, { metodo: 'POST' })
}

/**
 * Libera el premaster. **Es la regla del módulo.**
 *
 * Sin `motivo` y sin pago registrado, el backend rechaza con 409 y su explicación
 * — que es la que la pantalla muestra. Con `motivo`, libera igual y queda firmado
 * quién lo hizo y por qué. Esa salida existe porque un bloqueo sin salida se
 * esquiva por afuera del sistema.
 */
export function liberarPremaster(id: number, motivo?: string) {
  return pedir<TrabajoResumen>(`/api/mastering/${id}/premaster`, {
    metodo: 'PATCH',
    cuerpo: { motivo },
  })
}

/** Cobra sin pasar por `/admin/pagos`, que hoy solo salda inscripciones. */
export function cobrarTrabajo(id: number, datos: CobroTrabajo) {
  return pedir<TrabajoResumen>(`/api/mastering/${id}/cobro`, { metodo: 'POST', cuerpo: datos })
}

// == El cliente =============================================================

/**
 * Mis trabajos, como cliente.
 *
 * **Solo lectura, y es una decisión**: el canal para pedir un trabajo es
 * WhatsApp, y la mayoría de los clientes de M&M no tienen cuenta en el sistema.
 * Lo que esta pantalla sí hace es **entregar el premaster** cuando está liberado.
 */
export function misTrabajos() {
  return pedir<TrabajoDelPortal[]>('/api/me/mastering')
}
