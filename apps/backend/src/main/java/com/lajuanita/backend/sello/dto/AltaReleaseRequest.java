package com.lajuanita.backend.sello.dto;

import java.time.LocalDate;

import com.lajuanita.backend.sello.TipoRelease;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

/**
 * Alta de un release.
 *
 * <p><b>{@code codigoRelease} es opcional.</b> Si no viene, lo genera el sistema
 * por encima del más alto que exista. Si viene, se respeta.
 *
 * <p>⚠️ <b>Desde el 2026-09-05 ninguna pantalla lo manda</b> (§14 · B4). §15
 * ratificación 5 había dejado el campo en el formulario para cargar lanzamientos
 * viejos con el número que tuvieron; Ignacio decidió lo contrario sabiendo el
 * costo —<i>"que lo ponga el sistema solo siempre"</i>, y los viejos toman código
 * nuevo— y la decisión posterior gana.
 *
 * <p><b>El campo se queda igual, y no es un resto olvidado.</b> Es por dónde
 * entraría una carga histórica si alguna vez hace falta, y es lo que ejercitan
 * tres casos de {@code SelloTest} —incluido el que prueba que el correlativo sale
 * por encima del máximo, que necesita sembrar un código alto para significar algo.
 * Lo que se sacó es el camino de pantalla, no la capacidad.
 *
 * <p><b>No se puede dar de alta un release ya publicado desde este formulario</b> —
 * el campo {@code estado} no existe acá. Publicar es un acto con su propia regla y
 * su propio endpoint; metido en el alta sería un valor más de un desplegable, sin
 * pasar por la pregunta de si hay contrato. La base igual lo frena (el trigger de
 * `V18` cubre INSERT además de UPDATE), pero la forma correcta es que el formulario
 * ni lo ofrezca.
 */
public record AltaReleaseRequest(

        @NotNull(message = "Elegí el artista.")
        Long idArtista,

        @NotBlank(message = "El release necesita un nombre.")
        @Size(max = 200)
        String nombreRelease,

        /**
         * Solo para cargar los lanzamientos viejos. En blanco, lo pone el sistema.
         *
         * <p>El patrón acepta cualquier cosa razonable y no solo {@code LJ}+dígitos:
         * un código histórico puede tener otra forma, y rechazarlo dejaría afuera
         * justamente el caso para el que este campo existe.
         */
        @Size(max = 20)
        @Pattern(regexp = "^[A-Za-z0-9._-]*$",
                 message = "El código solo puede tener letras, números, punto, guion y guion bajo.")
        String codigoRelease,

        TipoRelease tipoRelease,

        @Size(max = 80)
        String genero,

        LocalDate fechaEstimada,

        /** Solo tiene sentido para los viejos; en un release nuevo lo pone publicar. */
        LocalDate fechaReal,

        String notas) {
}
