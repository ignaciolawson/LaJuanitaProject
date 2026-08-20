package com.lajuanita.backend.sello.dto;

import java.time.LocalDate;

import com.lajuanita.backend.sello.TipoRelease;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Editar el expediente de un release.
 *
 * <p><b>No trae ni el estado ni el código.</b> El estado se mueve por su endpoint —
 * publicar tiene una regla que un PUT genérico se saltearía sin que se note— y el
 * código no se edita: es el identificador del catálogo, y cambiarlo después de que
 * un release salió rompe la referencia que ya circuló por afuera del sistema.
 *
 * <p>Es la misma forma que tomó Mix & Mastering: cinco escrituras, ningún PUT que
 * haga todo.
 */
public record EdicionReleaseRequest(

        @NotBlank(message = "El release necesita un nombre.")
        @Size(max = 200)
        String nombreRelease,

        TipoRelease tipoRelease,

        @Size(max = 80)
        String genero,

        LocalDate fechaEstimada,

        LocalDate fechaReal,

        /** Ver la nota de {@code AltaArtistaRequest#confirmado}: boxed a propósito. */
        Boolean sistemaPromo,

        String notas) {
}
