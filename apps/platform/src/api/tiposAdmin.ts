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
  /**
   * El horario apartado con la deuda anotada y su plazo (`V24`, §13 · C1).
   *
   * ⚠️ **Ocupa la franja**, igual que una confirmada: ése es el punto entero, que
   * el que pidió primero se quede con el horario. Lo que la separa es que tiene
   * fecha de vencimiento, y al cumplirse se cancela sola.
   */
  | 'PRECONFIRMADA'
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
  /**
   * De qué curso descuenta una clase de este tipo. **Null = no descuenta**
   * (`V22`, `mejoras.md` §12 · C1).
   *
   * ⚠️ **No es para decidir, es para mostrar.** Quien elige la inscripción contra
   * la que se descuenta es el servidor; el `<select>` "Descuenta de" dejó de
   * existir justamente porque dejaba elegir un curso que no tenía nada que ver
   * con la reserva. Acá viaja para que el alta pueda *decir* contra qué va a
   * descontar antes de mandar el pedido.
   */
  disciplina: Disciplina | null
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
  /**
   * Hasta cuándo está apartado el horario sin pagar (`V24`).
   *
   * **Null en todo lo que no esté `PRECONFIRMADA`**, y eso lo garantiza un CHECK
   * de la base: un plazo vivo sobre una reserva ya paga le diría a quien mire la
   * pantalla "vence en 3hs".
   */
  venceEn: string | null
  notas: string | null
  idReservaRecupera: number | null
  motivoReprogramacion: string | null
  /** Cuántas veces se aprobó cambiarla de día (P69). Agrupado en la consulta. */
  vecesMovida: number
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
/**
 * `PREINSCRIPTA` desde `V30` (P59 · P60): anotada sin señar, con 24 hs, y
 * todavía no cursa. Se sale sólo a `ACTIVA` —registrando la seña, que la
 * activa sola— o a `CANCELADA`; la base rechaza lo demás con su propio texto.
 */
export type EstadoInscripcion = 'PREINSCRIPTA' | 'ACTIVA' | 'COMPLETADA' | 'CANCELADA' | 'PAUSADA'

/**
 * Cómo se vende un programa (`V28`, P63). Espeja `Cobro`.
 *
 * `PAQUETE`: el precio es del curso entero (DJ, Producción). `SESION`: el precio
 * es de cada sesión y el total sale de sesiones × precio (la mentoría, que no
 * tiene estándar de clases).
 */
export type Cobro = 'PAQUETE' | 'SESION'

/**
 * Una fila del catálogo de programas (`V28`, P63 — cierra P13). Espeja
 * `ProgramaResumen`.
 *
 * ⚠️ **Acá vivía `CLASES_ESTANDAR`**, una copia del 8/16 de Java "para
 * mostrarlo", con un comentario diciendo que la de Java era la que valía. Eran
 * dos definiciones de un dato que nadie podía cambiar sin un deploy. Desde
 * `V28` el alta de inscripción lee el catálogo — `clasesEstandar` de acá — y
 * prellena el precio con `precio`. Mica lo edita en `/admin/programas`.
 */
export type ProgramaResumen = {
  idPrograma: number
  disciplina: Disciplina
  nombre: string
  descripcion: string | null
  /** `null` = todavía no hay precio ("a confirmar"). Cero es un precio. */
  precio: number | null
  moneda: Moneda
  cobro: Cobro
  /** `null` = sin estándar: quien inscribe dice cuántas son. */
  clasesEstandar: number | null
  duracionMinutos: number
  activo: boolean
}

/** Editar una fila del catálogo. Todo menos la disciplina. Espeja `EdicionProgramaRequest`. */
export type EdicionPrograma = {
  nombre: string
  descripcion: string | null
  precio: number | null
  moneda: Moneda
  cobro: Cobro
  clasesEstandar: number | null
  duracionMinutos: number
  activo: boolean
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
  /** Sólo con valor en `PREINSCRIPTA`: hasta cuándo puede señarse (`V30`). */
  vencePreinscripcion: string | null
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

/**
 * La línea de negocio de un pago. Espeja el enum `LineaDeNegocio` del backend.
 *
 * ⚠️ **No es `DestinoDePago` con otros nombres**, y la diferencia es el motivo de
 * que exista: el destino es *a qué apunta* el pago; la línea cruza además el tipo
 * de uso de la reserva. **La seña de una clase apunta a una `RESERVA` y es plata
 * de `CURSOS`.**
 *
 * **La calcula el servidor y acá sólo se nombra.** Derivarla en el front sería
 * una segunda definición de algo que ya vive en un solo lugar
 * (`LineaDeNegocio.EXPRESION`, la misma que usa el Tablero) — y entonces el mismo
 * pago podría caer en un negocio en esta pantalla y en otro en el Tablero, sin
 * que nada fallara.
 */
export type LineaDeNegocio =
  | 'CURSOS'
  | 'ALQUILER_CABINA'
  | 'GRABACION_SET'
  | 'MIX_MASTERING'
  | 'VENTA_EQUIPOS'
  | 'OTRO'

/**
 * La solapa de la pantalla de pagos (`mejoras.md` §13 · B2). Espeja
 * `LineaDeNegocio.Grupo`.
 *
 * **Son cuatro y no las tres que se pidieron.** `SIN_DESTINO` no se puede
 * esconder: un pago que no apunta a nada es plata que entró, y filtrarlo haría
 * que la suma de las solapas deje de dar la caja sin que nadie pueda ver por qué.
 * La pantalla dibuja esa solapa sólo cuando tiene filas.
 *
 * ⚠️ **Qué líneas caen en cada grupo lo decide el servidor**, y viene resuelto en
 * cada fila de `TotalDeLinea`. Escribir el mapa acá sería tenerlo dos veces, y el
 * modo de falla es concreto: la solapa mostraría un número que no coincide con lo
 * que lista, porque contaría con un mapa y filtraría con el otro.
 */
export type GrupoDePago = 'PROGRAMAS' | 'SERVICIOS' | 'EQUIPOS' | 'SIN_DESTINO'

/**
 * Cuántos pagos y cuánta plata hay en una línea, con los filtros puestos.
 * Espeja `TotalDeLinea`.
 *
 * ⚠️ **`cantidad` y `entraron` son cosas distintas y no se pueden fusionar**:
 * la primera son las filas que el listado va a mostrar, la segunda es —de ésas—
 * la plata que efectivamente entró. Una deuda anotada y un pago anulado cuentan
 * en la primera y no en la segunda.
 */
export type TotalDeLinea = {
  linea: LineaDeNegocio
  grupo: GrupoDePago
  moneda: Moneda
  cantidad: number
  entraron: number
}

/** Una fila del listado de pagos. Espeja `PagoResumen`. */
/**
 * Un comprobante adjunto a un pago (`V21`).
 *
 * **No trae la ruta del archivo, y es a propósito**: la clave del almacenamiento
 * es interna y publicarla en el JSON la deja a mano de cualquiera que abra las
 * herramientas del navegador. Se baja por su endpoint, que verifica quién
 * pregunta — igual que el link del premaster, que tampoco viaja.
 */
export type ComprobanteResumen = {
  idComprobante: number
  /** Con el que se subió: "transferencia-agosto.pdf". Ya saneado por el servidor. */
  nombreOriginal: string
  cargadoPor: string
  fechaCreacion: string
  invalido: boolean
  invalidadoPor: string | null
  fechaInvalidacion: string | null
  motivoInvalidacion: string | null
}

export type PagoResumen = {
  idPago: number
  /**
   * **Null si quien pagó no tiene cuenta** (`V19`). Los cuatro campos de la
   * persona vienen juntos: o están los cuatro, o no está ninguno.
   *
   * Para mostrar el nombre usá `pagador`, que siempre tiene valor. Estos cuatro
   * sirven para lo que *solo* se puede hacer con una cuenta — cruzar el estado
   * de cuenta, mandarle algo.
   */
  idUsuario: number | null
  nombre: string | null
  apellido: string | null
  email: string | null
  /** Cómo se llama quien pagó, tenga cuenta o no. **Siempre tiene valor.** */
  pagador: string
  /** Si no tiene cuenta. La fila lo marca y no se le puede cruzar el estado de cuenta. */
  pagadorSinCuenta: boolean
  destino: DestinoDePago
  idDestino: number
  /** Ya legible, resuelto en el servidor: "DJ · INICIAL", "Sala 2 · 14/08 10:00". */
  queSalda: string
  /**
   * A qué negocio pertenece esta plata. Ver `LineaDeNegocio`.
   *
   * Null sólo en las respuestas que devuelven el pago recién tocado —el alta, la
   * anulación—, donde la pantalla que las recibe no muestra esta columna.
   */
  lineaDeNegocio: LineaDeNegocio | null
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
  /**
   * Los respaldos adjuntos, en orden de carga. Vacía, no null.
   *
   * **Son varios desde `V21`**, y eso es lo que la pantalla tiene que poder
   * dibujar: el comprobante equivocado queda marcado como inválido —con quién lo
   * marcó y por qué— y el correcto se muestra al lado. Antes era un solo campo de
   * texto que alguien tipeaba, o sea un respaldo sin ningún archivo detrás.
   */
  comprobantes: ComprobanteResumen[]
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
  /**
   * Lo que debe HOY, con la definición de Deudores (§17 · H3): las mismas filas
   * que esa pantalla, acotadas a la persona. `saldos` es historia por moneda.
   */
  pendientes: Deudor[]
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
  /**
   * Lo cobrado en la OTRA moneda, si hay (§17 · H4). Desde `V31` no puede
   * nacer un pago así; las filas anteriores se dicen para que un contrato "sin
   * seña" al lado de un pago que sí entró se entienda. `null` si no hay.
   */
  cobradoEnOtraMoneda: number | null
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
  /**
   * **Null si el deudor no tiene cuenta** (`V19`). Entra igual a esta pantalla:
   * una deuda que no aparece acá es una deuda que nadie va a ir a cobrar.
   * Lo que no tiene es estado de cuenta al que linkear.
   */
  idUsuario: number | null
  nombre: string
  apellido: string | null
  email: string | null
  telefono: string | null
  moneda: Moneda
  adeudado: number
  /** 0 para las dos fuentes de inscripción: no hay pago anotado. */
  cantidadDePagos: number
  desde: string
  diasDeAtraso: number
  vencido: boolean

  /**
   * Por qué figura (P72). Deudores tiene DOS fuentes desde la §16 · Fase 6:
   * las deudas anotadas de siempre (con reloj de 7 días) y las inscripciones
   * con plata pendiente — `SIN_SENIAR` (preinscripta, con su plazo) y
   * `FALTA_EL_RESTO` (activa con saldo, **sin plazo, nunca vencida**).
   */
  motivo: MotivoDeDeuda
  idInscripcion: number | null
  disciplina: Disciplina | null
  /** Sólo para `SIN_SENIAR`: hasta cuándo puede señar. */
  vence: string | null
}

export type MotivoDeDeuda = 'DEUDA_ANOTADA' | 'SIN_SENIAR' | 'FALTA_EL_RESTO'

export const NOMBRE_DE_MOTIVO: Record<MotivoDeDeuda, string> = {
  DEUDA_ANOTADA: 'Deuda anotada',
  SIN_SENIAR: 'Sin señar',
  FALTA_EL_RESTO: 'Seña abonada, falta el resto',
}

/** Espeja `EgresoResumen`. */
/**
 * De qué lado del corte está un egreso (`mejoras.md` §12 · C3).
 *
 * `PROFESOR` son los sueldos —el egreso apunta a una cuenta— y `OTRO` el resto
 * de los gastos del estudio. **Los rubros de verdad** (alquiler, servicios,
 * equipamiento) **no existen todavía**: necesitan la lista confirmada con el
 * cliente y una columna nueva. Ver `platform.md` §18 · P42.
 */
export type DestinoDeEgreso = 'PROFESOR' | 'OTRO'

export type EgresoResumen = {
  idEgreso: number
  monto: number
  moneda: Moneda
  cotizacionDolar: number | null
  concepto: string
  destinatario: string | null
  idUsuarioDestino: number | null
  /**
   * Si esta plata es un sueldo. Lo decide el servidor, no la pantalla.
   *
   * Es `idUsuarioDestino !== null` con nombre: que la fila lo diga evita que dos
   * lugares vuelvan a deducirlo y terminen contando distinto.
   */
  esPagoAProfesor: boolean
  /**
   * El respaldo adjunto. **Varios desde `V25`** (§14 · C1).
   *
   * Antes era `comprobantePath`, un texto que alguien tipeaba en el formulario —
   * el placeholder decía `/comprobantes/…`, o sea que la pantalla pedía una ruta
   * y mostraba respaldo donde no había ningún archivo. Ahora es la misma lista,
   * la misma pieza de pantalla y las mismas reglas que la de un pago.
   */
  comprobantes: ComprobanteResumen[]
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
  /**
   * El pago vivo de la venta, para adjuntarle el comprobante (§14 · B2).
   *
   * ⚠️ **Puede venir con `cobrada` en falso y no es una contradicción**: una
   * deuda anotada es un pago vivo —se le adjunta el respaldo de la transferencia,
   * que es el papel con el que después se la cobra— y no es plata que entró. Son
   * las dos lecturas que `V12` enseñó a no confundir.
   */
  idPago: number | null
  /** Los comprobantes de ese pago. Vacío si la venta no tiene pago. */
  comprobantes: ComprobanteResumen[]
  /** Anulada sale del total del período pero no del listado: es historial. */
  anulada: boolean
  motivoAnulacion: string | null
  fechaAnulacion: string | null
}

/*
 * ⚠️ Acá vivía `NOMBRE_DE_DESTINO`, que nombraba los cuatro destinos para el
 * filtro de §12 · B1. **§13 · B2 lo dejó sin uso y por eso no está**: la pantalla
 * pasó a dividirse por línea de negocio, que es lo que además muestra cada fila.
 * Convivían dos vocabularios sobre el mismo renglón —el filtro decía "Reserva de
 * sala" y la fila decía "Cursos"— y quedarse con el mapa muerto, con su comentario
 * afirmando que el filtro va por ahí, era peor que borrarlo.
 *
 * El tipo `DestinoDePago` sigue vivo: lo usa el formulario de alta, donde la
 * frase es "este pago salda…" y cada opción se dice con otras palabras.
 */

/**
 * La línea de negocio de un pago, como se la nombra en pantalla.
 *
 * ⚠️ **`OTRO` se dice y no se esconde.** Es un pago que no apunta a nada — la
 * tabla lo permite, los cuatro destinos son nullable— y es plata que entró: si
 * la fila no dijera nada, la única forma de encontrarla para corregirla sería
 * que alguien la busque de casualidad. Es el mismo criterio que el Tablero
 * escribe en `LineaDeNegocio.OTRO`.
 */
/**
 * Las solapas de la pantalla de pagos, en orden (`mejoras.md` §13 · B2).
 *
 * El orden es el del negocio y no el alfabético: los programas son la mayor
 * parte de lo que entra, y `SIN_DESTINO` va última porque es la excepción que
 * hay que ir a corregir, no una línea del negocio.
 */
export const NOMBRE_DE_GRUPO: Record<GrupoDePago, string> = {
  PROGRAMAS: 'Programas',
  SERVICIOS: 'Servicios',
  EQUIPOS: 'Venta de equipos',
  SIN_DESTINO: 'Sin destino',
}

export const NOMBRE_DE_LINEA: Record<LineaDeNegocio, string> = {
  CURSOS: 'Cursos',
  ALQUILER_CABINA: 'Alquiler de cabina',
  GRABACION_SET: 'Grabación de set',
  MIX_MASTERING: 'Mix & Mastering',
  VENTA_EQUIPOS: 'Venta de equipos',
  OTRO: 'Sin línea asignada',
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

/**
 * Los medios en el orden del `<select>`. Derivado del mapa de nombres para que
 * un medio nuevo no pueda quedar con etiqueta y sin opción. (Tres pantallas
 * todavía llevan su copia local de esta lista; ésta es la que conviene usar.)
 */
export const MEDIOS_DE_PAGO = Object.keys(NOMBRE_DE_MEDIO) as MedioPago[]

export const NOMBRE_DE_ESTADO_PAGO: Record<EstadoPago, string> = {
  SENADO: 'Señado',
  PAGADO: 'Pagado',
  DEBE: 'Debe',
  VENCIDO: 'Vencido',
  ANULADO: 'Anulado',
}

// -- El buzón de solicitantes (V20, hallazgo #7) -----------------------------

/**
 * En qué quedó una ficha del buzón.
 *
 * ⚠️ **`CONVERTIDO` ya no existe, y ése era el bug** (`V27`, P55). Significaba
 * *"se le creó la cuenta"* y se usaba como si fuera terminal: cuando alguien
 * apretaba ese botón la persona seguía sin su reserva, y la ficha ya se había ido
 * de la lista **y del contador del sidebar**. Crear la cuenta no es atender la
 * ficha.
 *
 * *"Tiene cuenta"* volvió a ser lo que siempre fue: un campo (`idUsuario`).
 */
export type EstadoSolicitante = 'PENDIENTE' | 'ATENDIDO' | 'DESCARTADO'

export const NOMBRE_DE_ESTADO_SOLICITANTE: Record<EstadoSolicitante, string> = {
  PENDIENTE: 'Sin contestar',
  ATENDIDO: 'Atendida',
  DESCARTADO: 'Descartada',
}

/**
 * Qué pidió. **Decide a qué pantalla va quien la atiende**, que es lo único que
 * la ficha tiene que decir: un curso termina en Inscripciones, una cabina o una
 * grabación en el Calendario, una consulta de equipos en Venta de equipos.
 *
 * Espeja `InteresDelSolicitante`. Mix & Mastering no está a propósito: llega por
 * WhatsApp a Ghezz y se carga a mano (§14, P23).
 */
export type InteresDelSolicitante =
  | 'CURSO'
  | 'ALQUILER_CABINA'
  | 'GRABACION_SET'
  | 'EQUIPOS'
  | 'OTRO'

export const NOMBRE_DE_INTERES: Record<InteresDelSolicitante, string> = {
  CURSO: 'Un curso',
  ALQUILER_CABINA: 'Alquilar la cabina',
  GRABACION_SET: 'Grabar un set',
  EQUIPOS: 'Comprar equipos',
  OTRO: 'Otra cosa',
}

/**
 * Cuánta experiencia trae quien pidió un programa (`V29`, P64). Espeja
 * `Experiencia` del backend.
 *
 * **Es lo que el formulario de la web pregunta, no un nivel**: la landing no
 * ofrece inicial/intermedio/avanzado a propósito. El nivel se sugiere desde
 * acá al inscribir (cero y algo → inicial, ya toca → intermedio) y quien
 * inscribe lo cambia si quiere.
 */
export type Experiencia = 'CERO' | 'ALGO' | 'TOCA'

/** Como lo dice la ficha: la frase que el formulario le mostró a la persona. */
export const NOMBRE_DE_EXPERIENCIA: Record<Experiencia, string> = {
  CERO: 'arranca de cero',
  ALGO: 'algo por su cuenta',
  TOCA: 'ya toca o produce',
}

/** Presencial o virtual (`V29`, P67). Dato de la ficha, no de la reserva. */
export type Modalidad = 'PRESENCIAL' | 'VIRTUAL'

export const NOMBRE_DE_MODALIDAD: Record<Modalidad, string> = {
  PRESENCIAL: 'presencial',
  VIRTUAL: 'virtual',
}

/**
 * A dónde sigue el trámite de una ficha: dónde se carga lo que pidieron. Es la
 * razón de ser de `interes`, y vive acá y no adentro de la pantalla para que se
 * lea junto con la tabla de nombres: son la misma decisión mirada dos veces.
 *
 * ⚠️ **No es el final del trámite desde `V27`**, y el texto de la pantalla lo
 * dice: se carga allá y se vuelve al buzón a cerrar la ficha apuntando a eso.
 */
export const DONDE_SIGUE: Record<InteresDelSolicitante, { texto: string; ruta: string } | null> = {
  CURSO: { texto: 'Cargale la inscripción', ruta: '/admin/inscripciones' },
  ALQUILER_CABINA: { texto: 'Cargale la reserva', ruta: '/admin/reservas' },
  GRABACION_SET: { texto: 'Cargale la reserva', ruta: '/admin/reservas' },
  EQUIPOS: { texto: 'Cargale la venta', ruta: '/admin/ventas' },
  OTRO: null,
}

/** Una ficha del buzón. Espeja `SolicitanteResumen`. */
export type SolicitanteResumen = {
  idSolicitante: number
  nombre: string
  apellido: string
  email: string
  telefono: string
  interes: InteresDelSolicitante
  detalle: string | null
  mensaje: string | null
  estado: EstadoSolicitante
  /** Nota interna de quien la atendió. Obligatoria si se descartó. */
  respuesta: string | null
  resueltaPor: string | null
  /**
   * La cuenta de esta persona, si ya tiene.
   *
   * ⚠️ **Puede venir con la ficha `PENDIENTE`**: desde `V27` tener cuenta no
   * resuelve nada — es una comodidad para el cliente (P54), no la respuesta a lo
   * que pidió.
   */
  idUsuario: number | null

  /** Qué produjo la ficha. Exactamente uno cuando está `ATENDIDO`, ninguno si no. */
  idReserva: number | null
  idInscripcion: number | null
  idVentaEquipo: number | null

  /**
   * El estado de la reserva que produjo, si produjo una.
   *
   * Es lo que separa *"apartada, falta la seña"* de *"se venció"* y de *"listo"*:
   * la ficha no tiene una vida paralela, muestra el estado de lo que produjo.
   */
  estadoDeLaReserva: EstadoReserva | null

  /** El horario que la persona prefiere. Los tres opcionales — ver P58. */
  fechaPreferida: string | null
  horaPreferida: string | null
  duracionMinutos: number | null

  /**
   * Qué programa, con qué experiencia y cómo (`V29`). Los tres pueden venir en
   * null: una ficha anterior a `V29`, o una que no es de curso — no se atan a
   * `interes` a propósito, para que una landing vieja siga entrando.
   */
  disciplina: Disciplina | null
  experiencia: Experiencia | null
  modalidad: Modalidad | null
  /**
   * Con qué nivel arranca el alta desde el buzón (P64): la experiencia
   * traducida por el servidor, para que la tabla viva en un solo lugar.
   */
  nivelSugerido: Nivel | null

  fechaResolucion: string | null
  fechaCreacion: string
}

/**
 * En qué etapa está una ficha, mirando lo que produjo.
 *
 * **Vive acá y no adentro de la pantalla** por lo mismo que `NOMBRE_DE_INTERES`:
 * el contador del sidebar y el listado tienen que estar de acuerdo sobre qué
 * cuenta como "abierta", y el backend ya lo define una vez en `FichaAbierta`.
 * Esta función es la lectura de eso, no una segunda definición: sólo decide cómo
 * se dibuja.
 */
export function etapaDeLaFicha(ficha: SolicitanteResumen): {
  texto: string
  abierta: boolean
} {
  if (ficha.estado === 'DESCARTADO') {
    return { texto: 'Descartada', abierta: false }
  }
  if (ficha.estado === 'PENDIENTE') {
    return {
      texto: ficha.idUsuario ? 'Tiene cuenta · falta cargarle lo que pidió' : 'Sin contestar',
      abierta: true,
    }
  }
  if (ficha.estadoDeLaReserva === 'PRECONFIRMADA') {
    return { texto: 'Apartada · falta la seña', abierta: true }
  }
  // Se venció sin señar: atendida y con su reserva cancelada. **Ya no está
  // abierta** (P75, §17 · H7): P56 la dejaba abierta "para una decisión" y
  // ninguna se podía tomar — ni botón ni UPDATE (`V13` §4). Queda en "Ya
  // atendidas" con la etiqueta gris, y quien vuelve manda el formulario de nuevo.
  if (ficha.estadoDeLaReserva === 'CANCELADA') {
    return { texto: 'Se venció sin señar', abierta: false }
  }
  return { texto: 'Atendida', abierta: false }
}

/** Lo que se le cargó a una ficha para cerrarla. Espeja `DestinoRequest`. */
export type DestinoDeLaFicha = {
  tipo: 'RESERVA' | 'INSCRIPCION' | 'VENTA'
  id: number
}

/**
 * Algo que una ficha del buzón **pudo haber producido**, ofrecido para cerrarla.
 * Espeja `CandidatoDeLaFicha`.
 *
 * **Existe para que no haya ni un campo donde tipear un id.** Este sistema no
 * muestra ids en ninguna pantalla —el profesor elige *"12/08 10:00 · Clase de
 * DJ"*— y el buzón no iba a ser la excepción: una ficha cerrada contra la reserva
 * de otro se ve resuelta, que es lo único que este buzón no puede permitirse.
 */
export type CandidatoDeLaFicha = {
  tipo: DestinoDeLaFicha['tipo']
  id: number
  /** Ya legible, resuelto en el servidor. Mismo criterio que `queSalda`. */
  descripcion: string
  /**
   * La fecha la escribe `fecha()`, que es la única forma de escribir una acá.
   *
   * ⚠️ **`null` para una inscripción sin fecha de inicio**, y ese `null` es real:
   * `inscripcion.fecha_inicio` es nullable en `V1` y el alta la manda opcional.
   * Este tipo decía `string` y la pantalla le hacía `.slice()` — la pantalla en
   * negro de §16 · A6. Los otros dos candidatos no pueden traerlo: `reserva.fecha`
   * y `venta_equipo.fecha_venta` son `NOT NULL`. *Chequeá el schema, no la frase
   * sobre el schema.*
   */
  cuando: string | null
  /** Anulada, cancelada, pausada… `null` si no hay nada que aclarar. */
  reparo: string | null
}

/**
 * Apartarle la cabina a una ficha, sin salir del buzón. Espeja
 * `ApartarLaCabinaRequest` (`mejoras.md` §15 · Fase 3).
 *
 * **La duración va en minutos y la hora de fin la calcula el servidor**, que es
 * lo que P58 decidió para el formulario de la web: *"2 horas"* es lo que la
 * persona piensa. Acá vale doble, porque su preferencia está guardada así.
 *
 * **Quién paga no viaja**: es quien mandó la ficha, y la cuenta se crea en el
 * mismo movimiento. Poder elegirlo sería poder apartarle la cabina a una persona
 * y anotarle la deuda a otra.
 */
export type ApartarLaCabina = {
  idSala: number
  idTipoUso: number
  fecha: string
  horaInicio: string
  duracionMinutos: number
  monto: number
  moneda: Moneda
  cotizacionDolar?: number
  medioPago: MedioPago
  mensaje?: string
}

/**
 * Lo que quedó hecho al apartar. Espeja `CabinaApartada`.
 *
 * `passwordTemporal` viene null cuando la persona ya tenía cuenta, igual que en
 * `ConversionRealizada`: no es un dato que falte, es la diferencia entre "copiá
 * esto y mandáselo" y "ya tiene la suya".
 */
export type CabinaApartada = {
  ficha: SolicitanteResumen
  reserva: ReservaResumen
  usuario: UsuarioResumen
  passwordTemporal: string | null
  cuentaNueva: boolean
  idPagoDeuda: number | null
  /**
   * Lo que hay que abonar. **Viaja aunque la pantalla lo acabe de mandar**: con
   * él arma el mensaje de WhatsApp sin volver a leer su propio formulario, que
   * para entonces ya se cerró. Y `ReservaResumen` no lo tiene — una reserva no
   * tiene precio en este esquema (P13).
   */
  monto: number
  moneda: Moneda
}

/**
 * Inscribir desde el buzón. Espeja `InscribirDesdeElBuzonRequest`: sin alumno
 * (sale de la ficha) y **sin seña** — desde acá la inscripción nace
 * preinscripta, con 24 hs; la persona todavía no pagó nada.
 */
export type InscribirDesdeElBuzon = {
  disciplina: Disciplina
  nivel?: Nivel | ''
  idProfesor?: number | null
  clasesContratadas?: number
  precioTotal: number
  moneda?: Moneda
  cotizacionDolar?: number | null
  fechaInicio?: string
  notas?: string
}

/**
 * Lo que quedó hecho al inscribir. Espeja `AlumnoInscripto`. `senia` es la
 * sugerencia del 50% y `vence` hasta cuándo (null si nació activa: una beca).
 */
export type AlumnoInscripto = {
  ficha: SolicitanteResumen
  inscripcion: InscripcionResumen
  usuario: UsuarioResumen
  passwordTemporal: string | null
  cuentaNueva: boolean
  senia: number
  moneda: Moneda
  vence: string | null
}

/** Lo que devuelve crearle la cuenta. Espeja `ConversionRealizada` — el nombre
 * del record es de antes de `V27`, cuando esto además cerraba la ficha.
 *
 * `passwordTemporal` viene **null cuando la persona ya tenía cuenta**, que es el
 * otro camino de la conversión. No es un dato que falte: es la diferencia entre
 * "copiá esto y mandáselo" y "ya tiene la suya, no le mandes nada".
 */
export type ConversionRealizada = {
  solicitante: SolicitanteResumen
  usuario: UsuarioResumen
  passwordTemporal: string | null
  cuentaNueva: boolean
}

/**
 * Cuántas cosas esperan en cada bandeja de administración. Espeja `Pendientes`
 * del backend (`GET /api/pendientes`).
 *
 * **No trae las notificaciones**, que son de cada persona y tienen su propio
 * endpoint en el portal. La separación es la misma que el sistema sostiene desde
 * el Módulo 4: ningún endpoint cambia de significado según quién lo llame.
 */
export type Pendientes = {
  pedidosDeSala: number
  pedidosDeCambio: number
  buzon: number
  /** Cuántas personas figuran en Deudores — la lista de la pantalla, contada. */
  deudores: number
}
