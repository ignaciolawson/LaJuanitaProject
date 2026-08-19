package com.lajuanita.backend.docencia.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Subir material: hoy, un link con un título.
 *
 * <p><b>No hay campo de archivo, y no es un olvido</b>: el {@code StorageService}
 * de §2.4 no existe todavía. La tabla acepta las dos formas desde `V1` —archivo o
 * link— y su propio comentario dice que los archivos pesados van como link, así
 * que el módulo entra entero sin arrastrar la infraestructura de archivos. Cuando
 * esa pieza se construya (la necesita el Módulo 6 para retener el premaster), se
 * agrega el campo y esta clase gana una alternativa, no cambia.
 *
 * <p>{@code idAlumno} vacío significa <b>grupal</b>. La base no acepta las dos
 * cosas ni ninguna ({@code material_destinatario_definido}), así que el servicio
 * traduce esa ausencia en {@code esGrupal = true} — es lo que hace que el
 * formulario tenga un solo control en vez de dos que se pueden contradecir.
 */
public record AltaMaterialRequest(

        /** Vacío = para todos. Ver la cabecera. */
        Long idAlumno,

        @NotBlank(message = "Poné un título.")
        @Size(max = 200)
        String titulo,

        @Size(max = 50)
        String tipo,

        @NotBlank(message = "Pegá el link del material.")
        @Size(max = 500)
        String urlExterna,

        /** Por defecto se publica. En false queda preparado y no se ve. */
        Boolean visibleAlumno) {

    /**
     * Un link tiene que parecer un link.
     *
     * <p>Es una validación floja a propósito —no valida que exista ni que
     * responda— pero ataja el error real: pegar el nombre de un archivo en vez de
     * su URL, que produce un material que el alumno abre y no lleva a ningún lado.
     */
    @AssertTrue(message = "El link tiene que empezar con http:// o https://")
    public boolean isUrlConEsquema() {
        return urlExterna == null
                || urlExterna.startsWith("http://")
                || urlExterna.startsWith("https://");
    }
}
