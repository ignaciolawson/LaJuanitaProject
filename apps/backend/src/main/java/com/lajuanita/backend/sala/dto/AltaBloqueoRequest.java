package com.lajuanita.backend.sala.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Sacar una sala de servicio por un rango de fechas.
 *
 * <p><b>Las horas son opcionales y significan "el día entero"</b> cuando no
 * vienen. Es el caso principal —"la Sala 2 está en refacción toda la semana"— y
 * obligar a escribir 00:00 y 23:59 para decir eso es pedirle a Micaela que
 * traduzca. Los valores son los mismos DEFAULT que `V1` le puso a la tabla.
 *
 * <p>El {@code motivo} es obligatorio en la base, y también acá: un bloqueo sin
 * motivo es una sala que nadie sabe por qué no se puede usar.
 */
public record AltaBloqueoRequest(

        @NotNull(message = "Elegí la sala.")
        Long idSala,

        @NotNull(message = "Poné desde qué día.")
        LocalDate fechaInicio,

        @NotNull(message = "Poné hasta qué día.")
        LocalDate fechaFin,

        /** Vacío = desde que abre. */
        LocalTime horaInicio,

        /** Vacío = hasta que cierra. */
        LocalTime horaFin,

        @NotBlank(message = "Escribí por qué se bloquea la sala.")
        String motivo) {

    @AssertTrue(message = "La fecha de fin no puede ser anterior a la de inicio.")
    public boolean isRangoDeFechasValido() {
        return fechaInicio == null || fechaFin == null || !fechaFin.isBefore(fechaInicio);
    }

    /**
     * <p>A diferencia de DB-11 en {@code reserva}, acá la base <b>sí</b> sabe
     * explicarse: `V7` escribió las columnas generadas con un CASE que devuelve
     * NULL en vez de explotar, para que el CHECK {@code bloqueo_rango_horas_valido}
     * llegue a evaluarse. Esto se adelanta al viaje y, sobre todo, marca el campo
     * — un 409 sin nombre de campo no pinta ningún input de rojo.
     */
    @AssertTrue(message = "La hora de fin tiene que ser posterior a la de inicio.")
    public boolean isHorarioValido() {
        return horaInicio == null || horaFin == null || horaFin.isAfter(horaInicio);
    }
}
