import type { Rol } from './tipos'

/** Página de resultados. Coincide con el record `Pagina` del backend. */
export type Pagina<T> = {
  contenido: T[]
  pagina: number
  tamanio: number
  totalElementos: number
  totalPaginas: number
}

export type UsuarioResumen = {
  id: number
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  rol: Rol
  activo: boolean
  debeCambiarPassword: boolean
}

/**
 * Respuesta del alta hecha por administración.
 *
 * `passwordTemporal` es la única vez que esa contraseña existe en texto plano
 * en todo el sistema. No se puede volver a consultar: si se pierde, hay que
 * generar otra.
 */
export type UsuarioCreado = {
  usuario: UsuarioResumen
  passwordTemporal: string
}

export type NivelIngreso = 'INICIAL' | 'INTERMEDIO' | 'AVANZADO'
export type EstadoAlumno = 'ACTIVO' | 'INACTIVO' | 'SUSPENDIDO'

export type AlumnoResumen = {
  idAlumno: number
  idUsuario: number
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  nivelIngreso: NivelIngreso | null
  estadoAlumno: EstadoAlumno
  fechaIngreso: string
  instagram: string | null
  usuarioActivo: boolean
  /**
   * Lo que está cursando hoy — vacía si no cursa nada.
   *
   * Es una lista y no un campo porque alguien puede estar haciendo DJ y
   * producción a la vez, que es la razón por la que `alumno.disciplina` no
   * existe en el esquema. Trae solo las inscripciones vigentes (`ACTIVA` o
   * `PAUSADA`): quien terminó DJ el año pasado no figura como alumno de DJ.
   */
  disciplinas: Disciplina[]
}

export type AltaAlumnoResultado = {
  alumno: AlumnoResumen
  /** Solo viene cuando el alta creó una cuenta nueva. */
  passwordTemporal: string | null
}

// -- Salas y calendario -----------------------------------------------------

export type EstadoReserva =
  | 'CONFIRMADA'
  | 'MODIFICADA'
  | 'CANCELADA'
  | 'REPROGRAMADA'
  | 'FINALIZADA'

export type EstadoAsistencia =
  | 'PENDIENTE'
  | 'PRESENTE'
  | 'AUSENTE'
  | 'AUSENTE_JUSTIFICADO'
  | 'CANCELADA'

/**
 * Horario del estudio: 10 a 18 (§13, P11).
 *
 * La grilla arranca con estas filas, pero **no se limita a ellas**: si hay una
 * reserva fuera de horario, la vista la incluye igual. Una reserva que existe y
 * no se dibuja es el peor error posible en un calendario — nadie lo reporta,
 * simplemente dos personas aparecen en la misma sala.
 */
export const HORA_APERTURA = 10
export const HORA_CIERRE = 18

export type SalaResumen = {
  idSala: number
  nombre: string
  descripcion: string | null
  activa: boolean
  orden: number
  /** La matriz de §2.6: qué se puede hacer en esta sala. */
  usosPermitidos: { idTipoUso: number; advertencia: string | null }[]
}

export type TipoUsoResumen = {
  idTipoUso: number
  codigo: string
  nombre: string
  esClase: boolean
  color: string | null
  activo: boolean
}

export type ParticipanteResumen = {
  idParticipacion: number
  idUsuario: number
  nombre: string
  apellido: string
  /** Presente = esta clase le descuenta una de su curso. */
  idInscripcion: number | null
  disciplina: Disciplina | null
  estadoAsistencia: EstadoAsistencia
  observaciones: string | null
}

export type ReservaResumen = {
  idReserva: number
  idSala: number
  sala: string
  idTipoUso: number
  tipoUso: string
  /** Sale de `tipo_uso`, no del front: el calendario no inventa colores. */
  color: string | null
  esClase: boolean
  idProfesor: number | null
  profesor: string | null
  fecha: string
  /** `HH:mm:ss` — así serializa un `LocalTime`. */
  horaInicio: string
  horaFin: string
  estado: EstadoReserva
  notas: string | null
  idReservaRecupera: number | null
  motivoReprogramacion: string | null
  participantes: ParticipanteResumen[]
}

// -- Profesores -------------------------------------------------------------

/**
 * Un profesor, para elegirlo al armar una inscripción. Espeja `ProfesorResumen`.
 *
 * El listado que lo trae **no pagina**: su tamaño lo decide la nómina del
 * estudio, no el negocio creciendo, y lo consume un `<select>`.
 */
export type ProfesorResumen = {
  idProfesor: number
  idUsuario: number
  nombre: string
  apellido: string
  /** Ya armado del servidor, para que no haya tres formas del mismo nombre. */
  nombreCompleto: string
  email: string
  especialidad: string | null
  activo: boolean
}

// -- Inscripciones ----------------------------------------------------------

export type Disciplina = 'DJ' | 'PRODUCCION' | 'MENTORIA'
export type Nivel = 'INICIAL' | 'INTERMEDIO' | 'AVANZADO'
export type Moneda = 'ARS' | 'USD'
export type EstadoInscripcion = 'ACTIVA' | 'COMPLETADA' | 'CANCELADA' | 'PAUSADA'

/**
 * Clases que trae cada curso de fábrica (§13, P34).
 *
 * Está acá **para mostrarlo en el formulario**, no para decidirlo: quien
 * completa el valor cuando no viene es el backend, así que un alta por la API
 * tiene la misma regla que una por pantalla. Si estas dos tablas se separan, la
 * que vale es la de Java.
 *
 * La mentoría se arma a medida y por eso no tiene número.
 */
export const CLASES_ESTANDAR: Record<Disciplina, number | null> = {
  DJ: 8,
  PRODUCCION: 16,
  MENTORIA: null,
}

const ORDEN_NIVEL: Record<Nivel, number> = { INICIAL: 1, INTERMEDIO: 2, AVANZADO: 3 }

/**
 * ¿Pasar de `anterior` a `nuevo` es bajar de nivel?
 *
 * Espeja `Nivel.esRetrocesoDesde` de Java y, detrás, el `CASE` del trigger
 * `verificar_baja_de_nivel_firmada` en `V9`. Acá sirve **solo para pedir el
 * motivo antes de enviar**: quien exige la firma es la base, y el backend
 * devuelve 400 igual si falta. Poner o sacar el nivel no es retroceder — es
 * completar una ficha.
 */
export function esBajaDeNivel(anterior: Nivel | null, nuevo: Nivel | ''): boolean {
  if (!anterior || !nuevo) return false
  return ORDEN_NIVEL[nuevo] < ORDEN_NIVEL[anterior]
}

/**
 * Una fila del listado de inscripciones. Espeja `InscripcionResumen`.
 *
 * `clasesRestantes` no es una columna de la base: es la resta contra las clases
 * efectivamente dictadas, calculada en cada lectura. Es el número que el
 * relevamiento marca como faltante hoy.
 */
export type InscripcionResumen = {
  idInscripcion: number
  idAlumno: number
  idUsuario: number
  nombre: string
  apellido: string
  email: string
  idProfesor: number | null
  /** Nombre y apellido ya armados, o `null` si todavía no se asignó profe. */
  profesor: string | null
  disciplina: Disciplina
  nivel: Nivel | null
  clasesContratadas: number
  clasesConsumidas: number
  clasesRestantes: number
  precioTotal: number
  moneda: Moneda
  cotizacionDolar: number | null
  fechaInicio: string | null
  estado: EstadoInscripcion
  notas: string | null
}
