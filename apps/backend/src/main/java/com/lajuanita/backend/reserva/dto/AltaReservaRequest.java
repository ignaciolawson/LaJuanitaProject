package com.lajuanita.backend.reserva.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/**
 * Alta de una reserva: un bloque de tiempo en una sala.
 *
 * <p>Sin participantes: se agregan después, uno por uno, porque una clase puede
 * ser grupal y cada uno trae su propia inscripción. Cargar la reserva y anotar a
 * la gente son dos gestos distintos también en la pantalla.
 *
 * <p><b>Las clases de un curso se cargan a mano, de a una</b> (P7, decidido el
 * 2026-08-16). Se evaluó que el sistema generara las ocho semanales al inscribir
 * y se descartó.
 */
public record AltaReservaRequest(

        @NotNull(message = "Elegí la sala.")
        Long idSala,

        @NotNull(message = "Elegí para qué se usa la sala.")
        Long idTipoUso,

        /** Opcional (P37): se puede cargar la clase antes de saber quién la da. */
        Long idProfesor,

        @NotNull(message = "Poné la fecha.")
        LocalDate fecha,

        @NotNull(message = "Poné la hora de inicio.")
        LocalTime horaInicio,

        @NotNull(message = "Poné la hora de fin.")
        LocalTime horaFin,

        String notas,

        /**
         * La reserva que esta reemplaza, cuando es una recuperación. Ninguna
         * clase se pierde (P2): la vieja queda REPROGRAMADA y esta la apunta.
         */
        Long idReservaRecupera,

        String motivoReprogramacion) {

    /**
     * <b>Esta es la regla DB-11</b>, y por eso está acá y no en la base.
     *
     * <p>{@code reserva.periodo} es una columna generada que se computa
     * <b>antes</b> que los CHECK de la fila. Con las horas invertidas,
     * {@code tsrange(20:00, 19:00)} lanza <i>"range lower bound must be less than
     * or equal to range upper bound"</i> — un error de dato, sin nombre de
     * constraint, que {@code ManejadorDeErrores} no puede traducir a nada útil. El
     * CHECK {@code reserva_horas_validas} que diría la frase correcta <b>no se
     * alcanza nunca</b>.
     *
     * <p>No se arregla en la base: la columna viene de `V1` y una migración
     * aplicada no se edita. El CHECK queda como defensa en profundidad; la vía de
     * error visible es esta.
     */
    @AssertTrue(message = "La hora de fin tiene que ser posterior a la de inicio.")
    public boolean isHorarioValido() {
        return horaInicio == null || horaFin == null || horaFin.isAfter(horaInicio);
    }
}
