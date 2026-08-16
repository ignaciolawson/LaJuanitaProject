package com.lajuanita.backend.pago;

import java.util.Set;

/**
 * Estado de un pago. Coincide con el CHECK {@code pago_estado_valido}.
 *
 * <p><b>Una fila de `pago` no es siempre plata que entró.</b> `DEBE` y `VENCIDO`
 * son la deuda anotada — el pago que se espera y no llegó—, y `ANULADO` es el
 * que entró y se dio de baja. Confundirlos con los otros dos es la forma de que
 * la caja mienta, así que la separación vive en {@link #ENTRARON} y no en cada
 * consulta.
 *
 * <p>{@link #SENADO} es la seña: el 50% del total pagado por adelantado (§13).
 * Cuenta como plata que entró, porque entró.
 */
public enum EstadoPago {

    /** La seña. Plata real, contra un total que todavía no se completó. */
    SENADO,

    /** Cobrado y cerrado. */
    PAGADO,

    /** Anotado como deuda: se esperaba y no llegó. */
    DEBE,

    /** Deuda que además pasó los 7 días (§6, alerta automática). */
    VENCIDO,

    /**
     * Dado de baja. `V7` exige autor, fecha y motivo — anular saca el monto del
     * balance, que para la caja es lo mismo que borrarlo.
     */
    ANULADO;

    /**
     * Los estados que <b>suman a la caja</b>.
     *
     * <p>Mismo papel que {@code EstadoReserva.OCUPAN_LA_SALA}: se define una vez
     * y la usan todas las consultas de dinero. Se escribe por lo que queda
     * afuera —la deuda y lo anulado— porque es como se piensa la regla.
     */
    public static final Set<EstadoPago> ENTRARON = Set.of(SENADO, PAGADO);

    /** Lo que alguien todavía debe. Es la pantalla de deudores. */
    public static final Set<EstadoPago> ADEUDADOS = Set.of(DEBE, VENCIDO);

    public boolean entro() {
        return ENTRARON.contains(this);
    }
}
