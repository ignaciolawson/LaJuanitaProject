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

/**
 * Los cuerpos que se MANDAN a `/api/auth` y a `/api/me/password`.
 *
 * Van tipados por el mismo motivo que los de administración (ver la nota en
 * `administracion.ts`): un pedido mal formado **no explota en ninguna capa**.
 * Jackson descarta en silencio los campos que no conoce, así que un nombre mal
 * escrito viaja, el backend lo ignora y el dato queda sin cargar, sin error
 * arriba ni abajo. Una respuesta mal tipada, en cambio, se ve enseguida.
 *
 * Cada uno espeja un record de `…backend.auth` (y `RegistroRequest`, de
 * `…backend.usuario.dto`). Si allá cambia un campo, cambia acá.
 */

/** Espeja `LoginRequest`. */
export type LoginRequest = {
  email: string
  password: string
}

/**
 * Espeja `RegistroRequest`. Fijate lo que NO tiene: `rol`. El endpoint es
 * público y el rol se fuerza a `USUARIO` del lado del servidor — mandarlo desde
 * acá no haría nada, y tenerlo en el tipo sugeriría lo contrario.
 */
export type RegistroRequest = {
  nombre: string
  apellido: string
  email: string
  telefono: string
  password: string
}

/**
 * Espeja `CambioPasswordRequest`. Pide la contraseña actual aunque la sesión ya
 * esté abierta: una sesión olvidada en la computadora del estudio no debería
 * alcanzar para quedarse con la cuenta.
 */
export type CambioPasswordRequest = {
  passwordActual: string
  passwordNueva: string
}
