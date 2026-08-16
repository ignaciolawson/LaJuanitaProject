import { pedir } from './cliente'
import type { CambioPasswordRequest, Rol } from './tipos'
import type {
  AltaAlumnoResultado,
  AlumnoResumen,
  Disciplina,
  EstadoAlumno,
  EstadoInscripcion,
  InscripcionResumen,
  Moneda,
  Nivel,
  NivelIngreso,
  Pagina,
  ProfesorResumen,
  UsuarioCreado,
  UsuarioResumen,
} from './tiposAdmin'

/** Los pedidos de las pantallas de administración, en un solo lugar. */

/**
 * Los cuerpos que se MANDAN, tipados igual que los que se reciben.
 *
 * Antes solo estaban tipadas las respuestas y estos iban como objetos sueltos
 * declarados dentro de cada función. Es la mitad del contrato que el compilador
 * no estaba mirando: agregarle un campo obligatorio a un DTO del backend no
 * rompía nada acá, y el error aparecía en tiempo de ejecución como un 400.
 *
 * Cada uno espeja un record de `…backend.usuario.dto` / `…backend.alumno.dto`.
 * Si allá cambia un campo, cambia acá.
 */

/** Espeja `AltaUsuarioRequest`. `rol` solo lo aplica un ADMIN; para el resto se ignora. */
export type AltaUsuario = {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  rol?: Rol
}

/** Espeja `EdicionUsuarioRequest`. Sin contraseña: nadie cambia la de otro. */
export type EdicionUsuario = {
  nombre: string
  apellido: string
  email: string
  telefono?: string
  rol?: Rol
}

/** Espeja `AltaAlumnoRequest`: o `idUsuario`, o `usuarioNuevo`. Nunca los dos. */
export type AltaAlumno = {
  idUsuario?: number
  usuarioNuevo?: { nombre: string; apellido: string; email: string; telefono?: string }
  nivelIngreso?: NivelIngreso | ''
  instagram?: string
}

/** Espeja `EdicionAlumnoRequest`. No toca nombre ni contacto: eso es del `usuario`. */
export type EdicionAlumno = {
  nivelIngreso?: NivelIngreso | ''
  instagram?: string
}

/**
 * Espeja `AltaInscripcionRequest`.
 *
 * `clasesContratadas` es opcional a propósito: sin él, el backend pone las
 * clases de fábrica de la disciplina. La mentoría no tiene, así que ahí es
 * obligatorio — y el 400 que vuelve lo dice.
 */
export type AltaInscripcion = {
  idAlumno: number
  idProfesor?: number | null
  disciplina: Disciplina
  nivel?: Nivel | ''
  clasesContratadas?: number
  precioTotal: number
  moneda?: Moneda
  cotizacionDolar?: number | null
  fechaInicio?: string
  notas?: string
}

/**
 * Espeja `EdicionInscripcionRequest`.
 *
 * Sin `idAlumno` ni `disciplina`: cambiar cualquiera de los dos no es corregir
 * esta inscripción, es otra. Se cancela y se crea la que corresponde.
 *
 * `motivoBajaNivel` solo hace falta cuando el nivel **baja**, y no lleva autor
 * ni fecha: los pone el servidor con el usuario del token. Una firma que el
 * cliente pudiera dictar no firma nada.
 */
export type EdicionInscripcion = {
  idProfesor?: number | null
  nivel?: Nivel | ''
  clasesContratadas: number
  precioTotal: number
  moneda: Moneda
  cotizacionDolar?: number | null
  fechaInicio?: string
  notas?: string
  motivoBajaNivel?: string
}

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

export function altaUsuario(datos: AltaUsuario) {
  return pedir<UsuarioCreado>('/api/usuarios', { metodo: 'POST', cuerpo: datos })
}

export function editarUsuario(id: number, datos: EdicionUsuario) {
  return pedir<UsuarioResumen>(`/api/usuarios/${id}`, { metodo: 'PUT', cuerpo: datos })
}

/**
 * Contraseña temporal nueva para quien perdió la suya.
 *
 * No hay mail, así que este es el único camino de vuelta: la respuesta trae la
 * contraseña **una sola vez** y hay que pasarla por WhatsApp, igual que en el
 * alta.
 */
export function resetearPasswordUsuario(id: number) {
  return pedir<UsuarioCreado>(`/api/usuarios/${id}/password-temporal`, { metodo: 'POST' })
}

export function cambiarActivoUsuario(id: number, activo: boolean) {
  return pedir<UsuarioResumen>(`/api/usuarios/${id}/activo?activo=${activo}`, { metodo: 'PATCH' })
}

// -- Alumnos ----------------------------------------------------------------

/**
 * El listado de alumnos.
 *
 * `disciplina` y `nivel` miran las inscripciones **vigentes**: quien cursa DJ y
 * mentoría aparece en las dos listas, y quien terminó DJ el año pasado no
 * aparece en ninguna. Combinados exigen una *misma* inscripción que cumpla los
 * dos — "DJ avanzado" no trae a quien hace DJ inicial y producción avanzada.
 */
export function listarAlumnos(opciones: {
  buscar?: string
  estado?: EstadoAlumno | ''
  disciplina?: Disciplina | ''
  nivel?: Nivel | ''
  pagina?: number
}) {
  return pedir<Pagina<AlumnoResumen>>(
    `/api/alumnos${query({
      buscar: opciones.buscar,
      estado: opciones.estado,
      disciplina: opciones.disciplina,
      nivel: opciones.nivel,
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
/** Un alumno solo, para su perfil. */
export function obtenerAlumno(id: number) {
  return pedir<AlumnoResumen>(`/api/alumnos/${id}`)
}

export function altaAlumno(datos: AltaAlumno) {
  return pedir<AltaAlumnoResultado>('/api/alumnos', { metodo: 'POST', cuerpo: datos })
}

export function editarAlumno(id: number, datos: EdicionAlumno) {
  return pedir<AlumnoResumen>(`/api/alumnos/${id}`, { metodo: 'PUT', cuerpo: datos })
}

export function cambiarEstadoAlumno(id: number, estado: EstadoAlumno) {
  return pedir<AlumnoResumen>(`/api/alumnos/${id}/estado?estado=${estado}`, { metodo: 'PATCH' })
}

// -- Profesores -------------------------------------------------------------

/**
 * Los profesores, para asignarlos a una inscripción.
 *
 * Devuelve **solo los activos** salvo que se pidan todos: ofrecer a alguien que
 * ya no da clases en el selector de una inscripción nueva es un error de carga
 * que conviene no ofrecer. `incluirInactivos` es para las pantallas que muestran
 * inscripciones viejas y necesitan nombrar a quien las dio.
 */
export function listarProfesores(incluirInactivos = false) {
  return pedir<ProfesorResumen[]>(`/api/profesores${incluirInactivos ? '?incluirInactivos=true' : ''}`)
}

// -- Inscripciones ----------------------------------------------------------

/**
 * El listado, con los cuatro filtros del módulo.
 *
 * `idProfesor` filtra la agenda de un profe **para administración**. El portal
 * del profesor —donde cada uno ve la suya— llega con el Módulo 2, y va a salir
 * de este mismo dato.
 */
export function listarInscripciones(opciones: {
  buscar?: string
  idAlumno?: number
  idProfesor?: number
  disciplina?: Disciplina | ''
  estado?: EstadoInscripcion | ''
  pagina?: number
}) {
  return pedir<Pagina<InscripcionResumen>>(
    `/api/inscripciones${query({
      buscar: opciones.buscar,
      idAlumno: opciones.idAlumno,
      idProfesor: opciones.idProfesor,
      disciplina: opciones.disciplina,
      estado: opciones.estado,
      pagina: opciones.pagina,
    })}`,
  )
}

export function altaInscripcion(datos: AltaInscripcion) {
  return pedir<InscripcionResumen>('/api/inscripciones', { metodo: 'POST', cuerpo: datos })
}

export function editarInscripcion(id: number, datos: EdicionInscripcion) {
  return pedir<InscripcionResumen>(`/api/inscripciones/${id}`, { metodo: 'PUT', cuerpo: datos })
}

/** Completar, pausar o cancelar. Nunca borra: el historial se conserva. */
export function cambiarEstadoInscripcion(id: number, estado: EstadoInscripcion) {
  return pedir<InscripcionResumen>(`/api/inscripciones/${id}/estado?estado=${estado}`, {
    metodo: 'PATCH',
  })
}

// -- Propio -----------------------------------------------------------------

export function cambiarMiPassword(passwordActual: string, passwordNueva: string) {
  return pedir<void>('/api/me/password', {
    metodo: 'POST',
    cuerpo: { passwordActual, passwordNueva } satisfies CambioPasswordRequest,
  })
}
