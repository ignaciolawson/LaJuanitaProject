package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Registrar un pago (§6, pantalla 1).
 *
 * <p>Las cuatro reglas que este record repite de la base <b>no son
 * redundancia</b>: un CHECK rechaza con un 409 sin nombre de campo, y estos
 * formularios pintan de rojo el input que está mal. La base sigue siendo la que
 * manda — es defensa en profundidad, no reemplazo.
 */
public record AltaPagoRequest(

        @NotNull(message = "Decí de quién es el pago.")
        Long idUsuario,

        // -- Qué salda: exactamente uno de los cuatro ------------------------
        Long idInscripcion,
        Long idReserva,
        Long idTrabajoMastering,
        Long idVentaEquipo,

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

        /** Porcentaje 0–100, no un importe. Vacío = sin descuento. */
        @DecimalMin(value = "0", message = "El descuento no puede ser negativo.")
        @DecimalMax(value = "100", message = "El descuento es un porcentaje: no puede pasar de 100.")
        BigDecimal descuentoPorcentaje,

        String motivoDescuento,

        /** Vacío = PAGADO. `SENADO` es la seña; `DEBE` anota una deuda. */
        EstadoPago estadoPago,

        /** Vacío = hoy. Puede ser anterior: la carga y el hecho son dos fechas. */
        LocalDate fechaPago,

        @Size(max = 500)
        String comprobantePath) {

    /**
     * <b>Un pago salda una cosa, exactamente.</b> Espeja {@code pago_tiene_destino}.
     *
     * <p>El CHECK pasó de {@code >= 1} a {@code = 1} en `V1` por una razón
     * concreta: apuntando a la vez a una inscripción y a una venta, el monto se
     * contaba dos veces en los reportes por línea de negocio. Si alguien paga dos
     * servicios juntos, son dos filas.
     */
    @AssertTrue(message = "Un pago tiene que saldar una cosa, y solo una.")
    public boolean isDestinoUnico() {
        return cuantosDestinos() == 1;
    }

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

    /**
     * <b>Un pago no se carga ya anulado.</b> No hay CHECK que lo impida —
     * {@code pago_anulacion_justificada} solo exige las tres firmas—, pero el
     * alta no tiene de dónde sacarlas: el autor y la fecha los pone el servidor
     * al anular, y para eso está {@code PATCH /{id}/anulacion}. Sin esto, un alta
     * con {@code ANULADO} moría con un 409 de constraint en vez de decir qué
     * hacer.
     */
    @AssertTrue(message = "Un pago no se registra anulado: se registra y después se anula.")
    public boolean isEstadoDeAltaValido() {
        return estadoPago != EstadoPago.ANULADO;
    }

    private int cuantosDestinos() {
        int cuantos = 0;
        if (idInscripcion != null) cuantos++;
        if (idReserva != null) cuantos++;
        if (idTrabajoMastering != null) cuantos++;
        if (idVentaEquipo != null) cuantos++;
        return cuantos;
    }
}
