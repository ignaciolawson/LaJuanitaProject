package com.lajuanita.backend.docencia.dto;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.Nivel;

/**
 * Un curso vigente de un alumno, como lo ve su profesor.
 *
 * <p><b>Reemplaza a la lista de {@code Disciplina} que traía
 * {@link AlumnoDelProfesor}</b> (`mejoras.md` §12 · C2). Era el mismo dato sin el
 * id, y el id es justamente lo que hacía falta: desde `V23` un material se sube
 * <b>a un curso</b>, así que el formulario tiene que poder nombrar uno.
 *
 * <p>Salen de la misma consulta que ya calculaba las clases restantes, así que no
 * cuesta una consulta más — y de paso saca del medio a {@code disciplinasVigentes}
 * en este service, que era una segunda forma de preguntar lo mismo.
 */
public record CursoDelAlumno(
        Long idInscripcion,
        Disciplina disciplina,
        /** Null en mentoría y en los cursos que no lo cargaron. */
        Nivel nivel,
        int clasesRestantes) {

    public static CursoDelAlumno de(Inscripcion inscripcion, int clasesRestantes) {
        return new CursoDelAlumno(
                inscripcion.getId(),
                inscripcion.getDisciplina(),
                inscripcion.getNivel(),
                clasesRestantes);
    }
}
