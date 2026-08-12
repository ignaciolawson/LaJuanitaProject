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
  nombreCompleto: string
  email: string
  rol: Rol
  fotoPerfil: string | null
  esAlumno: boolean
  esProfesor: boolean
}

export type LoginResponse = {
  token: string
  /** ISO-8601. Cuándo deja de valer la credencial. */
  expiraEn: string
  usuario: UsuarioActual
}
