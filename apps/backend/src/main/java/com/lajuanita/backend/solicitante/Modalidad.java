package com.lajuanita.backend.solicitante;

/**
 * Cómo quiere cursar quien pide un programa (`V29`, P67).
 *
 * <p><b>Es un dato de la ficha y no de la reserva.</b> En este sistema toda
 * clase es una {@code reserva} en una {@code sala}, y una sesión virtual se
 * carga igual en la sala desde donde el profesor la da — que es lo que pasa en
 * la realidad. Esta columna sólo le dice a quien inscribe lo que la persona
 * eligió; si alguna vez hace falta una sala "Virtual" sin exclusión de
 * solapamiento, eso se decide aparte (P67 ⏳).
 *
 * <p>Los valores son los del CHECK {@code solicitante_modalidad_valida}.
 */
public enum Modalidad {

    /** En Pilar. */
    PRESENCIAL,

    /** En vivo, conectado. */
    VIRTUAL
}
