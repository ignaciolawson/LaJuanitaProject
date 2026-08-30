package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Corregir un pago mal cargado (`mejoras.md` §9.3).
 *
 * <p><b>Hasta `V19` la única salida era anular y recargar</b>, que es la del
 * Módulo 3 para ventas y egresos. Ignacio pidió edición directa, y la base nunca
 * la había prohibido: `V6` §7 bloquea el DELETE, no el UPDATE. Lo que faltaba era
 * la condición con la que se abre, y es la de `V7` §2 — <b>queda firmado quién lo
 * hizo</b>. El argumento es el mismo que allá: si cambiar un PRESENTE por un
 * AUSENTE decide cuántas clases le quedan a un alumno, cambiar un monto decide la
 * caja.
 *
 * <h2>Lo que NO se edita, y por qué</h2>
 *
 * <p><b>Ni quién pagó ni qué salda.</b> No es una omisión: esos dos campos son la
 * identidad del pago, y hay tres reglas del esquema colgadas de ellos —
 * {@code V10}/{@code V11}/{@code V12} (la seña que respalda una reserva),
 * {@code V6} §6 (el pago que sostiene un premaster liberado) y el estado de cuenta
 * de una persona. Moverlos convierte la fila en <i>otro</i> pago, y para eso ya
 * existe el camino correcto: anular y volver a cargar, que deja las dos filas y la
 * explicación de por qué.
 *
 * <p><b>Tampoco {@code estadoPago}.</b> La anulación tiene su propio endpoint y su
 * propia regla, más exigente que esta ({@code pago_anulacion_justificada} pide
 * autor, fecha <i>y</i> motivo escrito). Dos caminos hacia la misma transición, con
 * distinta exigencia, es como se termina anulando sin motivo.
 */
public record EdicionPagoRequest(

        @Size(max = 200, message = "El concepto no puede pasar de 200 caracteres.")
        String concepto,

        @NotNull(message = "Poné el monto.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se pagó.")
        MedioPago medioPago,

        @DecimalMin(value = "0", message = "El descuento no puede ser negativo.")
        @DecimalMax(value = "100", message = "El descuento es un porcentaje: no puede pasar de 100.")
        BigDecimal descuentoPorcentaje,

        String motivoDescuento,

        @NotNull(message = "Poné la fecha del pago.")
        LocalDate fechaPago) {

    /** Espeja {@code pago_usd_con_cotizacion}: sin ella el importe no se reconstruye. */
    @AssertTrue(message = "Un pago en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }

    /** Espeja {@code pago_descuento_justificado}: todo descuento se explica por escrito. */
    @AssertTrue(message = "Un descuento necesita una justificación escrita.")
    public boolean isDescuentoJustificado() {
        return descuentoPorcentaje == null
                || descuentoPorcentaje.signum() == 0
                || (motivoDescuento != null && !motivoDescuento.isBlank());
    }
}
