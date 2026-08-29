package com.lajuanita.backend.solicitante;

/**
 * En qué quedó una ficha del buzón.
 *
 * <p>Los tres valores son los del CHECK de `V20`. <b>No hay un estado "leído"</b>,
 * y eso es lo que separa este buzón de una bandeja de notificaciones: lo que la
 * ficha tiene que registrar no es que alguien la vio sino <b>qué se hizo con
 * ella</b>. Un "leído" habría dejado exactamente el agujero que §9.4 quiso
 * cerrar — la ficha sale de la lista de pendientes sin que nadie haya llamado a
 * nadie.
 *
 * <p><b>Una vez que sale de {@link #PENDIENTE} no vuelve</b>, y no lo sostiene
 * este enum sino el trigger de `V20` §2 —la misma función de `V13`—: el esquive
 * era convertir, volver la ficha a pendiente y convertirla de nuevo, con dos
 * cuentas para la misma persona.
 */
public enum EstadoSolicitante {

    /** Nadie la contestó todavía. Es el único estado editable. */
    PENDIENTE,

    /**
     * La persona ya está adentro del sistema: se le creó la cuenta, o ya la
     * tenía. Desde acá administración le carga la inscripción, la reserva o la
     * venta en las pantallas que ya existen.
     */
    CONVERTIDO,

    /**
     * No prosperó, y `V20` obliga a decir por qué. Es spam, o alguien que no
     * contestó, o alguien que se arrepintió — tres cosas que se ven iguales sin
     * el motivo escrito y que llevan a decisiones opuestas.
     */
    DESCARTADO
}
