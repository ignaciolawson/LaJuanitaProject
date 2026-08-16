package com.lajuanita.backend.reserva.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.reserva.Reserva;

/**
 * Un bloque del calendario.
 *
 * <p>Trae aplanado lo que la grilla dibuja —nombre de sala, nombre y color del
 * tipo de uso, nombre del profesor— para que el front no tenga que cruzar tres
 * listas por celda.
 */
public record ReservaResumen(
        Long idReserva,
        Long idSala,
        String sala,
        Long idTipoUso,
        String tipoUso,
        /** Con el que se pinta la celda. Sale de `tipo_uso`, no del front. */
        String color,
        boolean esClase,
        Long idProfesor,
        String profesor,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin,
        EstadoReserva estado,
        String notas,
        Long idReservaRecupera,
        String motivoReprogramacion,
        List<ParticipanteResumen> participantes) {

    public static ReservaResumen de(Reserva reserva, List<ParticipanteResumen> participantes) {
        var sala = reserva.getSala();
        var tipoUso = reserva.getTipoUso();
        Profesor profesor = reserva.getProfesor();
        var recupera = reserva.getReservaRecupera();

        return new ReservaResumen(
                reserva.getId(),
                sala.getId(),
                sala.getNombreSala(),
                tipoUso.getId(),
                tipoUso.getNombre(),
                tipoUso.getColor(),
                tipoUso.isEsClase(),
                profesor == null ? null : profesor.getId(),
                profesor == null ? null
                        : profesor.getUsuario().getNombre() + " " + profesor.getUsuario().getApellido(),
                reserva.getFecha(),
                reserva.getHoraInicio(),
                reserva.getHoraFin(),
                reserva.getEstado(),
                reserva.getNotas(),
                recupera == null ? null : recupera.getId(),
                reserva.getMotivoReprogramacion(),
                participantes);
    }
}
