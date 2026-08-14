package com.lajuanita.backend.alumno.dto;

import java.time.LocalDate;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.EstadoAlumno;
import com.lajuanita.backend.alumno.NivelIngreso;

/**
 * Una fila del listado de alumnos.
 *
 * <p>Trae los datos de la persona aplanados junto a los del alumno: la pantalla
 * los muestra juntos y no tiene sentido obligar al front a cruzar dos listas.
 *
 * <p>Todavía sin disciplina ni nivel actual: eso vive en {@code inscripcion},
 * que es la próxima tanda de este módulo.
 */
public record AlumnoResumen(
        Long idAlumno,
        Long idUsuario,
        String nombre,
        String apellido,
        String email,
        String telefono,
        NivelIngreso nivelIngreso,
        EstadoAlumno estadoAlumno,
        LocalDate fechaIngreso,
        String instagram,
        /** Del usuario, no del alumno: alguien dado de baja no puede entrar. */
        boolean usuarioActivo) {

    public static AlumnoResumen de(Alumno alumno) {
        var usuario = alumno.getUsuario();
        return new AlumnoResumen(
                alumno.getId(),
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getTelefono(),
                alumno.getNivelIngreso(),
                alumno.getEstadoAlumno(),
                alumno.getFechaIngreso(),
                alumno.getInstagram(),
                usuario.isActivo());
    }
}
