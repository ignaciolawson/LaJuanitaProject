package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.tablero.LineaDeNegocio.Grupo;

/**
 * Cuántos pagos y cuánta plata hay en una línea de negocio, para la barra de
 * solapas de la pantalla de pagos (`mejoras.md` §13 · B2).
 *
 * <p><b>Los dos números son distintos a propósito y no se pueden fusionar.</b>
 * {@code cantidad} son las filas que el listado va a mostrar con esos filtros;
 * {@code entraron} es, de ésas, la plata que efectivamente entró. Una deuda
 * anotada y un pago anulado cuentan en el primero y no en el segundo, que es
 * justo lo que {@code EstadoPago.ENTRARON} existe para separar — y la caja de
 * este sistema ya pagó una vez por confundirlos.
 *
 * <p>Viene una fila por línea <b>y por moneda</b>: un contrato en pesos con un
 * pago en dólares no se suma, son dos cajas. La pantalla los muestra al lado,
 * nunca sumados.
 *
 * <p>{@code linea} viaja como texto y no como enum porque lo escribe
 * {@code LineaDeNegocio.EXPRESION}, que es SQL: convertirlo acá obligaría a este
 * record a saber que del otro lado hay un {@code CASE}.
 *
 * <p>⚠️ <b>{@code grupo} viaja calculado, y no es redundante.</b> La barra de
 * solapas tiene que sumar estas filas por grupo, y si el mapa línea→solapa
 * viviera también en el front sería la copia que §12 · B1 vino a evitar — con una
 * consecuencia silenciosa: una solapa mostrando un número que no coincide con lo
 * que lista, porque cuenta con un mapa y filtra con el otro. Acá lo dice
 * {@link Grupo#de(String)}, que es el mismo que arma el filtro.
 */
public record TotalDeLinea(
        String linea,
        Grupo grupo,
        Moneda moneda,
        long cantidad,
        BigDecimal entraron) {
}
