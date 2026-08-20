package com.lajuanita.backend.mastering.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Cobrar un trabajo, desde su propia pantalla.
 *
 * <p><b>Existe para no mandar a nadie a `/admin/pagos`</b>, que hoy solo salda
 * inscripciones: cobrar un trabajo desde ahí implicaba rehacer ese formulario
 * entero. Es la misma forma que ya usan la seña de una reserva y el cobro de una
 * venta — el pedido lo recibe este módulo y el {@code Pago} lo escribe
 * {@code PagoService}, que es donde viven las reglas de la plata.
 *
 * <p><b>El monto viaja y no se toma del precio acordado</b>, a diferencia de la
 * venta: M&M es el único servicio que puede quedar en debe (§3), así que un cobro
 * parcial es un caso real y no una rareza. Lo que no se puede es cobrar sin decir
 * cuánto.
 *
 * <p>{@code idUsuario} es obligatorio y no sale del trabajo: {@code pago.id_usuario}
 * es NOT NULL, y <b>la mitad de los clientes de M&M no tienen cuenta</b>. Un
 * trabajo de un cliente externo se cobra a nombre de quien lo recibió — la pantalla
 * lo dice antes de dejar mandar el pedido, en vez de armar un request que la base
 * va a rechazar.
 */
public record CobroRequest(

        @NotNull(message = "Decí a nombre de quién queda el pago.")
        Long idUsuario,

        @NotNull(message = "Poné el monto.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se pagó.")
        MedioPago medioPago) {
}
