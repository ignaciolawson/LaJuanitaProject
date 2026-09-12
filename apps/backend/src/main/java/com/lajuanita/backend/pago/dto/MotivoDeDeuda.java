package com.lajuanita.backend.pago.dto;

/**
 * Por qué alguien figura en Deudores (P72).
 *
 * <p>Deudores tiene <b>dos fuentes</b> desde la §16 · Fase 6, y esta etiqueta es
 * lo que las distingue en la pantalla y en el scheduler:
 *
 * <ul>
 *   <li>{@link #DEUDA_ANOTADA} — una fila de {@code pago} en DEBE/VENCIDO, como
 *       siempre. Tiene reloj: a los 7 días es <i>vencida</i> y avisa.
 *   <li>{@link #SIN_SENIAR} — una inscripción PREINSCRIPTA (`V30`). Tiene su
 *       propio plazo, {@code vence_preinscripcion}; pasado, es <i>vencida</i> y
 *       avisa — pero no se cancela sola (P61).
 *   <li>{@link #FALTA_EL_RESTO} — una inscripción ACTIVA con
 *       {@code cobrado < precio_total}. <b>Sin reloj, nunca vencida</b>: el saldo
 *       de un programa se paga antes de empezar y no tiene fecha (P72).
 * </ul>
 *
 * <p>Las dos últimas <b>se calculan desde la inscripción</b>, nunca se anotan
 * como {@code pago}: una fila DEBE por el saldo diría <i>"Deuda vencida"</i> a la
 * semana para alguien que arranca en tres — el ruido exacto que P72 prohíbe.
 */
public enum MotivoDeDeuda {
    DEUDA_ANOTADA,
    SIN_SENIAR,
    FALTA_EL_RESTO
}
