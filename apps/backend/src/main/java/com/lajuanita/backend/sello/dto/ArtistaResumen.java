package com.lajuanita.backend.sello.dto;

import java.time.OffsetDateTime;

import com.lajuanita.backend.sello.Artista;

/**
 * Un artista del sello.
 *
 * <p>{@code idUsuario} viaja aunque hoy sea siempre null: es la puerta que `V1`
 * dejó abierta y que P24 decidió no cruzar todavía. Un campo que la pantalla no usa
 * cuesta nada; sacarlo y volver a ponerlo cuesta acordarse de que existía.
 */
public record ArtistaResumen(
        Long idArtista,
        Long idUsuario,
        String nombreArtistico,
        String nombreReal,
        String emailContacto,
        String telefono,
        String instagram,
        boolean confirmado,
        String bio,
        long releases,
        OffsetDateTime fechaAlta) {

    public static ArtistaResumen de(Artista a, long releases) {
        return new ArtistaResumen(
                a.getId(),
                a.getUsuario() == null ? null : a.getUsuario().getId(),
                a.getNombreArtistico(),
                a.getNombreReal(),
                a.getEmailContacto(),
                a.getTelefono(),
                a.getInstagram(),
                a.isConfirmado(),
                a.getBio(),
                releases,
                a.getFechaAlta());
    }
}
