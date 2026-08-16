package com.lajuanita.backend.reserva.dto;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.ReservaParticipante;

/**
 * Quién está anotado en una clase, y si fue.
 *
 * <p>{@code idInscripcion} presente significa que <b>esta clase le descuenta una
 * del curso contratado</b>. En null es alguien que participa sin cursar nada —
 * un alquiler de cabina, por ejemplo.
 */
public record ParticipanteResumen(
        Long idParticipacion,
        Long idUsuario,
        String nombre,
        String apellido,
        Long idInscripcion,
        /** De la inscripción que se descuenta, para no tener que cruzarla. */
        Disciplina disciplina,
        EstadoAsistencia estadoAsistencia,
        String observaciones) {

    public static ParticipanteResumen de(ReservaParticipante participante) {
        var persona = participante.getUsuario();
        var inscripcion = participante.getInscripcion();

        return new ParticipanteResumen(
                participante.getId(),
                persona.getId(),
                persona.getNombre(),
                persona.getApellido(),
                inscripcion == null ? null : inscripcion.getId(),
                inscripcion == null ? null : inscripcion.getDisciplina(),
                participante.getEstadoAsistencia(),
                participante.getObservaciones());
    }
}
