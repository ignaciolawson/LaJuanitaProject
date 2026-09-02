package com.lajuanita.backend.reserva.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * La otra forma de que una reserva nazca: <b>apartada, con la deuda anotada</b>
 * (`mejoras.md` §13 · C1, `platform.md` §19).
 *
 * <p>Ignacio: <i>"que cuando le llegue la solicitud ponga confirmar sala, el
 * monto, todo, pero que no sea ahí cuando se cobra. Como que 'preconfirma' la
 * reserva. Como ese usuario todavía no pagó iría a la pestaña de DEUDORES hasta
 * que el admin sí cobre."</i>
 *
 * <p><b>Tiene la misma forma que {@link AltaSenaRequest} y no es la misma cosa</b>,
 * y por eso son dos records y no uno con una bandera:
 *
 * <ul>
 *   <li>Allá {@code medioPago} es <b>cómo se pagó</b>; acá es <b>cómo se espera
 *       cobrar</b>. La columna de la base es la misma porque
 *       {@code pago.medio_pago} es NOT NULL, pero lo que la fila afirma es
 *       distinto.
 *   <li>Allá el pago nace {@code SENADO} —plata que entró— y acá {@code DEBE},
 *       que es deuda anotada. Es la diferencia entera entre las dos altas.
 *   <li>Un {@code boolean yaCobre} sobre un solo record dejaría que la misma
 *       estructura signifique dos cosas según un campo, que es exactamente lo que
 *       este sistema evita en los endpoints.
 * </ul>
 *
 * <p><b>El plazo no viaja acá.</b> Lo calcula el servidor —el menor entre 24hs y
 * el inicio de la reserva (P44)— porque un vencimiento que el cliente pudiera
 * dictar no es un plazo, es una sugerencia. Mismo criterio que la firma de la baja
 * de nivel en {@code Inscripcion}.
 */
public record AltaPreconfirmacionRequest(

        /**
         * Quién va a pagar. Sigue haciendo falta una cuenta: la deuda tiene que
         * aparecer en el estado de cuenta de alguien y en la pantalla de deudores,
         * y eso es lo que hace que la prereserva se pueda reclamar.
         */
        @NotNull(message = "Decí quién va a pagar.")
        Long idUsuario,

        @NotNull(message = "Poné el monto que hay que abonar.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se va a cobrar.")
        MedioPago medioPago,

        /**
         * Lo que se le dice a quien pidió la sala.
         *
         * <p>Viaja hasta la notificación, así que tiene que poder leerse solo: no
         * hay mail ni WhatsApp detrás, la notificación <b>es</b> el canal. Mismo
         * criterio que el motivo de un rechazo.
         */
        String mensaje) {

    /** Espeja {@code pago_usd_con_cotizacion}: sin ella el importe no se reconstruye. */
    @AssertTrue(message = "Un importe en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }
}
