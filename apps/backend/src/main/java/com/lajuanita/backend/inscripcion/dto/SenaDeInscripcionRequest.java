package com.lajuanita.backend.inscripcion.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * La seña de un programa, <b>en el mismo pedido que la inscripción</b> (P59,
 * `V30`, §16 · Fase 6).
 *
 * <p>Es {@code AltaSenaRequest} sin el pagador: acá se sabe quién paga —el
 * alumno que se inscribe, que tiene cuenta porque tiene fila en {@code alumno}—
 * así que pedirlo sería un campo que puede contradecir al otro.
 *
 * <p><b>Con seña la inscripción nace ACTIVA</b> y el pago entra como
 * {@code SENADO} apuntándole; <b>sin seña nace PREINSCRIPTA</b> con 24 horas
 * para pagarla (P72). Los dos entran en una transacción: una inscripción activa
 * cuyo pago falló es exactamente lo que la escalera de `V30` existe para no
 * permitir por otro camino.
 *
 * <p><b>El monto se escribe a mano</b> y la pantalla lo prellena con el 50% del
 * precio: la base sostiene <i>que haya plata cobrada</i>, no que sea la mitad —
 * el precio puede haberse acordado distinto al del catálogo, y la seña la cobra
 * una persona. Es el mismo reparto que `V10` con la reserva.
 */
public record SenaDeInscripcionRequest(

        @NotNull(message = "Poné el monto de la seña.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se pagó.")
        MedioPago medioPago) {

    /** Espeja {@code pago_usd_con_cotizacion}: sin ella el importe no se reconstruye. */
    @AssertTrue(message = "Un pago en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }
}
