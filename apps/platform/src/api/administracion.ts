import { pedir } from './cliente'
import type { CambioPasswordRequest, Rol } from './tipos'
import type {
  AltaAlumnoResultado,
  AlumnoResumen,
  BloqueoResumen,
  CajaDelPeriodo,
  Deudor,
  EgresoResumen,
  EstadoDeCuenta,
  EstadoPago,
  MedioPago,
  PagoResumen,
  Disciplina,
  EstadoAlumno,
  EstadoInscripcion,
  InscripcionResumen,
  Moneda,
  EstadoAsistencia,
  EstadoReserva,
  Nivel,
  NivelIngreso,
  Pagina,
  ParticipanteResumen,
  ProfesorResumen,
  ReservaResumen,
  SalaResumen,
  TipoUsoResumen,
  UsoDeSala,
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

// -- Salas y calendario -----------------------------------------------------

/** Las columnas posibles del calendario, con qué se puede hacer en cada una. */
export function listarSalas(incluirInactivas = false) {
  return pedir<SalaResumen[]>(`/api/salas${incluirInactivas ? '?incluirInactivas=true' : ''}`)
}

/** Los tipos de uso, que son también los colores de la grilla. */
export function listarTiposUso() {
  return pedir<TipoUsoResumen[]>('/api/tipos-uso')
}

/**
 * La agenda de un rango de fechas.
 *
 * **No pagina, y no debe hacerlo:** media semana no es media respuesta, es una
 * respuesta equivocada. Lo que la acota es el rango — el backend rechaza más de
 * 62 días.
 */
export function agenda(opciones: {
  desde: string
  hasta: string
  idSala?: number
  idProfesor?: number
  incluirCanceladas?: boolean
}) {
  return pedir<ReservaResumen[]>(
    `/api/reservas${query({
      desde: opciones.desde,
      hasta: opciones.hasta,
      idSala: opciones.idSala,
      idProfesor: opciones.idProfesor,
      incluirCanceladas: opciones.incluirCanceladas ? 'true' : undefined,
    })}`,
  )
}

/** Espeja `AltaReservaRequest`. */
export type AltaReserva = {
  idSala: number
  idTipoUso: number
  idProfesor?: number | null
  fecha: string
  horaInicio: string
  horaFin: string
  notas?: string
  idReservaRecupera?: number
  motivoReprogramacion?: string
}

/** Espeja `EdicionReservaRequest`. Sin autor: lo pone el servidor con el token. */
export type EdicionReserva = {
  idSala: number
  idTipoUso: number
  idProfesor?: number | null
  fecha: string
  horaInicio: string
  horaFin: string
  notas?: string
}

export function altaReserva(datos: AltaReserva) {
  return pedir<ReservaResumen>('/api/reservas', { metodo: 'POST', cuerpo: datos })
}

export function editarReserva(id: number, datos: EdicionReserva) {
  return pedir<ReservaResumen>(`/api/reservas/${id}`, { metodo: 'PUT', cuerpo: datos })
}

/** Cancelar, finalizar o reactivar. Nunca borra: es historial de clases. */
export function cambiarEstadoReserva(id: number, estado: EstadoReserva) {
  return pedir<ReservaResumen>(`/api/reservas/${id}/estado?estado=${estado}`, { metodo: 'PATCH' })
}

/** Espeja `AltaParticipanteRequest`. */
export type AltaParticipante = {
  idUsuario: number
  /** Sin esto la clase **no descuenta** del curso. */
  idInscripcion?: number | null
  observaciones?: string
}

/**
 * Anotar a alguien en una clase.
 *
 * **`idInscripcion` es lo que hace que la clase se descuente del curso.** Va
 * vacío cuando la persona participa sin cursar —un alquiler de cabina—, y cuando
 * viene, la base exige que esa inscripción sea de esa misma persona: sin ese
 * control se podía anotar a Juan descontándole la clase a Ana.
 *
 * Acá también salta la regla de `V9` §5, "no consumir más clases que las
 * contratadas", con un mensaje que nombra la salida.
 */
export function agregarParticipante(idReserva: number, datos: AltaParticipante) {
  return pedir<ParticipanteResumen>(`/api/reservas/${idReserva}/participantes`, {
    metodo: 'POST',
    cuerpo: datos,
  })
}

/** Tomar lista. Queda firmado quién lo hizo, con el usuario del token. */
export function cambiarAsistencia(idParticipacion: number, estado: EstadoAsistencia) {
  return pedir<ParticipanteResumen>(
    `/api/reservas/participantes/${idParticipacion}?estado=${estado}`,
    { metodo: 'PATCH' },
  )
}

// -- Bloqueo de sala --------------------------------------------------------

/** Espeja `AltaBloqueoRequest`. Sin horas = el día entero. */
export type AltaBloqueo = {
  idSala: number
  fechaInicio: string
  fechaFin: string
  horaInicio?: string | null
  horaFin?: string | null
  motivo: string
}

/**
 * Las salas fuera de servicio.
 *
 * Sin `desde`, el backend arranca en hoy: un bloqueo vencido ya no rechaza nada
 * y mezclarlo con los vigentes convierte la pantalla en un archivo. El histórico
 * se pide bajando la fecha.
 */
export function listarBloqueos(opciones: { desde?: string; idSala?: number } = {}) {
  return pedir<BloqueoResumen[]>(
    `/api/bloqueos${query({ desde: opciones.desde, idSala: opciones.idSala })}`,
  )
}

export function altaBloqueo(datos: AltaBloqueo) {
  return pedir<BloqueoResumen>('/api/bloqueos', { metodo: 'POST', cuerpo: datos })
}

/** Desbloquear. Acá sí se borra: un bloqueo no es historial de nada. */
export function eliminarBloqueo(id: number) {
  return pedir<void>(`/api/bloqueos/${id}`, { metodo: 'DELETE' })
}

// -- Historial de uso -------------------------------------------------------

/**
 * Cuánto se usó cada sala en un período.
 *
 * Devuelve **las tres salas siempre**, aunque alguna no se haya usado: el cero
 * es justo el número que se viene a buscar. El techo del rango es un año — más
 * alto que el de la agenda, porque acá la respuesta no crece con el período.
 */
export function usoDeSalas(opciones: { desde: string; hasta: string; idSala?: number }) {
  return pedir<UsoDeSala[]>(
    `/api/reservas/uso${query({
      desde: opciones.desde,
      hasta: opciones.hasta,
      idSala: opciones.idSala,
    })}`,
  )
}

// -- Pagos -------------------------------------------------------------------

/** Espeja `AltaPagoRequest`. Exactamente uno de los cuatro destinos. */
export type AltaPago = {
  idUsuario: number
  idInscripcion?: number
  idReserva?: number
  idTrabajoMastering?: number
  idVentaEquipo?: number
  concepto?: string
  monto: number
  moneda: Moneda
  cotizacionDolar?: number | null
  medioPago: MedioPago
  descuentoPorcentaje?: number
  motivoDescuento?: string
  estadoPago?: EstadoPago
  fechaPago?: string
  comprobantePath?: string
}

export function listarPagos(opciones: {
  buscar?: string
  idUsuario?: number
  estado?: EstadoPago | ''
  moneda?: Moneda | ''
  desde?: string
  hasta?: string
  pagina?: number
}) {
  return pedir<Pagina<PagoResumen>>(`/api/pagos${query({ ...opciones })}`)
}

export function registrarPago(datos: AltaPago) {
  return pedir<PagoResumen>('/api/pagos', { metodo: 'POST', cuerpo: datos })
}

/**
 * Anular un pago mal cargado.
 *
 * **Es un PATCH y no un DELETE, y eso no es estilo REST:** en este esquema la
 * plata no se borra (`V6`). El autor y la fecha los pone el servidor con el
 * token y el reloj; de acá solo viaja el motivo.
 */
export function anularPago(id: number, motivo: string) {
  return pedir<PagoResumen>(`/api/pagos/${id}/anulacion`, { metodo: 'PATCH', cuerpo: { motivo } })
}

/** Marcar el comprobante como inválido. Tampoco se borra: se marca. */
export function invalidarComprobante(id: number, motivo: string) {
  return pedir<PagoResumen>(`/api/pagos/${id}/comprobante-invalido`, {
    metodo: 'PATCH',
    cuerpo: { motivo },
  })
}

export function estadoDeCuenta(idUsuario: number) {
  return pedir<EstadoDeCuenta>(`/api/pagos/estado-de-cuenta/${idUsuario}`)
}

/** La caja del período: **siempre las dos monedas**, aunque una esté en cero. */
export function caja(desde: string, hasta: string) {
  return pedir<CajaDelPeriodo[]>(`/api/pagos/caja${query({ desde, hasta })}`)
}

export function listarDeudores() {
  return pedir<Deudor[]>('/api/pagos/deudores')
}

// -- Egresos -----------------------------------------------------------------

/** Espeja `AltaEgresoRequest`. */
export type AltaEgreso = {
  monto: number
  moneda: Moneda
  cotizacionDolar?: number | null
  concepto: string
  destinatario?: string
  idUsuarioDestino?: number
  fechaEgreso?: string
  comprobantePath?: string
}

export function listarEgresos(opciones: {
  buscar?: string
  desde?: string
  hasta?: string
  pagina?: number
}) {
  return pedir<Pagina<EgresoResumen>>(`/api/egresos${query({ ...opciones })}`)
}

export function registrarEgreso(datos: AltaEgreso) {
  return pedir<EgresoResumen>('/api/egresos', { metodo: 'POST', cuerpo: datos })
}

// -- Propio -----------------------------------------------------------------

export function cambiarMiPassword(passwordActual: string, passwordNueva: string) {
  return pedir<void>('/api/me/password', {
    metodo: 'POST',
    cuerpo: { passwordActual, passwordNueva } satisfies CambioPasswordRequest,
  })
}
