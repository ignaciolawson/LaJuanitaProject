package com.lajuanita.backend.solicitud;

/**
 * En qué quedó un pedido de mover una clase.
 *
 * <p>Los tres valores son los del CHECK {@code solicitud_estado_valido} de `V1`.
 *
 * <p><b>No hay CANCELADA, al revés que {@link EstadoSolicitud}</b>, y eso no es
 * un olvido de este enum: la tabla no la acepta desde `V1` y agregarla es una
 * migración. Se dejó afuera porque el alcance nunca la pidió y porque la salida
 * existe igual — el que se arrepiente avisa y administración rechaza el pedido,
 * que además deja escrito el motivo. Si alguna vez se agrega, va con el mismo
 * argumento con el que la tiene {@code solicitud_reserva}: el que se arrepiente
 * cancela, y cancelar deja registro.
 *
 * <p><b>Una vez que sale de {@link #PENDIENTE} no vuelve</b>, y eso sí lo
 * sostiene la base: el trigger {@code solicitud_reprogramacion_resuelta_es_final}
 * que `V13` le puso a esta tabla <b>antes de que existiera nadie que escribiera
 * en ella</b>. Acá llega su primer escritor.
 */
public enum EstadoReprogramacion {

    /** Esperando que administración la mire. Es el único estado editable. */
    PENDIENTE,

    /** Administración movió la clase. La reserva es la misma, en otro horario. */
    APROBADA,

    /** Administración dijo que no, y la respuesta dice por qué. */
    RECHAZADA
}
