package com.lajuanita.backend.inscripcion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.EstadoInscripcion;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.dinero.Moneda;

/**
 * Una fila del listado de inscripciones.
 *
 * <p>Trae aplanados los datos de la persona y del profesor, igual que
 * {@code AlumnoResumen}: la pantalla los muestra juntos y cruzar tres listas del
 * lado del front no le sirve a nadie.
 *
 * <p><b>{@link #clasesRestantes} es la razón de ser de este módulo</b> y no sale
 * de ninguna columna: es una resta contra las participaciones efectivamente
 * dictadas. No hay campo que se pueda desincronizar porque no hay campo.
 */
public record InscripcionResumen(
        Long idInscripcion,
        Long idAlumno,
        Long idUsuario,
        String nombre,
        String apellido,
        String email,
        Long idProfesor,
        String profesor,
        Disciplina disciplina,
        Nivel nivel,
        int clasesContratadas,
        int clasesConsumidas,
        int clasesRestantes,
        BigDecimal precioTotal,
        Moneda moneda,
        BigDecimal cotizacionDolar,
        LocalDate fechaInicio,
        EstadoInscripcion estado,
        String notas) {

    public static InscripcionResumen de(Inscripcion inscripcion, int consumidas) {
        var alumno = inscripcion.getAlumno();
        var persona = alumno.getUsuario();
        Profesor profesor = inscripcion.getProfesor();

        int contratadas = inscripcion.getClasesContratadas();

        return new InscripcionResumen(
                inscripcion.getId(),
                alumno.getId(),
                persona.getId(),
                persona.getNombre(),
                persona.getApellido(),
                persona.getEmail(),
                profesor == null ? null : profesor.getId(),
                profesor == null ? null
                        : profesor.getUsuario().getNombre() + " " + profesor.getUsuario().getApellido(),
                inscripcion.getDisciplina(),
                inscripcion.getNivel(),
                contratadas,
                consumidas,
                // Nunca negativo: la base impide pasarse, pero achicar
                // `clases_contratadas` por debajo de lo ya dictado no lo impide
                // nadie, y "quedan -2 clases" no es información, es un error de
                // lectura esperando.
                Math.max(contratadas - consumidas, 0),
                inscripcion.getPrecioTotal(),
                inscripcion.getMoneda(),
                inscripcion.getCotizacionDolar(),
                inscripcion.getFechaInicio(),
                inscripcion.getEstado(),
                inscripcion.getNotas());
    }
}
