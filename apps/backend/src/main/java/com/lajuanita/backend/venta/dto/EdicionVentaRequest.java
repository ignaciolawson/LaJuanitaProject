package com.lajuanita.backend.venta.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Corregir una venta ya cargada (Ignacio, 2026-10-19: *"hoy solo se puede
 * anular"*).
 *
 * <p>Los mismos campos que {@link AltaVentaRequest} <b>menos {@code medioPago}</b>:
 * el cobro no se edita desde acá. Una venta se cobra al darla de alta y ese pago
 * se corrige —o se anula— desde Pagos, que es donde viven sus reglas.
 *
 * <p>⚠️ Viajan todos los campos y no solo los que cambiaron, como en el resto de
 * las ediciones del sistema: el formulario manda la fila entera.
 */
public record EdicionVentaRequest(
        Long idUsuarioComprador,

        @Size(max = 150, message = "El nombre no puede pasar de 150 caracteres.")
        String nombreCompradorExterno,

        @Size(max = 150, message = "El contacto no puede pasar de 150 caracteres.")
        String contactoCompradorExterno,

        @NotNull(message = "Decí quién hizo la venta.")
        Long idUsuarioVendedor,

        @Size(max = 50, message = "La categoría no puede pasar de 50 caracteres.")
        String categoria,

        @Size(max = 100, message = "La marca no puede pasar de 100 caracteres.")
        String marca,

        @NotBlank(message = "Poné el modelo del equipo.")
        @Size(max = 150, message = "El modelo no puede pasar de 150 caracteres.")
        String modeloEquipo,

        @NotNull(message = "Poné el precio.")
        @Positive(message = "El precio tiene que ser mayor a cero.")
        BigDecimal precio,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Poné la fecha de la venta.")
        LocalDate fechaVenta,

        String notas) {

    @AssertTrue(message = "Decí quién compró: elegí una cuenta o escribí el nombre.")
    public boolean isCompradorIdentificado() {
        return idUsuarioComprador != null
                || (nombreCompradorExterno != null && !nombreCompradorExterno.isBlank());
    }

    @AssertTrue(message = "Una venta en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }
}
