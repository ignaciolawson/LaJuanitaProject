package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Módulo 3, pantalla 3 — la caja de un período, <b>por moneda y separadas</b>.
 *
 * <p>§2.3 lo pide así y no es una preferencia contable: unificar exigiría elegir
 * una cotización y el total resultante no correspondería a ninguna caja que
 * exista. Ghezz cobra a los del exterior por PayPal y por una cuenta en Estados
 * Unidos; esa plata no está en el mismo cajón que los pesos.
 *
 * <p>Los egresos entran acá porque la pregunta *"¿cuánto quedó?"* no se contesta
 * con los ingresos solos, que es exactamente lo que hoy obliga a cruzar el Excel
 * con el Notion a mano.
 */
public record CajaDelPeriodo(
        String moneda,

        BigDecimal ingresos,
        BigDecimal egresos,
        /** Ingresos menos egresos. Puede ser negativo, y tiene que poder serlo. */
        BigDecimal neto,

        /** Lo anotado como deuda en el período. No suma al neto: todavía no entró. */
        BigDecimal adeudado,

        long cantidadDePagos,
        long cantidadDeEgresos,

        /** Cuánto entró por cada vía. Es la conciliación contra el banco y la caja chica. */
        List<PorMedioDePago> porMedio) {

    public record PorMedioDePago(String medioPago, BigDecimal monto, long cantidad) {
    }
}
