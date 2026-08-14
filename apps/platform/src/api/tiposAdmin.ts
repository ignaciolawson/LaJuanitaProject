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
