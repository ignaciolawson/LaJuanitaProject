package com.lajuanita.backend.solicitud;

/**
 * En qué quedó una solicitud del portal.
 *
 * <p>Los cuatro valores son los del CHECK de `V13`, y el que sobresale es
 * {@link #CANCELADA}: es la salida del que se arrepiente, y existe porque una
 * solicitud <b>no se borra</b> — el trigger de borrado lo impide, igual que en
 * las tablas de plata y de historial. Cancelar deja registro; borrar se lleva
 * puesta la única prueba de que alguien pidió algo.
 *
 * <p><b>Una vez que sale de {@link #PENDIENTE} no vuelve</b>, y eso no lo
 * sostiene este enum sino un trigger (`V13` §4): el esquive era aprobar —con lo
 * que nace una reserva con su seña—, devolver la solicitud a pendiente y
 * aprobarla de nuevo.
 */
public enum EstadoSolicitud {

    /** Esperando que administración la mire. Es el único estado editable. */
    PENDIENTE,

    /** Administración la aprobó: existe la reserva, con su seña. */
    APROBADA,

    /** Administración dijo que no, y `V13` la obliga a decir por qué. */
    RECHAZADA,

    /** El que pidió se arrepintió antes de que la resolvieran. */
    CANCELADA
}
