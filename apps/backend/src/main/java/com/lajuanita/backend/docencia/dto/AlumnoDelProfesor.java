package com.lajuanita.backend.docencia.dto;

import java.util.List;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.docencia.EstadoSeguimiento;

/**
 * Una fila de "Mis alumnos".
 *
 * <p><b>No es {@code AlumnoResumen}</b>, y la diferencia es la que importa en
 * este módulo: el listado de administración es una ficha de la persona —teléfono,
 * email, instagram, fecha de ingreso—, y esto es <b>una lista de trabajo</b>. Lo
 * que el profesor necesita ver de un vistazo es cómo viene cada uno y cuántas
 * clases le quedan; los datos de contacto son de administración, que es quien
 * llama cuando alguien deja de venir.
 *
 * <p>{@link #estadoSeguimiento} en null significa "todavía no lo marqué", que es
 * distinto de {@code VA_BIEN}. No se rellena con un valor por defecto: un
 * semáforo verde que nadie puso miente sobre un alumno que nadie miró.
 */
public record AlumnoDelProfesor(
        Long idAlumno,
        Long idUsuario,
        String nombre,
        String apellido,
        /**
         * Lo que cursa hoy, conmigo o con otro: sirve para ubicarlo <b>y para
         * elegir a qué curso se le sube un material</b> (`V23`).
         *
         * <p>Antes era una {@code List<Disciplina>} — el mismo dato sin el id, que
         * es lo único que hacía falta agregar.
         */
        List<CursoDelAlumno> cursos,
        /** Null = sin marcar. Ver la cabecera. */
        EstadoSeguimiento estadoSeguimiento,
        String observaciones,
        int clasesRestantes) {

    public static AlumnoDelProfesor de(Alumno alumno,
            List<CursoDelAlumno> cursos,
            SeguimientoResumen seguimiento,
            int clasesRestantes) {

        var usuario = alumno.getUsuario();

        return new AlumnoDelProfesor(
                alumno.getId(),
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                cursos,
                seguimiento == null ? null : seguimiento.estado(),
                seguimiento == null ? null : seguimiento.observaciones(),
                clasesRestantes);
    }
}
