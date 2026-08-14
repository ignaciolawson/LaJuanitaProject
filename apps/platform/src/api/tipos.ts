/**
 * Contratos con el backend. Tienen que coincidir con los records de
 * `apps/backend/.../auth`: si allá cambia un campo, se cambia acá.
 */

/**
 * Eje de PERMISOS. Es independiente de las relaciones de negocio
 * (`esAlumno` / `esProfesor`), que son otra cosa: ver `UsuarioActual`.
 *
 * Coincide con el enum `Rol` de Java y con el CHECK `usuario_rol_valido`
 * de la base. Son cuatro, no tres.
 */
export type Rol = 'ADMIN' | 'DIRECTIVO' | 'STAFF' | 'USUARIO'

/**
 * Respuesta de `GET /api/me`. Con esto y nada más se arma el menú.
 *
 * Los dos ejes van separados a propósito: `rol` dice qué podés administrar,
 * `esAlumno` / `esProfesor` dicen qué sos para el negocio. Ghezz llega acá
 * como `rol: 'STAFF'` con `esProfesor: true`, y las dos cosas valen a la vez.
 */
export type UsuarioActual = {
  id: number
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  rol: Rol
  fotoPerfil: string | null
  esAlumno: boolean
  esProfesor: boolean
  /**
   * La contraseña la generó administración y esta persona todavía no eligió la
   * suya. Mientras sea `true` hay que exigirle el cambio antes de dejarla usar
   * el resto del sistema.
   */
  debeCambiarPassword: boolean
}

/** "Pérez, Juan" — como se lista en las pantallas de administración. */
export function nombreParaListado(u: Pick<UsuarioActual, 'nombre' | 'apellido'>): string {
  return `${u.apellido}, ${u.nombre}`
}

/** "Juan Pérez" — como se le habla a la persona. */
export function nombreCompleto(u: Pick<UsuarioActual, 'nombre' | 'apellido'>): string {
  return `${u.nombre} ${u.apellido}`
}

export type LoginResponse = {
  token: string
  /** ISO-8601. Cuándo deja de valer la credencial. */
  expiraEn: string
  usuario: UsuarioActual
}
