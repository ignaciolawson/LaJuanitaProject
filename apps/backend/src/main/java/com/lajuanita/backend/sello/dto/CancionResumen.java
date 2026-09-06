package com.lajuanita.backend.sello.dto;

import com.lajuanita.backend.sello.CancionRelease;

/**
 * Un tema del tracklist.
 *
 * <p><b>La duración viaja en segundos y también escrita.</b> El número es el dato
 * —sumar un álbum es sumar enteros— y el texto existe para que la fila del
 * tracklist no tenga que formatear en el navegador lo que ya se sabe formatear
 * acá. Es la misma decisión que {@code AparicionResumen} toma con
 * {@code ordenRelevancia}: lo que puede quedar distinto en dos lugares se calcula
 * en uno.
 */
public record CancionResumen(
        Long idCancion,
        Long idRelease,
        short orden,
        String titulo,
        Integer duracionSegundos,
        /** {@code mm:ss}, o {@code null} si no se cargó la duración. */
        String duracion,
        String artistaInvitado,
        String isrc) {

    public static CancionResumen de(CancionRelease c) {
        return new CancionResumen(
                c.getId(),
                c.getRelease().getId(),
                c.getOrden(),
                c.getTitulo(),
                c.getDuracionSegundos(),
                escribirDuracion(c.getDuracionSegundos()),
                c.getArtistaInvitado(),
                c.getIsrc());
    }

    /**
     * {@code 214 -> "3:34"}.
     *
     * <p>Un tema de más de una hora es un DJ set o un mix continuo, y existen: por
     * eso la hora aparece cuando hace falta en vez de que el minutero llegue a 74.
     */
    private static String escribirDuracion(Integer segundos) {
        if (segundos == null) {
            return null;
        }
        int horas = segundos / 3600;
        int minutos = (segundos % 3600) / 60;
        int resto = segundos % 60;

        return horas > 0
                ? "%d:%02d:%02d".formatted(horas, minutos, resto)
                : "%d:%02d".formatted(minutos, resto);
    }
}
