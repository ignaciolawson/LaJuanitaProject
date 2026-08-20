package com.lajuanita.backend.sello.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.sello.EstadoRelease;
import com.lajuanita.backend.sello.Release;
import com.lajuanita.backend.sello.TipoRelease;

/**
 * Un release, como lo ve administración — que es la única que lo ve.
 *
 * <p><b>Este módulo no tiene un DTO de portal y no es un olvido</b>: los artistas
 * no entran al sistema (P24), así que no hay una segunda lectura de esta fila desde
 * la que haya que esconder algo. Es la diferencia con {@code TrabajoDelPortal} y
 * {@code ReservaDelPortal}, que existen porque del otro lado hay alguien mirando.
 * Si algún día los artistas entran, el DTO nuevo se agrega — no se le sacan campos
 * a este.
 *
 * <p>{@link #tieneContrato} no sale de esta fila: es la misma pregunta que decide
 * la regla dura, contestada para que la pantalla pueda avisar <b>antes</b> de que
 * alguien apriete publicar y se coma un 409.
 */
public record ReleaseResumen(
        Long idRelease,
        String codigoRelease,
        Long idArtista,
        String artista,
        String nombreRelease,
        TipoRelease tipoRelease,
        String genero,
        boolean tienePortada,
        LocalDate fechaEstimada,
        LocalDate fechaReal,
        EstadoRelease estado,
        boolean sistemaPromo,
        String notas,

        /** Cuántos contratos lo respaldan: el suyo más los generales de su artista. */
        int contratos,
        boolean tieneContrato,

        boolean publicadoSinContrato,
        String motivoPublicacion,
        String publicadoPor,

        OffsetDateTime fechaCreacion) {

    public static ReleaseResumen de(Release r, int contratos) {
        return new ReleaseResumen(
                r.getId(),
                r.getCodigoRelease(),
                r.getArtista().getId(),
                r.getArtista().getNombreArtistico(),
                r.getNombreRelease(),
                r.getTipoRelease(),
                r.getGenero(),
                r.getPortadaPath() != null,
                r.getFechaEstimada(),
                r.getFechaReal(),
                r.getEstado(),
                r.isSistemaPromo(),
                r.getNotas(),
                contratos,
                contratos > 0,
                r.isPublicadoSinContrato(),
                r.getMotivoPublicacion(),
                r.getPublicadoPor() == null ? null
                        : r.getPublicadoPor().getNombre() + " " + r.getPublicadoPor().getApellido(),
                r.getFechaCreacion());
    }

    /**
     * <b>Nunca se manda {@code portadaPath} y por eso hay un booleano en su lugar.</b>
     * La clave del almacenamiento es de la base, no del cliente: publicarla invita a
     * armar URLs a mano, que es exactamente lo que {@code Almacenamiento} no ofrece.
     * La portada se pide por su endpoint, que verifica quién pregunta — la misma
     * decisión que tomó {@code TrabajoDelPortal} escondiendo el premaster en el
     * mapeo y no en la pantalla.
     */
    public static ReleaseResumen de(Release r) {
        return de(r, 0);
    }
}
