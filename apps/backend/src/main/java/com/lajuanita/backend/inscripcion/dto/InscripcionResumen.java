package com.lajuanita.backend.inscripcion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

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
 * <p><b>Desde `V35` la "persona" de la fila es el REFERENTE</b> (P88): es a quien
 * nombra Deudores y a quien le va el WhatsApp de la seña, y en un alumno solo es
 * él mismo — así que {@link #idAlumno}, {@link #nombre} y compañía siguen
 * diciendo lo que decían. Los tres (o dos, o uno) están en {@link #integrantes},
 * el referente primero; y {@link #numeroGrupo} sólo tiene valor en un grupo de 2
 * o 3 (<i>"Grupo 8"</i>).
 *
 * <p><b>{@link #clasesRestantes} es la razón de ser de este módulo</b> y no sale
 * de ninguna columna: es una resta contra las participaciones efectivamente
 * dictadas. No hay campo que se pueda desincronizar porque no hay campo.
 */
public record InscripcionResumen(
        Long idInscripcion,
        /** Sólo en un grupo de 2 o 3; null para un alumno solo (`V35` §2). */
        Integer numeroGrupo,
        /** El referente primero (`@OrderBy` de la entidad). */
        List<IntegranteResumen> integrantes,
        /** El referente. */
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
        /** Sólo con valor en PREINSCRIPTA (`V30`): hasta cuándo puede señarse. */
        OffsetDateTime vencePreinscripcion,
        String notas) {

    public static InscripcionResumen de(Inscripcion inscripcion, int consumidas) {
        var alumno = inscripcion.referente().getAlumno();
        var persona = alumno.getUsuario();
        Profesor profesor = inscripcion.getProfesor();

        int contratadas = inscripcion.getClasesContratadas();

        return new InscripcionResumen(
                inscripcion.getId(),
                inscripcion.getNumeroGrupo(),
                // El referente primero también recién creada: el `@OrderBy` de la
                // entidad sólo ordena lo que viene de la base, y el alta devuelve
                // la lista en memoria tal como se armó.
                inscripcion.getIntegrantes().stream()
                        .sorted(java.util.Comparator.comparing(x -> !x.isReferente()))
                        .map(IntegranteResumen::de).toList(),
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
                inscripcion.getVencePreinscripcion(),
                inscripcion.getNotas());
    }
}
