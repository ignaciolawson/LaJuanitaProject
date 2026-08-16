package com.lajuanita.backend.pago;

/**
 * Cómo entró la plata. Coincide con el CHECK {@code pago_medio_valido}.
 *
 * <p>{@link #PAYPAL} y {@link #CUENTA_EEUU} no son decoración: el relevamiento
 * dice que a los alumnos del exterior se les cobra por esas dos vías, y son
 * justamente las que hoy viven fuera del Excel.
 */
public enum MedioPago {
    EFECTIVO,
    TRANSFERENCIA,
    PAYPAL,
    CUENTA_EEUU,
    OTRO
}
