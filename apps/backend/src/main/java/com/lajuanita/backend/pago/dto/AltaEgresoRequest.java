package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Registrar un egreso (§6, pantalla 5).
 *
 * <p>El {@code concepto} es obligatorio en la base y también acá: es la regla
 * dura *"todo egreso queda con usuario, fecha y motivo"*. El usuario y la fecha
 * los pone el servidor; el motivo es esto.
 */
public record AltaEgresoRequest(

        @NotNull(message = "Poné el monto.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotBlank(message = "Escribí a qué corresponde el egreso.")
        @Size(max = 200, message = "El concepto no puede pasar de 200 caracteres.")
        String concepto,

        /** Texto libre: casi siempre un proveedor sin cuenta en el sistema. */
        @Size(max = 150)
        String destinatario,

        /** Solo cuando el egreso es el pago a alguien que sí tiene cuenta. */
        Long idUsuarioDestino,

        /** Vacío = hoy. */
        LocalDate fechaEgreso,

        @Size(max = 500)
        String comprobantePath) {

    @AssertTrue(message = "Un egreso en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }
}
