package com.lajuanita.backend.reserva.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Anotar a alguien en una reserva.
 *
 * <p>{@code idInscripcion} es lo que hace que la clase se descuente del curso.
 * Va vacío cuando la persona participa sin cursar —un alquiler de cabina—, y
 * cuando viene, <b>la base exige que esa inscripción sea de esta misma
 * persona</b>: sin ese control se podía anotar a Juan descontándole la clase a
 * Ana.
 *
 * <p>La otra regla que se dispara acá es la de `V9` §5: no se pueden consumir más
 * clases que las contratadas. El mensaje que devuelve nombra la salida —ampliar
 * la inscripción— y llega tal cual a la pantalla.
 */
public record AltaParticipanteRequest(

        @NotNull(message = "Elegí a quién anotar.")
        Long idUsuario,

        /** Opcional: sin esto, la clase no descuenta de ningún curso. */
        Long idInscripcion,

        String observaciones) {
}
