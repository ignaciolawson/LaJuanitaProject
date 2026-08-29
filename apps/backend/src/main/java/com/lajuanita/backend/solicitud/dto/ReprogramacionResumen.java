package com.lajuanita.backend.solicitud.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.solicitud.EstadoReprogramacion;
import com.lajuanita.backend.solicitud.SolicitudReprogramacion;
import com.lajuanita.backend.usuario.Usuario;

/**
 * Un pedido de mover una clase, como lo ven las dos pantallas que lo miran: la
 * bandeja de administración y las reservas de quien pidió.
 *
 * <p><b>Es el mismo DTO para las dos</b>, por la misma razón que
 * {@code SolicitudResumen}: lo que el que pidió puede ver de su propio pedido es
 * exactamente lo que ve administración. No hay campos internos acá — el día que
 * los haya, se parte en dos.
 *
 * <p>Lleva la reserva <b>aplanada y con el horario que tiene ahora</b>. Eso
 * significa que en un pedido ya aprobado los campos {@code fecha} y
 * {@code horaInicio} muestran el horario <b>nuevo</b>, no el que tenía cuando se
 * pidió: es la misma fila, movida. No se guarda el horario viejo y no hace falta
 * — el aviso de "te movimos la clase" sí dice de dónde a dónde, y esa es la
 * pregunta que alguien se hace.
 */
public record ReprogramacionResumen(
        Long idSolicitud,
        Long idUsuario,
        String nombre,
        String apellido,
        Long idReserva,
        String sala,
        String tipoUso,
        /** Cuándo es la clase HOY. Ver la nota de arriba. */
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin,
        String motivo,
        /** El día que pidió, si pidió alguno. */
        LocalDate fechaAlternativaSolicitada,
        EstadoReprogramacion estado,
        String respuesta,
        String resueltaPor,
        OffsetDateTime fechaSolicitud,
        OffsetDateTime fechaResolucion) {

    public static ReprogramacionResumen de(SolicitudReprogramacion solicitud) {
        Usuario pide = solicitud.getUsuario();
        Usuario resuelve = solicitud.getUsuarioResuelve();
        Reserva reserva = solicitud.getReserva();

        return new ReprogramacionResumen(
                solicitud.getId(),
                pide.getId(),
                pide.getNombre(),
                pide.getApellido(),
                reserva.getId(),
                reserva.getSala().getNombreSala(),
                reserva.getTipoUso().getNombre(),
                reserva.getFecha(),
                reserva.getHoraInicio(),
                reserva.getHoraFin(),
                solicitud.getMotivo(),
                solicitud.getFechaAlternativaSolicitada(),
                solicitud.getEstado(),
                solicitud.getRespuesta(),
                resuelve == null ? null : resuelve.getNombre() + " " + resuelve.getApellido(),
                solicitud.getFechaSolicitud(),
                solicitud.getFechaResolucion());
    }
}
