import { pedir } from './cliente'
import type { UsuarioActual } from './tipos'
import type { EstadoDeCuenta } from './tiposAdmin'
import type {
  AltaSolicitud,
  Aprobacion,
  CatalogoParaPedir,
  EdicionPerfil,
  FranjaOcupada,
  NotificacionResumen,
  ProgresoDelCurso,
  ReservaDelPortal,
  SolicitudResumen,
} from './tiposPortal'
import type { EstadoSolicitud } from './tiposPortal'
import type { Pagina } from './tiposAdmin'

/**
 * Los pedidos del portal: todo lo que una persona ve y hace sobre lo suyo.
 *
 * **Ninguna de estas funciones toma un id de persona**, y no es una casualidad
 * que se pueda comprobar de un vistazo: el backend saca la identidad del token,
 * así que un parámetro acá no cambiaría nada del lado del servidor pero sí haría
 * creer que se puede pedir lo de otro. La única excepción, al final, son las dos
 * de administración que resuelven un pedido — ésas sí llevan el id de la
 * solicitud, que es un objeto y no una persona.
 */

// == Lo que tengo ===========================================================

export function misReservas(desde: string, hasta: string): Promise<ReservaDelPortal[]> {
  return pedir(`/api/me/reservas?desde=${desde}&hasta=${hasta}`)
}

export function misCursos(): Promise<ProgresoDelCurso[]> {
  return pedir('/api/me/cursos')
}

export function miEstadoDeCuenta(): Promise<EstadoDeCuenta> {
  return pedir('/api/me/estado-de-cuenta')
}

// == Pedir una sala =========================================================

export function catalogoParaPedir(): Promise<CatalogoParaPedir> {
  return pedir('/api/me/catalogo')
}

export function disponibilidad(
  idSala: number,
  desde: string,
  hasta: string,
): Promise<FranjaOcupada[]> {
  return pedir(`/api/me/disponibilidad?idSala=${idSala}&desde=${desde}&hasta=${hasta}`)
}

export function misSolicitudes(): Promise<SolicitudResumen[]> {
  return pedir('/api/me/solicitudes')
}

export function pedirSala(solicitud: AltaSolicitud): Promise<SolicitudResumen> {
  return pedir('/api/me/solicitudes', { metodo: 'POST', cuerpo: solicitud })
}

export function cancelarSolicitud(idSolicitud: number): Promise<SolicitudResumen> {
  return pedir(`/api/me/solicitudes/${idSolicitud}/cancelacion`, { metodo: 'PATCH' })
}

// == Mis notificaciones =====================================================

export function misNotificaciones(soloNoLeidas = false): Promise<NotificacionResumen[]> {
  return pedir(`/api/me/notificaciones?soloNoLeidas=${soloNoLeidas}`)
}

export function notificacionesSinLeer(): Promise<number> {
  return pedir('/api/me/notificaciones/sin-leer')
}

export function marcarLeida(idNotificacion: number): Promise<NotificacionResumen> {
  return pedir(`/api/me/notificaciones/${idNotificacion}/lectura`, { metodo: 'PATCH' })
}

export function marcarTodasLeidas(): Promise<number> {
  return pedir('/api/me/notificaciones/lectura', { metodo: 'PATCH' })
}

// == Mi perfil ==============================================================

/** Devuelve el `UsuarioActual` completo: con eso el front refresca el encabezado. */
export function editarPerfil(datos: EdicionPerfil): Promise<UsuarioActual> {
  return pedir('/api/me/perfil', { metodo: 'PUT', cuerpo: datos })
}

// == La bandeja de administración ===========================================
//
// Están acá y no en `administracion.ts` porque son el otro lado del mismo hecho:
// lo que el portal pide es lo que esta bandeja resuelve, y leer las dos mitades
// juntas es lo que deja ver que el circuito cierra. Los permisos los pone el
// backend (@PuedeLeerAdministracion para mirar, @PuedeOperar para resolver).

export function listarSolicitudes(
  estado: EstadoSolicitud | '',
  pagina = 0,
  tamanio = 20,
): Promise<Pagina<SolicitudResumen>> {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamanio: String(tamanio) })
  if (estado) parametros.set('estado', estado)
  return pedir(`/api/solicitudes-reserva?${parametros}`)
}

/** Aprobar crea la reserva con su seña. Sin seña no hay reserva (`V10`). */
export function aprobarSolicitud(
  idSolicitud: number,
  aprobacion: Aprobacion,
): Promise<SolicitudResumen> {
  return pedir(`/api/solicitudes-reserva/${idSolicitud}/aprobacion`, {
    metodo: 'PATCH',
    cuerpo: aprobacion,
  })
}

export function rechazarSolicitud(
  idSolicitud: number,
  respuesta: string,
): Promise<SolicitudResumen> {
  return pedir(`/api/solicitudes-reserva/${idSolicitud}/rechazo`, {
    metodo: 'PATCH',
    cuerpo: { respuesta },
  })
}
