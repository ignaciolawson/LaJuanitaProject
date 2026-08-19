package com.lajuanita.backend.solicitud.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Aprobar una solicitud del portal: la reserva nace acá, y nace con su seña.
 *
 * <p><b>La seña es obligatoria y no es una decisión de esta clase</b>, es la de
 * `V10`: un alquiler o una grabación no tienen inscripción que los cubra, así que
 * su único camino de dinero es un {@code pago} apuntando a la reserva. Sin él, el
 * COMMIT rechaza la reserva y la aprobación entera se cae. Exigirla en el DTO es
 * que el error salga en el formulario y no como un 409 al cerrar la transacción.
 *
 * <p>Y es la razón entera de que este circuito exista: el usuario no puede poner
 * plata en el sistema, así que la pone quien cobra, en el momento de aprobar.
 *
 * <p><b>Por qué no reusa {@code AltaSenaRequest}, que tiene estos mismos cuatro
 * campos.</b> Porque ese lleva un quinto, {@code idUsuario}, y acá <b>quién paga
 * no lo elige el que aprueba</b>: es el que pidió, siempre. Aceptarlo por el
 * cuerpo sería dejar acreditar la seña de uno contra la cuenta de otro, y el
 * único que sabe quién pidió es el servidor. Es la misma razón por la que
 * {@code AltaSenaRequest} no tiene {@code idReserva} — <b>lo que decide el
 * servidor no viaja en el pedido</b>, ni siquiera para ser ignorado después.
 *
 * <p><b>Lo que tampoco se puede es aprobar "pero en otro horario".</b> La reserva
 * se crea exactamente con la sala, la fecha y las horas que se pidieron; acá solo
 * viaja la plata y, si hace falta, una respuesta. Si la franja no sirve, se
 * rechaza diciendo por qué y la persona pide de nuevo — así lo aprobado es
 * siempre lo que alguien pidió, y no algo que nadie eligió.
 */
public record AprobacionRequest(

        @NotNull(message = "Poné el monto de la seña.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se pagó.")
        MedioPago medioPago,

        /** Opcional: la respuesta de una aprobación es la reserva misma. */
        String respuesta) {

    /** Espeja {@code pago_usd_con_cotizacion}: sin ella el importe no se reconstruye. */
    @AssertTrue(message = "Un pago en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }
}
