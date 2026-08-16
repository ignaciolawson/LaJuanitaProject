package com.lajuanita.backend.reserva.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/**
 * Edición de una reserva ya cargada: moverla de sala, de día o de horario, o
 * asignarle un profesor.
 *
 * <p><b>Quién la edita no viene de acá</b>: sale del token. `V7` rechaza el
 * UPDATE que toque estado, fecha, horas o sala si no se declara el autor, y un
 * autor que el cliente pudiera elegir no sirve de auditoría.
 *
 * <p>Mover una reserva dispara dos reglas más de la base que conviene tener
 * presentes: la sala nueva no puede estar ocupada ni bloqueada en ese horario, y
 * ninguno de sus participantes puede estar en otra sala a esa hora (`V9` §1) —
 * ese último es el camino que se olvida, porque no se toca
 * {@code reserva_participante} y sin embargo rompe la regla.
 */
public record EdicionReservaRequest(

        @NotNull(message = "Elegí la sala.")
        Long idSala,

        @NotNull(message = "Elegí para qué se usa la sala.")
        Long idTipoUso,

        Long idProfesor,

        @NotNull(message = "Poné la fecha.")
        LocalDate fecha,

        @NotNull(message = "Poné la hora de inicio.")
        LocalTime horaInicio,

        @NotNull(message = "Poné la hora de fin.")
        LocalTime horaFin,

        String notas) {

    /** Ver {@link AltaReservaRequest#isHorarioValido()} — es la regla DB-11. */
    @AssertTrue(message = "La hora de fin tiene que ser posterior a la de inicio.")
    public boolean isHorarioValido() {
        return horaInicio == null || horaFin == null || horaFin.isAfter(horaInicio);
    }
}
