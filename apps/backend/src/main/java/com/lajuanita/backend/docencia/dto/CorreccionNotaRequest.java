package com.lajuanita.backend.docencia.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * Corregir el texto de una nota propia.
 *
 * <p><b>Existe en vez de reusar {@link AltaNotaRequest}, que tiene estos mismos
 * campos y dos más.</b> Aquel exige {@code idAlumno}, y pedirlo para cambiar un
 * texto obliga al front a mandar un dato que el servidor ya conoce —la nota
 * sabe de quién es— y que, si viniera distinto, habría que decidir si se ignora
 * o si mueve la nota de alumno. Ninguna de las dos respuestas es buena.
 *
 * <p>Es el mismo criterio con el que {@code AprobacionRequest} no reusa
 * {@code AltaSenaRequest}: <b>lo que decide el servidor no viaja en el pedido</b>,
 * ni siquiera para ser ignorado después.
 */
public record CorreccionNotaRequest(
        @NotBlank(message = "Escribí la nota.")
        String contenido) {
}
