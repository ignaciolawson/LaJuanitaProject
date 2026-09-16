package com.lajuanita.backend.pago.dto;

/**
 * Por qué alguien figura en Deudores (P72, P84).
 *
 * <p>Deudores tiene <b>dos fuentes</b>, y esta etiqueta es lo que las distingue
 * en la pantalla y en el scheduler:
 *
 * <ul>
 *   <li>{@link #DEUDA_ANOTADA} — una fila de {@code pago} en DEBE/VENCIDO, como
 *       siempre, <b>de a una desde P84</b> (antes iban agrupadas por persona y
 *       moneda). Tiene reloj: a los 7 días es <i>vencida</i> y avisa. Se cobra
 *       con {@code PATCH /api/pagos/{id}/cobro}.
 *   <li>Las cuatro que siguen <b>se calculan</b> desde {@code SaldoPendiente}
 *       —la cosa tiene precio y lo cobrado en su moneda no lo cubre— y nunca
 *       se anotan como {@code pago}: una fila DEBE por el saldo diría <i>"Deuda
 *       vencida"</i> a la semana para alguien que arranca en tres, el ruido
 *       exacto que P72 prohíbe. Se cobran registrando el pago que falta.
 *       <ul>
 *         <li>{@link #SIN_SENIAR} — una inscripción PREINSCRIPTA (`V30`). Tiene
 *             su propio plazo, {@code vence_preinscripcion}; pasado, es
 *             <i>vencida</i> y avisa — pero no se cancela sola (P61).
 *         <li>{@link #FALTA_EL_RESTO} — una inscripción ACTIVA con saldo.
 *             <b>Sin reloj, nunca vencida</b>: el saldo de un programa se paga
 *             antes de empezar y no tiene fecha (P72).
 *         <li>{@link #RESERVA_A_SALDAR} — una reserva con precio (`V33`) que
 *             ocupa su franja, con saldo. Sin reloj: la seña ya la sostiene.
 *         <li>{@link #TRABAJO_A_COBRAR} — un trabajo de M&M <b>entregado</b>
 *             con saldo (P84: antes de entregar no es deuda). El reloj lo lleva
 *             el scheduler, que lo marca DEBE a los 7 días.
 *         <li>{@link #VENTA_A_COBRAR} — una venta no anulada con saldo.
 *       </ul>
 * </ul>
 */
public enum MotivoDeDeuda {
    DEUDA_ANOTADA,
    SIN_SENIAR,
    FALTA_EL_RESTO,
    RESERVA_A_SALDAR,
    TRABAJO_A_COBRAR,
    VENTA_A_COBRAR
}
