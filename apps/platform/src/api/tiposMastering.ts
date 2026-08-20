import type { MedioPago, Moneda } from './tiposAdmin'

/**
 * Contratos del Módulo 6 — Mix & Mastering.
 *
 * **Es el único servicio del estudio que puede quedar en debe** (§3): todo lo
 * demás se seña antes de existir. Por eso este módulo tiene una regla propia y
 * dura — *el premaster no se entrega hasta que el pago esté registrado*— y casi
 * todo lo que sigue existe para sostenerla.
 */

/** Los tres de `trabajo_tipo_valido`. Confirmados el 2026-08-19: no falta ninguno. */
export type TipoTrabajo = 'MIX' | 'MASTER' | 'MIX_MASTER'

export const NOMBRE_DE_TIPO: Record<TipoTrabajo, string> = {
  MIX: 'Mix',
  MASTER: 'Master',
  MIX_MASTER: 'Mix + Master',
}

/**
 * El estado del trabajo.
 *
 * ⚠️ **Solo avanzan.** Lo sostiene un trigger (`V1` §8.5), no la pantalla: un
 * trabajo ya cobrado que vuelve a "en proceso" descuadra los ingresos. La
 * pantalla ofrece los que se pueden y el backend rechaza el resto con su mensaje.
 *
 * `ENTREGADO` y `DEBE` son **el mismo escalón**: la misma etapa vista desde la
 * plata. Se puede ir de una a la otra en cualquier dirección. `CANCELADO` está
 * fuera de la escalera y se llega desde donde sea.
 */
export type EstadoTrabajo =
  | 'A_CONFIRMAR'
  | 'EN_PROCESO'
  | 'ENTREGADO'
  | 'PAGADO'
  | 'DEBE'
  | 'CANCELADO'

export const NOMBRE_DE_ESTADO: Record<EstadoTrabajo, string> = {
  A_CONFIRMAR: 'A confirmar',
  EN_PROCESO: 'En proceso',
  ENTREGADO: 'Entregado',
  PAGADO: 'Pagado',
  DEBE: 'Debe',
  CANCELADO: 'Cancelado',
}

/**
 * Un trabajo, como lo ve administración.
 *
 * ⚠️ **Este tipo no puede aparecer en una pantalla del cliente**: trae
 * `notasInternas` y trae `urlPremaster` esté liberado o no. Lo del cliente es
 * `TrabajoDelPortal`, que es otro record en el backend justamente por eso.
 */
export type TrabajoResumen = {
  idTrabajo: number
  idClienteUsuario: number | null
  /** Ya armado por el servidor: el de la cuenta si la tiene, si no el externo. */
  cliente: string
  contactoClienteExterno: string | null
  clienteTieneCuenta: boolean
  idProfesorAsignado: number | null
  profesorAsignado: string | null
  tipoTrabajo: TipoTrabajo
  nombreTrack: string
  precioAcordado: number | null
  moneda: Moneda
  /** Lo que entró, **en la moneda del trabajo**. Null si no entró nada. */
  cobrado: number | null
  revisionesIncluidas: number
  /** Puede ser mayor que las incluidas: esa es la alerta, no un error. */
  revisionesRealizadas: number
  fechaEstimada: string | null
  fechaEntregaReal: string | null
  estado: EstadoTrabajo
  urlMaterialCliente: string | null
  urlMaster: string | null
  urlPremaster: string | null
  premasterLiberado: boolean
  liberadoSinPago: boolean
  motivoLiberacion: string | null
  notasInternas: string | null
  fechaCreacion: string
}

/**
 * Un trabajo, como lo ve su cliente.
 *
 * ⚠️ **`urlPremaster` llega `null` hasta que está liberado, y esa decisión la
 * toma el backend en el mapeo.** No es que la pantalla lo esconda: el link no
 * viaja. Si alguna vez este tipo empieza a recibirlo siempre, la regla del módulo
 * se rompió aunque la pantalla siga igual.
 */
export type TrabajoDelPortal = {
  idTrabajo: number
  tipoTrabajo: TipoTrabajo
  nombreTrack: string
  estado: EstadoTrabajo
  profesorAsignado: string | null
  precioAcordado: number | null
  moneda: Moneda
  revisionesIncluidas: number
  revisionesRealizadas: number
  fechaEstimada: string | null
  fechaEntregaReal: string | null
  urlMaster: string | null
  urlPremaster: string | null
  premasterLiberado: boolean
}

/** Espeja `AltaTrabajoRequest`. Sin cliente —cuenta o nombre— no entra. */
export type AltaTrabajo = {
  idClienteUsuario?: number
  nombreClienteExterno?: string
  contactoClienteExterno?: string
  idProfesorAsignado?: number
  tipoTrabajo: TipoTrabajo
  nombreTrack: string
  precioAcordado?: number
  moneda?: Moneda
  cotizacionDolar?: number
  revisionesIncluidas?: number
  fechaEstimada?: string
  urlMaterialCliente?: string
  notasInternas?: string
}

/**
 * Espeja `EdicionTrabajoRequest`.
 *
 * No lleva estado, ni revisiones realizadas, ni la liberación del premaster: los
 * tres son hechos y tienen su propia operación. Cargar el link del premaster sí
 * es edición — **cargarlo no es entregarlo**.
 */
export type EdicionTrabajo = {
  idProfesorAsignado?: number
  tipoTrabajo: TipoTrabajo
  nombreTrack: string
  precioAcordado?: number
  moneda: Moneda
  cotizacionDolar?: number
  revisionesIncluidas: number
  fechaEstimada?: string
  fechaEntregaReal?: string
  urlMaterialCliente?: string
  urlMaster?: string
  urlPremaster?: string
  notasInternas?: string
}

/**
 * Espeja `CobroRequest`.
 *
 * `idUsuario` **es obligatorio y no sale del trabajo**: `pago.id_usuario` es NOT
 * NULL y la mitad de los clientes de M&M no tienen cuenta. La pantalla lo dice
 * antes de dejar mandar el pedido.
 */
export type CobroTrabajo = {
  idUsuario: number
  monto: number
  moneda: Moneda
  cotizacionDolar?: number
  medioPago: MedioPago
}
