package com.lajuanita.backend.solicitante;

/**
 * En qué quedó una ficha del buzón. Espeja el CHECK {@code solicitante_estado_valido}.
 *
 * <p><b>No hay un estado "leído"</b>, y eso es lo que separa este buzón de una
 * bandeja de notificaciones: lo que la ficha tiene que registrar no es que alguien
 * la vio sino <b>qué se hizo con ella</b>. Un "leído" habría dejado exactamente el
 * agujero que §9.4 quiso cerrar — la ficha sale de la lista de pendientes sin que
 * nadie haya llamado a nadie.
 *
 * <p>⚠️ <b>Y hasta `V27` tampoco había un estado que dijera la verdad</b>, que es
 * el agujero que esa migración vino a cerrar. Existía {@code CONVERTIDO} —"se le
 * creó la cuenta"— y se usaba como si fuera terminal. No lo era: cuando alguien
 * apretaba ese botón la persona seguía sin su reserva, y la ficha ya se había ido
 * de la lista. <b>Crear la cuenta no es atender la ficha</b> (P54, P55).
 *
 * <p><b>Una vez que sale de {@link #PENDIENTE} no vuelve</b>, y no lo sostiene este
 * enum sino el trigger de `V20` §2 —la misma función de `V13`—: el esquive era
 * atender, volver la ficha a pendiente y atenderla de nuevo, con dos cuentas para
 * la misma persona.
 */
public enum EstadoSolicitante {

    /**
     * Nadie la atendió todavía. Es el único estado editable.
     *
     * <p>⚠️ <b>Una ficha pendiente PUEDE tener cuenta.</b> Desde `V27` crear la
     * cuenta no cambia el estado —es una comodidad para el cliente, no la
     * resolución del pedido (P54)— así que {@code id_usuario} y {@code PENDIENTE}
     * conviven. Es exactamente lo que el CHECK
     * {@code solicitante_convertido_tiene_cuenta} prohibía y por eso se eliminó.
     */
    PENDIENTE,

    /**
     * Produjo lo que le pedían: una reserva, una inscripción o una venta.
     *
     * <p><b>El estado no se escribe solo: viaja con la FK de lo que se produjo</b>,
     * y el CHECK {@code solicitante_atendido_produjo_algo} lo exige en los dos
     * sentidos. Esa FK es la trazabilidad —dentro de tres meses se abre la ficha y
     * se ve <i>cuál</i> reserva salió de ella, no un tilde— y es lo que hace que
     * la ficha se cierre sola, sin un botón que alguien pueda olvidarse de
     * apretar.
     */
    ATENDIDO,

    /**
     * No prosperó, y `V20` obliga a decir por qué. Es spam, o alguien que no
     * contestó, o alguien que se arrepintió — tres cosas que se ven iguales sin el
     * motivo escrito y que llevan a decisiones opuestas.
     *
     * <p>Es también la salida de lo que <b>nunca va a producir nada</b>: una
     * consulta general ({@code OTRO}) se contesta y se cierra por acá, porque no
     * hay reserva ni inscripción que apuntar.
     */
    DESCARTADO
}
