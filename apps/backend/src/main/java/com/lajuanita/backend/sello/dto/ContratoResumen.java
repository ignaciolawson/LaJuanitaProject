package com.lajuanita.backend.sello.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.sello.ContratoSello;

/**
 * Un contrato cargado.
 *
 * <p><b>No lleva {@code archivoPath}</b>, por lo mismo que {@code ReleaseResumen}
 * no lleva la portada: la clave del almacenamiento es de la base. El PDF se pide
 * por {@code GET /api/contratos/{id}/archivo}, que verifica quién pregunta antes de
 * abrir nada — y un contrato tiene datos de un tercero.
 *
 * <p>{@code general} es la distinción que hace no obvia a la regla dura: un
 * contrato sin release cubre al artista entero, y respalda a todos sus
 * lanzamientos.
 */
public record ContratoResumen(
        Long idContrato,
        Long idArtista,
        String artista,
        Long idRelease,
        String codigoRelease,
        boolean general,
        LocalDate fechaFirma,
        String observaciones,
        OffsetDateTime fechaCarga) {

    public static ContratoResumen de(ContratoSello c) {
        var release = c.getRelease();

        return new ContratoResumen(
                c.getId(),
                c.getArtista().getId(),
                c.getArtista().getNombreArtistico(),
                release == null ? null : release.getId(),
                release == null ? null : release.getCodigoRelease(),
                release == null,
                c.getFechaFirma(),
                c.getObservaciones(),
                c.getFechaCarga());
    }
}
