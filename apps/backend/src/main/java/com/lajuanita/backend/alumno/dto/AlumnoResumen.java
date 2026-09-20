package com.lajuanita.backend.alumno.dto;

import java.time.LocalDate;
import java.util.List;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.EstadoAlumno;
import com.lajuanita.backend.alumno.NivelIngreso;
import com.lajuanita.backend.inscripcion.Disciplina;

/**
 * Una fila del listado de alumnos.
 *
 * <p>Trae los datos de la persona aplanados junto a los del alumno: la pantalla
 * los muestra juntos y no tiene sentido obligar al front a cruzar dos listas.
 *
 * <p>{@code disciplinas} es <b>una lista y no un campo</b>, por lo mismo que
 * {@code alumno.disciplina} no existe en el esquema: alguien puede estar
 * cursando DJ y producción a la vez. Trae solo lo que está
 * {@link com.lajuanita.backend.inscripcion.EstadoInscripcion#VIGENTES vigente} —
 * quien terminó DJ el año pasado no figura como alumno de DJ.
 *
 * <p>El detalle de cada curso (nivel, profesor, precio, clases restantes) no
 * está acá: se pide con {@code GET /api/inscripciones?idAlumno=}.
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
        boolean usuarioActivo,
        /** Lo que está cursando hoy. Vacía si no tiene ninguna inscripción vigente. */
        List<Disciplina> disciplinas,
        /**
         * Los grupos en los que cursa hoy (`V35`), vacía si cursa solo.
         *
         * <p><b>Existe para que el grupo se VEA al elegir al alumno</b> (P96). El
         * calendario ya anotaba al grupo entero —elegir a cualquiera de los tres
         * alcanza— y no había forma de saberlo antes de elegir: el buscador
         * mostraba tres personas sueltas, como cualquier otra. Una capacidad que
         * no se ve es una capacidad que no existe.
         *
         * <p>Es una lista por lo mismo que {@link #disciplinas}: alguien puede
         * estar en un grupo de DJ y en otro de producción.
         */
        List<Integer> grupos) {

    public static AlumnoResumen de(Alumno alumno, List<Disciplina> disciplinas) {
        return de(alumno, disciplinas, List.of());
    }

    public static AlumnoResumen de(Alumno alumno, List<Disciplina> disciplinas,
            List<Integer> grupos) {
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
                usuario.isActivo(),
                disciplinas,
                grupos);
    }

    /**
     * Para el alta, donde el alumno acaba de nacer y todavía no cursa nada.
     *
     * <p>Es un caso real y no un atajo: no hay consulta que ahorrarse porque no
     * hay nada que consultar. Cualquier otro camino tiene que pasar la lista.
     */
    public static AlumnoResumen recienCreado(Alumno alumno) {
        return de(alumno, List.of());
    }
}
