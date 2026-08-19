package com.lajuanita.backend.solicitud.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/**
 * Lo que el portal manda para pedir una sala.
 *
 * <p><b>Lo que no está acá es tan importante como lo que está.</b> No hay
 * {@code idUsuario}: quien pide sale del token, siempre. Dejarlo entrar por el
 * cuerpo sería dejar pedir en nombre de otro, y en el mismo movimiento perder la
 * única identidad que el resto del circuito —la seña, la notificación, la
 * reserva— usa para saber de quién es esto.
 *
 * <p>Tampoco hay monto ni precio: el de un alquiler sale de horas × una tarifa
 * que el sistema todavía no tiene (P13). La seña la escribe administración al
 * aprobar, que es donde hoy se escribe igual.
 *
 * <p>Ni estado: nace PENDIENTE por el DEFAULT de la base. Un alta que pudiera
 * elegir estado podría nacer aprobada.
 */
public record AltaSolicitudRequest(

        @NotNull(message = "Elegí la sala.")
        Long idSala,

        /**
         * Qué querés hacer. Solo los usos marcados como solicitables en el
         * catálogo — alquiler de cabina y grabación de set (P17). Lo verifica un
         * trigger de `V13`, no esta clase: la lista vive en la base, no en el
         * código.
         */
        @NotNull(message = "Elegí para qué querés la sala.")
        Long idTipoUso,

        @NotNull(message = "Poné la fecha.")
        LocalDate fecha,

        @NotNull(message = "Poné la hora de inicio.")
        LocalTime horaInicio,

        @NotNull(message = "Poné la hora de fin.")
        LocalTime horaFin,

        String comentario) {

    /**
     * Mismo cuidado que {@code AltaReservaRequest}: el orden de las horas se
     * valida acá para que el error nombre el campo.
     *
     * <p>Acá no hay columna generada que se adelante a los CHECK —esta tabla no
     * tiene {@code periodo}, no la necesita— así que el CHECK de `V13` sí habla.
     * Igual se valida en el DTO: un 400 que señala el campo es mejor pantalla que
     * un 409 con el texto de una constraint.
     */
    @AssertTrue(message = "La hora de fin tiene que ser posterior a la de inicio.")
    public boolean isHorarioValido() {
        return horaInicio == null || horaFin == null || horaFin.isAfter(horaInicio);
    }
}
