package com.lajuanita.backend.docencia.dto;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
 * <p>⚠️ <b>Ya no lleva {@code idAlumno} sino {@code idInscripcion}</b>, y ése es
 * todo el punto de `mejoras.md` §12 · C2. Antes, {@code idAlumno} vacío
 * significaba "grupal", y grupal <b>no filtraba por nada</b>: el material le
 * llegaba a todos los alumnos del estudio, incluidos los que nunca tuvieron a ese
 * profesor. Ahora el destinatario y el programa son el mismo dato — una
 * inscripción es el contrato de un alumno.
 *
 * <p>{@code idReserva} es opcional y significa <b>de qué clase</b> es. Vacío = del
 * curso entero (§18 · P41). No es libre: `V23` §5 exige que esa clase sea una en
 * la que ese alumno participó con esa inscripción.
 */
public record AltaMaterialRequest(

        @NotNull(message = "Elegí para qué curso es el material.")
        Long idInscripcion,

        /** Vacío = del curso entero, no de una clase puntual. */
        Long idReserva,

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
