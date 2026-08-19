package com.lajuanita.backend.docencia.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.docencia.NotaProfesor;

/**
 * Una nota, como la ve su autor.
 *
 * <p><b>Este DTO no tiene ninguna pantalla del alumno que lo consuma, y no debe
 * tenerla</b>: las notas privadas no las ve el alumno (§8). Está acá para que si
 * alguien alguna vez lo usa desde el portal del alumno, la revisión lo vea.
 *
 * <p>{@link #fechaDeLaClase} es de la sesión, no de la nota: es lo que permite
 * leer el historial como *"lo del martes pasado"* en vez de como una pila de
 * textos fechados el día que se escribieron.
 */
public record NotaResumen(
        Long idNota,
        Long idAlumno,
        Long idParticipacion,
        /** Null si la nota es general y no de una clase. */
        LocalDate fechaDeLaClase,
        String contenido,
        OffsetDateTime fechaCreacion,
        OffsetDateTime fechaModificacion) {

    public static NotaResumen de(NotaProfesor nota) {
        var participacion = nota.getParticipacion();

        return new NotaResumen(
                nota.getId(),
                nota.getAlumno().getId(),
                participacion == null ? null : participacion.getId(),
                participacion == null ? null : participacion.getReserva().getFecha(),
                nota.getContenido(),
                nota.getFechaCreacion(),
                nota.getFechaModificacion());
    }
}
