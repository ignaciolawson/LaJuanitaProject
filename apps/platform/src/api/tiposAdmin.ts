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
}

export type AltaAlumnoResultado = {
  alumno: AlumnoResumen
  /** Solo viene cuando el alta creó una cuenta nueva. */
  passwordTemporal: string | null
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
