package com.lajuanita.backend.docencia.dto;

import java.time.OffsetDateTime;

import com.lajuanita.backend.docencia.EstadoSeguimiento;
import com.lajuanita.backend.docencia.SeguimientoAlumno;

/** El semáforo de un alumno, con desde cuándo está así. */
public record SeguimientoResumen(
        Long idSeguimiento,
        Long idAlumno,
        EstadoSeguimiento estado,
        String observaciones,
        OffsetDateTime fechaActualizacion) {

    public static SeguimientoResumen de(SeguimientoAlumno seguimiento) {
        return new SeguimientoResumen(
                seguimiento.getId(),
                seguimiento.getAlumno().getId(),
                seguimiento.getEstado(),
                seguimiento.getObservaciones(),
                seguimiento.getFechaActualizacion());
    }
}
