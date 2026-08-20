package com.lajuanita.backend.sello.dto;

import java.time.LocalDate;

import com.lajuanita.backend.sello.TipoAparicion;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** Anotar dónde sonó un release. Se carga a mano: no hay integración con nada (P25). */
public record AltaAparicionRequest(

        @NotNull(message = "Elegí qué tipo de aparición fue.")
        TipoAparicion tipoAparicion,

        @NotBlank(message = "Decí dónde sonó.")
        @Size(max = 200)
        String donde,

        @Size(max = 150)
        String quien,

        LocalDate fecha,

        @Size(max = 500)
        String url,

        String notas) {
}
