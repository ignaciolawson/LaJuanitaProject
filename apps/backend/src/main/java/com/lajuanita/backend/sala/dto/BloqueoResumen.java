package com.lajuanita.backend.sala.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

import com.lajuanita.backend.sala.BloqueoSala;
import com.lajuanita.backend.usuario.Usuario;

/**
 * Una fila del listado de bloqueos.
 *
 * <p>{@code vigente} viene calculado del servidor y no se deduce en la pantalla:
 * es la misma cuenta que decide si el bloqueo todavía rechaza reservas, y
 * repetirla en el front la deja a merced del reloj del navegador.
 */
public record BloqueoResumen(
        Long idBloqueo,
        Long idSala,
        String sala,
        LocalDate fechaInicio,
        LocalDate fechaFin,
        LocalTime horaInicio,
        LocalTime horaFin,
        /** Si toma de 00:00 a 23:59, o sea todos esos días completos. */
        boolean diaCompleto,
        String motivo,
        boolean vigente,
        String registradoPor,
        OffsetDateTime fechaRegistro) {

    public static BloqueoResumen de(BloqueoSala bloqueo, LocalDate hoy) {
        Usuario autor = bloqueo.getRegistradoPor();

        return new BloqueoResumen(
                bloqueo.getId(),
                bloqueo.getSala().getId(),
                bloqueo.getSala().getNombreSala(),
                bloqueo.getFechaInicio(),
                bloqueo.getFechaFin(),
                bloqueo.getHoraInicio(),
                bloqueo.getHoraFin(),
                bloqueo.getHoraInicio().equals(BloqueoSala.DESDE_QUE_ABRE)
                        && bloqueo.getHoraFin().equals(BloqueoSala.HASTA_QUE_CIERRA),
                bloqueo.getMotivo(),
                bloqueo.estaVigente(hoy),
                autor == null ? null : autor.getNombre() + " " + autor.getApellido(),
                bloqueo.getFechaRegistro());
    }
}
