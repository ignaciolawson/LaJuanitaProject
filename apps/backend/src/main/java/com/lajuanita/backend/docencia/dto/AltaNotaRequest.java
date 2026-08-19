package com.lajuanita.backend.docencia.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Una nota privada sobre un alumno.
 *
 * <p>No lleva {@code idProfesor}: sale del token, como todo en el portal. Que
 * viajara en el cuerpo permitiría escribir una nota firmada por otro profesor —y
 * una nota es privada de quien la escribe, así que la firma <i>es</i> el dato.
 *
 * <p>{@code idParticipacion} es opcional: con ella la nota es de una clase
 * concreta, sin ella es una observación general. Si viene, la base verifica que
 * esa clase sea <b>de ese alumno</b> (`V14` §1).
 */
public record AltaNotaRequest(

        @NotNull(message = "Decí sobre qué alumno es la nota.")
        Long idAlumno,

        /** La clase sobre la que es la nota. Opcional. */
        Long idParticipacion,

        @NotBlank(message = "Escribí la nota.")
        String contenido) {
}
