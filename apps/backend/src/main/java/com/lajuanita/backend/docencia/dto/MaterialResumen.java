package com.lajuanita.backend.docencia.dto;

import java.time.OffsetDateTime;

import com.lajuanita.backend.docencia.Material;
import com.lajuanita.backend.inscripcion.Inscripcion;

/**
 * Un material, para las dos pantallas que lo miran: la del profesor que lo subió
 * y la del alumno que lo recibe.
 *
 * <p><b>Es el mismo record para las dos y hay que tener cuidado con eso</b>, más
 * que en {@code SolicitudResumen} —donde también se comparte—: acá una de las dos
 * pantallas es de alguien que NO puede ver todo. Lo que lo hace seguro no es este
 * DTO sino la consulta: {@code MaterialRepository.paraElAlumno} solo devuelve lo
 * que tiene {@code visible_alumno = TRUE}, así que un material oculto nunca llega
 * hasta acá. {@link #visibleAlumno} viaja igual porque el profesor necesita ver
 * cuál publicó y cuál no.
 *
 * <p>Si algún día este DTO gana un campo que el alumno no deba ver, se parte en
 * dos — es la misma decisión que ya se tomó con {@code ReservaDelPortal}.
 */
public record MaterialResumen(
        Long idMaterial,
        Long idProfesor,
        String profesor,
        Long idAlumno,
        String alumno,

        /**
         * De qué curso es (`V23`). Nunca null: todo material pertenece a un
         * programa, que es lo que reemplazó al "grupal" que no era de nadie.
         */
        Long idInscripcion,
        /** Ya legible: "DJ · INICIAL". La pantalla agrupa por esto. */
        String curso,

        /**
         * De qué clase es, si es de una. Null = del curso entero (§18 · P41).
         *
         * <p>{@link #clase} viene ya escrito —"12/08 10:00"— porque la pantalla
         * agrupa por clase y armar esa etiqueta en el front obliga a cruzar la
         * agenda por fila.
         */
        Long idReserva,
        String clase,

        String titulo,
        String tipo,
        String urlExterna,
        boolean visibleAlumno,
        OffsetDateTime fechaSubida) {

    public static MaterialResumen de(Material material) {
        var profesor = material.getProfesor();
        var inscripcion = material.getInscripcion();
        var alumno = inscripcion.getAlumno();
        var reserva = material.getReserva();

        return new MaterialResumen(
                material.getId(),
                profesor.getId(),
                profesor.getUsuario().getNombre() + " " + profesor.getUsuario().getApellido(),
                // El alumno sale de la inscripción y ya no de una columna propia:
                // una inscripción es el contrato de UN alumno.
                alumno.getId(),
                alumno.getUsuario().getNombre() + " " + alumno.getUsuario().getApellido(),
                inscripcion.getId(),
                nombreDe(inscripcion),
                reserva == null ? null : reserva.getId(),
                reserva == null ? null
                        : reserva.getFecha() + " " + reserva.getHoraInicio().toString().substring(0, 5),
                material.getTitulo(),
                material.getTipo(),
                material.getUrlExterna(),
                material.isVisibleAlumno(),
                material.getFechaSubida());
    }

    /**
     * "DJ · INICIAL", o sólo la disciplina si el curso no tiene nivel — que es lo
     * normal en mentoría. Es la misma forma que usa {@code PagoResumen.queSalda}
     * para nombrar una inscripción.
     */
    private static String nombreDe(Inscripcion inscripcion) {
        return inscripcion.getNivel() == null
                ? inscripcion.getDisciplina().name()
                : inscripcion.getDisciplina().name() + " · " + inscripcion.getNivel().name();
    }
}
