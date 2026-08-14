import { pedir } from './cliente'
import type { Rol } from './tipos'
import type {
  AltaAlumnoResultado,
  AlumnoResumen,
  EstadoAlumno,
  NivelIngreso,
  Pagina,
  UsuarioCreado,
  UsuarioResumen,
} from './tiposAdmin'

/** Los pedidos de las pantallas de administración, en un solo lugar. */

function query(parametros: Record<string, string | number | undefined | null>): string {
  const partes = Object.entries(parametros)
    .filter(([, valor]) => valor !== undefined && valor !== null && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`)

  return partes.length > 0 ? `?${partes.join('&')}` : ''
}

// -- Usuarios ---------------------------------------------------------------

export function listarUsuarios(opciones: { buscar?: string; pagina?: number }) {
  return pedir<Pagina<UsuarioResumen>>(
    `/api/usuarios${query({ buscar: opciones.buscar, pagina: opciones.pagina })}`,
  )
}

export function altaUsuario(datos: {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  rol?: Rol
}) {
  return pedir<UsuarioCreado>('/api/usuarios', { metodo: 'POST', cuerpo: datos })
}

export function cambiarActivoUsuario(id: number, activo: boolean) {
  return pedir<UsuarioResumen>(`/api/usuarios/${id}/activo?activo=${activo}`, { metodo: 'PATCH' })
}

// -- Alumnos ----------------------------------------------------------------

export function listarAlumnos(opciones: {
  buscar?: string
  estado?: EstadoAlumno | ''
  pagina?: number
}) {
  return pedir<Pagina<AlumnoResumen>>(
    `/api/alumnos${query({
      buscar: opciones.buscar,
      estado: opciones.estado,
      pagina: opciones.pagina,
    })}`,
  )
}

/**
 * Alta de alumno. Los dos caminos posibles, en una sola llamada y una sola
 * transacción del lado del servidor:
 *
 * - `idUsuario`: la persona ya tiene cuenta (se registró sola).
 * - `usuarioNuevo`: hay que crearle la cuenta, y vuelve una contraseña temporal.
 */
export function altaAlumno(datos: {
  idUsuario?: number
  usuarioNuevo?: { nombre: string; apellido: string; email: string; telefono?: string }
  nivelIngreso?: NivelIngreso | ''
  instagram?: string
}) {
  return pedir<AltaAlumnoResultado>('/api/alumnos', { metodo: 'POST', cuerpo: datos })
}

export function cambiarEstadoAlumno(id: number, estado: EstadoAlumno) {
  return pedir<AlumnoResumen>(`/api/alumnos/${id}/estado?estado=${estado}`, { metodo: 'PATCH' })
}

// -- Propio -----------------------------------------------------------------

export function cambiarMiPassword(passwordActual: string, passwordNueva: string) {
  return pedir<void>('/api/me/password', {
    metodo: 'POST',
    cuerpo: { passwordActual, passwordNueva },
  })
}
