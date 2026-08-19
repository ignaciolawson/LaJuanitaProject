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
  /**
   * Si un usuario puede pedir este uso desde el portal (P17, `V13`).
   *
   * No es el negado de `esClase`: Mix & Mastering tampoco es una clase y tampoco
   * se pide por acá. La marca vive en el catálogo, no en una lista escrita en el
   * código.
   */
  solicitablePorUsuario: boolean
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

/**
 * Una sala fuera de servicio. Espeja `BloqueoResumen`.
 *
 * <b>Una fila es una franja horaria que se repite todos los días del rango</b>,
 * no un intervalo continuo: "de 9 a 13 toda la semana" deja la sala libre de 13
 * en adelante todos esos días. Es la lectura que `V7` tuvo que rescatar de una
 * migración que la había perdido, y la pantalla tiene que decirlo así.
 *
 * `diaCompleto` y `vigente` los calcula el servidor. El segundo sobre todo:
 * deducirlo en el front lo deja a merced del reloj del navegador.
 */
export type BloqueoResumen = {
  idBloqueo: number
  idSala: number
  sala: string
  fechaInicio: string
  fechaFin: string
  horaInicio: string
  horaFin: string
  diaCompleto: boolean
  motivo: string
  vigente: boolean
  registradoPor: string | null
  fechaRegistro: string
}

/**
 * Cuánto se usó una sala en un período. Espeja `UsoDeSala`.
 *
 * Las canceladas y las reprogramadas van aparte y **no suman horas**: una sala
 * con veinte clases dictadas y una con veinte canceladas no se usaron igual.
 */
export type UsoDeSala = {
  idSala: number
  sala: string
  activa: boolean
  reservas: number
  horas: number
  canceladas: number
  reprogramadas: number
  porTipo: UsoPorTipo[]
}

export type UsoPorTipo = {
  idTipoUso: number
  tipoUso: string
  color: string | null
  reservas: number
  horas: number
}

// -- Módulo 3: pagos ---------------------------------------------------------

export type MedioPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'PAYPAL' | 'CUENTA_EEUU' | 'OTRO'

/**
 * Estado de un pago. Espeja `EstadoPago`.
 *
 * **Una fila de `pago` no es siempre plata que entró:** `DEBE` y `VENCIDO` son
 * la deuda anotada y `ANULADO` es lo que se dio de baja. El backend ya manda
 * `entro` calculado — no lo deduzcas de acá, o la pantalla y la caja se separan.
 */
export type EstadoPago = 'SENADO' | 'PAGADO' | 'DEBE' | 'VENCIDO' | 'ANULADO'

/** Los cuatro destinos posibles. Un pago salda uno, exactamente. */
export type DestinoDePago = 'INSCRIPCION' | 'RESERVA' | 'TRABAJO_MASTERING' | 'VENTA_EQUIPO'

/** Una fila del listado de pagos. Espeja `PagoResumen`. */
export type PagoResumen = {
  idPago: number
  idUsuario: number
  nombre: string
  apellido: string
  email: string
  destino: DestinoDePago
  idDestino: number
  /** Ya legible, resuelto en el servidor: "DJ · INICIAL", "Sala 2 · 14/08 10:00". */
  queSalda: string
  concepto: string | null
  monto: number
  moneda: Moneda
  cotizacionDolar: number | null
  medioPago: MedioPago
  descuentoPorcentaje: number
  motivoDescuento: string | null
  estadoPago: EstadoPago
  /** Si suma a la caja. Lo decide el backend. */
  entro: boolean
  comprobantePath: string | null
  comprobanteInvalido: boolean
  motivoInvalidacion: string | null
  motivoAnulacion: string | null
  fechaAnulacion: string | null
  fechaPago: string
  fechaRegistro: string
}

/**
 * El estado de cuenta de una persona. Espeja `EstadoDeCuenta`.
 *
 * **Los saldos van por moneda y nunca se restan entre sí** (§2.3): un curso en
 * pesos con un pago en dólares no tiene saldo, tiene dos renglones.
 */
export type EstadoDeCuenta = {
  idUsuario: number
  nombre: string
  apellido: string
  email: string
  saldos: SaldoPorMoneda[]
  contratos: ContratoDelAlumno[]
  pagos: PagoResumen[]
}

export type SaldoPorMoneda = { moneda: Moneda; pagado: number; adeudado: number }

export type ContratoDelAlumno = {
  idInscripcion: number
  disciplina: Disciplina
  nivel: Nivel | null
  estado: EstadoInscripcion
  moneda: Moneda
  precioTotal: number
  pagado: number
  saldo: number
  /** Si cubrió el 50% que §13 exige antes de reservar. */
  senado: boolean
  saldado: boolean
}

/** La caja de un período, una fila por moneda. Espeja `CajaDelPeriodo`. */
export type CajaDelPeriodo = {
  moneda: Moneda
  ingresos: number
  egresos: number
  neto: number
  /** Lo anotado como deuda. No suma al neto: todavía no entró. */
  adeudado: number
  cantidadDePagos: number
  cantidadDeEgresos: number
  porMedio: { medioPago: MedioPago; monto: number; cantidad: number }[]
}

/** Espeja `Deudor`. `diasDeAtraso` se cuenta desde el renglón más viejo. */
export type Deudor = {
  idUsuario: number
  nombre: string
  apellido: string
  email: string
  telefono: string | null
  moneda: Moneda
  adeudado: number
  cantidadDePagos: number
  desde: string
  diasDeAtraso: number
  vencido: boolean
}

/** Espeja `EgresoResumen`. */
export type EgresoResumen = {
  idEgreso: number
  monto: number
  moneda: Moneda
  cotizacionDolar: number | null
  concepto: string
  destinatario: string | null
  idUsuarioDestino: number | null
  comprobantePath: string | null
  fechaEgreso: string
  fechaRegistro: string
  /** Anulado deja de contar en la caja, pero sigue en el listado: es historial. */
  anulado: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
}

/**
 * Una venta de equipamiento (§6, pantalla 6). Espeja `VentaResumen`.
 *
 * **El estudio no tiene stock propio**: se vende contra el de Pioneer, así que
 * esto no es un inventario sino el registro de una operación que ya pasó.
 */
export type VentaResumen = {
  idVenta: number
  /** El nombre de la cuenta si la hay; si no, el texto libre. */
  comprador: string
  idUsuarioComprador: number | null
  contactoCompradorExterno: string | null
  vendedor: string
  idUsuarioVendedor: number
  categoria: string | null
  marca: string | null
  modeloEquipo: string
  precio: number
  moneda: Moneda
  cotizacionDolar: number | null
  fechaVenta: string
  notas: string | null
  fechaRegistro: string
  /** Si ya entró la plata. La venta y su cobro son dos hechos. */
  cobrada: boolean
  /** Anulada sale del total del período pero no del listado: es historial. */
  anulada: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
}

/** A partir de acá una deuda está vencida (§6). Espeja `DIAS_PARA_VENCER`. */
export const DIAS_PARA_VENCER = 7

export const NOMBRE_DE_MEDIO: Record<MedioPago, string> = {
  EFECTIVO: 'Efectivo',
  TRANSFERENCIA: 'Transferencia',
  PAYPAL: 'PayPal',
  CUENTA_EEUU: 'Cuenta EEUU',
  OTRO: 'Otro',
}

export const NOMBRE_DE_ESTADO_PAGO: Record<EstadoPago, string> = {
  SENADO: 'Señado',
  PAGADO: 'Pagado',
  DEBE: 'Debe',
  VENCIDO: 'Vencido',
  ANULADO: 'Anulado',
}
