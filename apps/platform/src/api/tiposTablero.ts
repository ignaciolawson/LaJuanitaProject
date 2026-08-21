import type { CajaDelPeriodo, Disciplina, Moneda } from './tiposAdmin'

/**
 * Módulo 8 — el tablero de dirección.
 *
 * Espeja `Tablero` y `ResumenFinanciero` del backend.
 *
 * **Son dos tipos y no uno con campos opcionales**, por la misma razón por la
 * que son dos endpoints: lo que ve STAFF no es el tablero con huecos, es otra
 * cosa más chica. Un tipo con todo opcional obligaría a preguntar por cada
 * campo en la pantalla y no diría nunca si algo falta porque no existe o porque
 * no corresponde.
 */

/** Las seis líneas de negocio. Espeja `LineaDeNegocio`. */
export type LineaDeNegocio =
  | 'CURSOS'
  | 'ALQUILER_CABINA'
  | 'GRABACION_SET'
  | 'MIX_MASTERING'
  | 'VENTA_EQUIPOS'
  | 'OTRO'

export type Periodo = {
  desde: string
  hasta: string
  idSala: number | null
}

export type AlumnosPorServicio = {
  disciplina: Disciplina
  /** `null` cuando la inscripción no tiene nivel cargado (las mentorías). */
  nivel: string | null
  alumnos: number
  inscripciones: number
}

export type IngresosDeLinea = {
  moneda: Moneda
  linea: LineaDeNegocio
  monto: number
  cantidad: number
}

/**
 * La grilla de ocupación, **completa desde el backend**.
 *
 * `horas` son las columnas a dibujar y `franjas` tiene una fila por casilla,
 * incluidas las que están en cero. La pantalla no rellena nada: si lo hiciera,
 * "cero y no vacío" sería un detalle de dibujo que se pierde en el próximo
 * rediseño, en vez de una regla que el backend sostiene y un test mira.
 */
export type Ocupacion = {
  horas: number[]
  franjas: Franja[]
}

export type Franja = {
  /** Día ISO: lunes 1, domingo 7. */
  dia: number
  /** La hora en que **empiezan** esas reservas. */
  hora: number
  reservas: number
  /** La duración total de esas reservas, no las horas usadas en esta franja. */
  horasReservadas: number
}

export type CobrosPendientes = {
  moneda: Moneda
  monto: number
  cantidad: number
  vencido: number
  cantidadVencida: number
}

/**
 * La tasa de retención (P26).
 *
 * **`tasa` es `null` cuando nadie cerró todavía su ventana de 10 meses**, y la
 * pantalla tiene que decir eso y no "0%": un cero se lee como que se fueron
 * todos. Misma distinción que el semáforo del Módulo 5 hace con `null`.
 */
export type Retencion = {
  conVentanaCerrada: number
  retenidos: number
  tasa: number | null
}

/**
 * De quienes llegaron al estudio por un servicio suelto —alquiler, grabación,
 * M&M o venta de equipos, sin ser todavía alumnos—, cuántos se convirtieron
 * después en alumnos.
 *
 * **`tasa` es `null` cuando nadie llegó todavía por un servicio suelto**,
 * misma distinción que `Retencion.tasa`: un 0% se leería como "nadie
 * convierte" cuando lo que pasa es que no hay a quién medir.
 */
export type Conversion = {
  llegaronPorServicioSuelto: number
  convertidos: number
  tasa: number | null
}

export type MixMasteringDelTablero = {
  porEstado: { estado: string; cantidad: number }[]
  entregadosEnElPeriodo: number
  conRevisionesDeMas: number
}

export type SelloDelTablero = {
  porEstado: { estado: string; cantidad: number }[]
  publicadosEnElPeriodo: number
  /** Las excepciones firmadas a la regla dura del Módulo 7. */
  publicadosSinContrato: number
  /** "Dónde sonó". Puede venir vacío y no es una falla (P25). */
  apariciones: { tipo: string; cantidad: number }[]
}

export type Tablero = {
  periodo: Periodo
  caja: CajaDelPeriodo[]
  alumnos: AlumnosPorServicio[]
  ingresos: IngresosDeLinea[]
  ocupacion: Ocupacion
  pendientes: CobrosPendientes[]
  retencion: Retencion
  conversion: Conversion
  mixMastering: MixMasteringDelTablero
  sello: SelloDelTablero
}

/** Lo que ve STAFF. Espeja `ResumenFinanciero`. */
export type ResumenFinanciero = {
  periodo: Periodo
  caja: CajaDelPeriodo[]
  pendientes: CobrosPendientes[]
}

export const NOMBRE_DE_LINEA: Record<LineaDeNegocio, string> = {
  CURSOS: 'Cursos',
  ALQUILER_CABINA: 'Alquiler de cabina',
  GRABACION_SET: 'Grabación de set',
  MIX_MASTERING: 'Mix & Mastering',
  VENTA_EQUIPOS: 'Venta de equipos',
  OTRO: 'Sin asignar',
}

/** Lunes primero: la grilla se dibuja como una semana, no como un calendario. */
export const DIAS_DE_LA_SEMANA = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
