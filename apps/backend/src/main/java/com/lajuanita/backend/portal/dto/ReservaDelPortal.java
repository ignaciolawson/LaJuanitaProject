package com.lajuanita.backend.portal.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.reserva.Reserva;

/**
 * Una reserva vista por quien la tiene: su clase, su cabina alquilada.
 *
 * <p><b>No es {@code ReservaResumen} recortado por casualidad</b> — es un DTO
 * aparte justamente por lo que <i>no</i> lleva:
 *
 * <ul>
 *   <li><b>No lleva los otros participantes.</b> Una clase grupal tiene tres
 *       alumnos y el portal de cada uno no tiene por qué nombrar a los otros dos.
 *   <li><b>No lleva {@code notas}.</b> Es el campo donde administración anota lo
 *       suyo sobre la reserva; que hoy suela estar vacío no lo hace público.
 * </ul>
 *
 * <p>Reusar el DTO de administración habría hecho las dos cosas de una, y sin
 * que nadie lo decidiera: el día que alguien le agregue un campo interno a
 * {@code ReservaResumen}, se publica solo.
 *
 * <p><b>{@link #estado} sí viaja, incluso {@code CANCELADA}</b>, y no es un
 * descuido: que se cayó la clase del martes es exactamente lo que el alumno
 * necesita saber. Esconderla haría que la clase desaparezca sin explicación.
 */
public record ReservaDelPortal(
        Long idReserva,
        String sala,
        String tipoUso,
        String color,
        boolean esClase,
        /** Quién la da. Null es normal: una clase puede no tener profe asignado (P37). */
        String profesor,
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin,
        EstadoReserva estado,
        /**
         * Cómo quedó registrada mi asistencia.
         *
         * <p>Null cuando esta reserva es mía por haberla pagado y no por estar
         * anotado en ella — el caso de un alquiler viejo, cargado antes de que el
         * portal anotara al que pide.
         */
        EstadoAsistencia miAsistencia) {

    public static ReservaDelPortal de(Reserva reserva, EstadoAsistencia miAsistencia) {
        var profesor = reserva.getProfesor();

        return new ReservaDelPortal(
                reserva.getId(),
                reserva.getSala().getNombreSala(),
                reserva.getTipoUso().getNombre(),
                reserva.getTipoUso().getColor(),
                reserva.getTipoUso().isEsClase(),
                profesor == null ? null
                        : profesor.getUsuario().getNombre() + " " + profesor.getUsuario().getApellido(),
                reserva.getFecha(),
                reserva.getHoraInicio(),
                reserva.getHoraFin(),
                reserva.getEstado(),
                miAsistencia);
    }
}
