package com.lajuanita.backend.solicitud.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

import com.lajuanita.backend.solicitud.EstadoSolicitud;
import com.lajuanita.backend.solicitud.SolicitudReserva;
import com.lajuanita.backend.usuario.Usuario;

/**
 * Una solicitud, como la ven las dos pantallas que la miran: la bandeja de
 * administración y "Mis solicitudes" del portal.
 *
 * <p><b>Es el mismo DTO para las dos</b>, y no por ahorro: lo que el que pidió
 * puede ver de su propia solicitud es exactamente lo que administración ve de
 * ella. No hay campos internos acá — el día que los haya, se parte en dos.
 *
 * <p>Trae aplanados los nombres de la persona, la sala y el uso, igual que el
 * resto de los listados del sistema: la pantalla los muestra juntos y cruzar tres
 * listas del lado del front no le sirve a nadie.
 */
public record SolicitudResumen(
        Long idSolicitud,
        Long idUsuario,
        String nombre,
        String apellido,
        String email,
        Long idSala,
        String sala,
        Long idTipoUso,
        String tipoUso,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin,
        String comentario,
        EstadoSolicitud estado,
        String respuesta,
        /** Quién resolvió. En una cancelación es el que pidió. */
        String resueltaPor,
        /** La reserva que nació de acá. Solo si está APROBADA. */
        Long idReserva,
        OffsetDateTime fechaResolucion,
        OffsetDateTime fechaCreacion) {

    public static SolicitudResumen de(SolicitudReserva solicitud) {
        Usuario pide = solicitud.getUsuario();
        Usuario resuelve = solicitud.getUsuarioResuelve();

        return new SolicitudResumen(
                solicitud.getId(),
                pide.getId(),
                pide.getNombre(),
                pide.getApellido(),
                pide.getEmail(),
                solicitud.getSala().getId(),
                solicitud.getSala().getNombreSala(),
                solicitud.getTipoUso().getId(),
                solicitud.getTipoUso().getNombre(),
                solicitud.getFecha(),
                solicitud.getHoraInicio(),
                solicitud.getHoraFin(),
                solicitud.getComentario(),
                solicitud.getEstado(),
                solicitud.getRespuesta(),
                resuelve == null ? null : resuelve.getNombre() + " " + resuelve.getApellido(),
                solicitud.getReserva() == null ? null : solicitud.getReserva().getId(),
                solicitud.getFechaResolucion(),
                solicitud.getFechaCreacion());
    }
}
