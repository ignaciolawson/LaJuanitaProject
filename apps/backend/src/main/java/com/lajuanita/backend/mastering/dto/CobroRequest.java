package com.lajuanita.backend.mastering.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

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
 * <p><b>No trae a nombre de quién ni en qué moneda, y las dos ausencias son la
 * §20.</b> El pago va a nombre del cliente del trabajo —con cuenta o a nombre
 * escrito, `V19`— porque el trabajo ya lo identifica (P78): hasta esta barrida el
 * request traía un {@code idUsuario} obligatorio y tres trabajos de clientes
 * externos quedaron cobrados a nombre de tres empleados. Y va en la moneda del
 * trabajo (P81, `V32`), así que tampoco hay moneda que elegir; lo que sí puede
 * hacer falta es la cotización, si el trabajo es en dólares.
 */
public record CobroRequest(

        @NotNull(message = "Poné el monto.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        /** Obligatoria si el trabajo es en USD: lo exige {@code pago_usd_con_cotizacion}. */
        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se pagó.")
        MedioPago medioPago,

        /** Vacío = hoy. Puede ser anterior: la carga y el hecho son dos fechas. */
        LocalDate fechaPago) {
}
