package com.lajuanita.backend.alumno.dto;

import com.lajuanita.backend.alumno.NivelIngreso;

import jakarta.validation.constraints.Size;

/**
 * Edición de los datos propios del alumno.
 *
 * <p>No toca nombre, email ni teléfono: eso es del {@code usuario} y se edita
 * por su propio endpoint. Son dos entidades distintas y se mantienen así.
 */
public record EdicionAlumnoRequest(

        NivelIngreso nivelIngreso,

        @Size(max = 100)
        String instagram) {
}
