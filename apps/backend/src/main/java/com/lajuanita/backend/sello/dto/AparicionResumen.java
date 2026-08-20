package com.lajuanita.backend.sello.dto;

import java.time.LocalDate;

import com.lajuanita.backend.sello.AparicionRelease;
import com.lajuanita.backend.sello.TipoAparicion;

/** Una aparición del release, ya con su lugar en la jerarquía de popularidad. */
public record AparicionResumen(
        Long idAparicion,
        Long idRelease,
        TipoAparicion tipoAparicion,
        String donde,
        String quien,
        LocalDate fecha,
        String url,
        String notas,
        Short ordenRelevancia) {

    public static AparicionResumen de(AparicionRelease a) {
        return new AparicionResumen(
                a.getId(),
                a.getRelease().getId(),
                a.getTipoAparicion(),
                a.getDonde(),
                a.getQuien(),
                a.getFecha(),
                a.getUrl(),
                a.getNotas(),
                a.getOrdenRelevancia());
    }
}
