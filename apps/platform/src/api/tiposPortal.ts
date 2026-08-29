import type {
  Disciplina,
  EstadoAsistencia,
  EstadoReserva,
  EstadoInscripcion,
  MedioPago,
  Moneda,
  Nivel,
  SalaResumen,
  TipoUsoResumen,
} from './tiposAdmin'

/**
 * Contratos del Módulo 4 — el portal.
 *
 * Van aparte de `tiposAdmin.ts` por la misma razón por la que el backend tiene un
 * `PortalController` separado: lo que los agrupa no es el tema sino **el
 * alcance**. Todo lo de acá es de quien está mirando, y ninguna de estas rutas
 * recibe una identidad — sale del token.
 *
 * Espejan los records de `…backend.portal.dto`, `…backend.solicitud.dto` y
 * `…backend.notificacion.dto`. Si allá cambia un campo, se cambia acá.
 */

/**
 * Una reserva vista por su dueño.
 *
 * **No es `ReservaResumen` con menos campos**: no trae los otros participantes
 * ni las notas internas de administración. Si algún día hace falta un dato de
 * esa lista, se agrega del lado del backend y con intención — no alcanza con
 * pedirlo acá.
 */
export type ReservaDelPortal = {
  idReserva: number
  sala: string
  tipoUso: string
  color: string | null
  esClase: boolean
  profesor: string | null
  fecha: string
  horaInicio: string
  horaFin: string
  estado: EstadoReserva
  /** Null cuando la reserva es mía por haberla pagado y no por estar anotado. */
  miAsistencia: EstadoAsistencia | null
}

/** "Mi progreso": nivel, clases tomadas y clases restantes. Sin plata ni notas. */
export type ProgresoDelCurso = {
  idInscripcion: number
  disciplina: Disciplina
  nivel: Nivel | null
  profesor: string | null
  clasesContratadas: number
  clasesConsumidas: number
  clasesRestantes: number
  fechaInicio: string | null
  estado: EstadoInscripcion
}

/** Un rato en que una sala no está libre. Sin decir de quién es. */
export type FranjaOcupada = {
  fecha: string
  horaInicio: string
  horaFin: string
  motivo: 'RESERVADA' | 'BLOQUEADA'
}

/** Con qué se arma el formulario de pedido: `usos` ya viene filtrado a lo solicitable. */
export type CatalogoParaPedir = {
  salas: SalaResumen[]
  usos: TipoUsoResumen[]
}

export type EstadoSolicitud = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA' | 'CANCELADA'

export const NOMBRE_DE_ESTADO_SOLICITUD: Record<EstadoSolicitud, string> = {
  PENDIENTE: 'Esperando respuesta',
  APROBADA: 'Confirmada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
}

/**
 * Un pedido de sala. **Es el mismo tipo para las dos pantallas** que lo miran —
 * la bandeja de administración y "Mis pedidos"— porque lo que el que pidió puede
 * ver de su solicitud es exactamente lo que ve administración.
 */
export type SolicitudResumen = {
  idSolicitud: number
  idUsuario: number
  nombre: string
  apellido: string
  email: string
  idSala: number
  sala: string
  idTipoUso: number
  tipoUso: string
  fecha: string
  horaInicio: string
  horaFin: string
  comentario: string | null
  estado: EstadoSolicitud
  respuesta: string | null
  resueltaPor: string | null
  /** La reserva que nació del pedido. Solo si está aprobada. */
  idReserva: number | null
  fechaResolucion: string | null
  fechaCreacion: string
}

/** Espeja `AltaSolicitudRequest`. Sin `idUsuario`: quien pide sale del token. */
export type AltaSolicitud = {
  idSala: number
  idTipoUso: number
  fecha: string
  horaInicio: string
  horaFin: string
  comentario?: string
}

/**
 * Espeja `AprobacionRequest`. **Sin `idUsuario`**: quien paga la seña es quien
 * pidió, y eso lo decide el servidor — aceptarlo acá sería poder acreditar la
 * seña de uno contra la cuenta de otro.
 */
export type Aprobacion = {
  monto: number
  moneda: Moneda
  cotizacionDolar?: number
  medioPago: MedioPago
  /**
   * El comprobante de la seña. Opcional — en efectivo no hay ninguno.
   *
   * Faltaba, y era el hallazgo #5 de `docs/mejoras.md`: **este es el circuito
   * donde más se necesita.** El usuario pidió por el portal, transfirió, y quien
   * aprueba está mirando esa transferencia — pero no tenía dónde anotarla, así
   * que el respaldo se perdía en el momento mismo en que existía.
   */
  comprobantePath?: string
  respuesta?: string
}

/**
 * Espeja el enum `TipoNotificacion` de Java.
 *
 * **La division que importa es quien las escribe.** Las tres primeras las escribe
 * una PERSONA al resolver algo —aprobar un pedido, mover una clase— y ocurren una
 * vez porque la accion ocurrio una vez. Las dos ultimas las escribe el disparador
 * automatico (`com.lajuanita.backend.aviso`), que corre solo todos los dias y
 * puede mirar el mismo hecho muchas veces: por eso llevan `clave_evento` y la
 * base es la que impide que se dupliquen (`V17`).
 *
 * `RESERVA_MOVIDA` faltaba en esta lista desde el Modulo 5 y no rompia nada,
 * porque la pantalla no decide nada por el tipo: muestra titulo y contenido. Vale
 * mantenerla completa igual —el dia que alguien filtre o pinte por tipo, el que
 * falta desaparece de la pantalla sin ningun error a la vista.
 */
export type TipoNotificacion =
  | 'SOLICITUD_APROBADA'
  | 'SOLICITUD_RECHAZADA'
  | 'RESERVA_MOVIDA'
  | 'REPROGRAMACION_RECHAZADA'
  | 'DEUDA_VENCIDA'
  | 'ENTREGA_IMPAGA'

export type NotificacionResumen = {
  idNotificacion: number
  tipo: TipoNotificacion
  titulo: string | null
  contenido: string
  urlDestino: string | null
  leida: boolean
  fechaCreacion: string
}

/** Espeja `EdicionPerfilRequest`. Sin email ni rol: ver ese record. */
export type EdicionPerfil = {
  nombre: string
  apellido: string
  telefono?: string
}


// -- Pedir que muevan una clase (Fase 2.4) ----------------------------------

/**
 * Espeja `EstadoReprogramacion`. **Son tres y no cuatro**: esta tabla no acepta
 * CANCELADA desde `V1`, así que el que se arrepiente avisa y administración
 * rechaza el pedido. Agregarla es una migración y el alcance nunca la pidió.
 */
export type EstadoReprogramacion = 'PENDIENTE' | 'APROBADA' | 'RECHAZADA'

export const NOMBRE_DE_ESTADO_REPROGRAMACION: Record<EstadoReprogramacion, string> = {
  PENDIENTE: 'Esperando respuesta',
  APROBADA: 'Movida',
  RECHAZADA: 'No se pudo mover',
}

/**
 * Un pedido de mover una clase. Espeja `ReprogramacionResumen`.
 *
 * ⚠️ **`fecha` y las horas son las que la clase tiene AHORA**, no las que tenía
 * cuando se pidió: aprobar mueve la misma fila. En un pedido ya aprobado, ese
 * campo muestra el horario nuevo. De dónde a dónde se movió lo cuenta la
 * notificación, que es donde alguien se hace esa pregunta.
 */
export type ReprogramacionResumen = {
  idSolicitud: number
  idUsuario: number
  nombre: string
  apellido: string
  idReserva: number
  sala: string
  tipoUso: string
  fecha: string
  horaInicio: string
  horaFin: string
  motivo: string
  /** El día que propuso, si propuso alguno. */
  fechaAlternativaSolicitada: string | null
  estado: EstadoReprogramacion
  respuesta: string | null
  resueltaPor: string | null
  fechaSolicitud: string
  fechaResolucion: string | null
}
