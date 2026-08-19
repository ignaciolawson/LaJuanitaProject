package com.lajuanita.backend.docencia.dto;

import java.time.OffsetDateTime;

import com.lajuanita.backend.docencia.Material;

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
        /** Null si es grupal. */
        Long idAlumno,
        String alumno,
        boolean esGrupal,
        String titulo,
        String tipo,
        String urlExterna,
        boolean visibleAlumno,
        OffsetDateTime fechaSubida) {

    public static MaterialResumen de(Material material) {
        var profesor = material.getProfesor();
        var alumno = material.getAlumno();

        return new MaterialResumen(
                material.getId(),
                profesor.getId(),
                profesor.getUsuario().getNombre() + " " + profesor.getUsuario().getApellido(),
                alumno == null ? null : alumno.getId(),
                alumno == null ? null
                        : alumno.getUsuario().getNombre() + " " + alumno.getUsuario().getApellido(),
                material.isEsGrupal(),
                material.getTitulo(),
                material.getTipo(),
                material.getUrlExterna(),
                material.isVisibleAlumno(),
                material.getFechaSubida());
    }
}
