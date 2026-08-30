import { abrirEnPestania, pedir } from './cliente'
import type { UsuarioActual } from './tipos'
import type { EstadoDeCuenta } from './tiposAdmin'
import type { MaterialResumen } from './tiposDocencia'
import type {
  AltaSolicitud,
  Aprobacion,
  AprobacionRealizada,
  CatalogoParaPedir,
  EdicionPerfil,
  FranjaOcupada,
  NotificacionResumen,
  ProgresoDelCurso,
  ReservaDelPortal,
  SolicitudResumen,
} from './tiposPortal'
import type { EstadoReprogramacion, EstadoSolicitud, ReprogramacionResumen } from './tiposPortal'
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

/**
 * Mis materiales de clase, COMO ALUMNO — lo que me dieron.
 *
 * Llena el bloque que `MisCursosPagina` dibuja hoy como "todavía no disponible".
 * Trae lo mío y lo grupal, y **solo lo que el profesor publicó**: esa condición
 * vive en la consulta del backend, así que no hay forma de pedir esto sin ella.
 *
 * Lo que YO subo, si además doy clases, está en `docencia.ts` — el tramo
 * `/profesor` de la ruta dice desde qué relación se mira.
 */
export function misMateriales(): Promise<MaterialResumen[]> {
  return pedir('/api/me/materiales')
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

/**
 * Abre un comprobante **mío**.
 *
 * Es la pantalla que el Módulo 4 dejó anotada como pendiente: *"la descarga de
 * comprobantes necesita el `StorageService` de §2.4"*. Existe desde el Módulo 7 y
 * el respaldo es un archivo de verdad desde `V21`.
 *
 * **Otra ruta que la de administración, no la misma con menos permiso.** Acá el id
 * del dueño no viaja: sale del token, y uno ajeno contesta "no existe".
 */
export async function abrirMiComprobante(idComprobante: number): Promise<void> {
  await abrirEnPestania(`/api/me/comprobantes/${idComprobante}`, 'No se pudo abrir el comprobante.')
}

/** Aprobar crea la reserva con su seña. Sin seña no hay reserva (`V10`). */
export function aprobarSolicitud(
  idSolicitud: number,
  aprobacion: Aprobacion,
): Promise<AprobacionRealizada> {
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


// == Mover una clase ========================================================
//
// Las dos mitades juntas otra vez: lo que se pide desde Mis reservas o desde Mi
// agenda, y lo que administración resuelve en su bandeja.

/**
 * Lo que pedí mover, en todos los estados.
 *
 * **No tiene pantalla propia a propósito**: la pantalla es Mis reservas, que
 * cruza esta lista por `idReserva`. Un pedido de mover algo se entiende al lado
 * de la cosa que se quiere mover.
 */
export function misReprogramaciones(): Promise<ReprogramacionResumen[]> {
  return pedir('/api/me/reprogramaciones')
}

/**
 * "No puedo ese día".
 *
 * **Esto no mueve la clase**: la mueve administración al aprobar, eligiendo el
 * horario nuevo — que es lo que quien pide no puede saber. `fechaAlternativa` es
 * una preferencia y es opcional.
 */
export function pedirMoverLaClase(pedido: {
  idReserva: number
  motivo: string
  fechaAlternativa?: string
}): Promise<ReprogramacionResumen> {
  return pedir('/api/me/reprogramaciones', { metodo: 'POST', cuerpo: pedido })
}

export function listarReprogramaciones(
  estado: EstadoReprogramacion | '',
  pagina = 0,
  tamanio = 20,
): Promise<Pagina<ReprogramacionResumen>> {
  const parametros = new URLSearchParams({ pagina: String(pagina), tamanio: String(tamanio) })
  if (estado) parametros.set('estado', estado)
  return pedir(`/api/reprogramaciones?${parametros}`)
}

/**
 * Aprobar **es mover**: el cuerpo lleva la franja nueva, no un "sí".
 *
 * El backend rechaza aprobar dejando el mismo horario — un pedido resuelto sin
 * movimiento no avisa a nadie y deja a la persona esperando.
 */
export function aprobarReprogramacion(
  idSolicitud: number,
  nuevaFranja: {
    idSala: number
    fecha: string
    horaInicio: string
    horaFin: string
    respuesta?: string
  },
): Promise<ReprogramacionResumen> {
  return pedir(`/api/reprogramaciones/${idSolicitud}/aprobacion`, {
    metodo: 'PATCH',
    cuerpo: nuevaFranja,
  })
}

export function rechazarReprogramacion(
  idSolicitud: number,
  respuesta: string,
): Promise<ReprogramacionResumen> {
  return pedir(`/api/reprogramaciones/${idSolicitud}/rechazo`, {
    metodo: 'PATCH',
    cuerpo: { respuesta },
  })
}
