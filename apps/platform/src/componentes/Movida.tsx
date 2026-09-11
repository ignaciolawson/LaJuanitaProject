import { Etiqueta } from './Etiqueta'

/**
 * *"Movida 3 veces"* — cuántas veces se aprobó cambiar de día esta reserva
 * (`mejoras.md` §16 · A3, P69).
 *
 * ⚠️ **Existe porque el número no se veía en ningún lado.** El motivo de cada
 * pedido se guarda desde `V1` y ninguna pantalla los contaba: el que movió
 * cuatro veces se veía igual que el que movió una. La decisión fue **contador
 * visible y sin tope** — un límite duro es una regla de negocio, va a la base, y
 * el día que alguien tiene una razón legítima para la tercera no hay salida. El
 * número se agrega el día que este contador muestre un abuso real, no antes.
 *
 * **Con cero no dibuja nada.** Lo normal es que una clase no se haya movido, y
 * una etiqueta *"movida 0 veces"* en cada fila es ruido que tapa a la que sí.
 *
 * Es tono `neutra` y no `atencion`: mover una clase no le pide nada a nadie —
 * el pedido ya se resolvió—. Lo que informa es el patrón, y el patrón se lee
 * comparando filas, no con un rojo por fila.
 *
 * El número **viene del servidor**, agrupado en la consulta
 * (`SolicitudReprogramacionRepository.movidasDe`), y es el mismo para el
 * alumno, el profesor y administración. Contarlo acá sobre "mis pedidos" daría
 * 1 donde el profesor también pidió una vez.
 */
export function Movida({ veces }: { veces: number }) {
  if (veces === 0) return null

  return <Etiqueta>{veces === 1 ? 'movida 1 vez' : `movida ${veces} veces`}</Etiqueta>
}
