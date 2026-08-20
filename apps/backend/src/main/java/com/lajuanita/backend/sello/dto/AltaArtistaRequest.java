package com.lajuanita.backend.sello.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Alta y edición de un artista.
 *
 * <p><b>No pide contraseña ni crea cuenta.</b> Los artistas no entran al sistema
 * (P24): esto es una ficha que administra el estudio. El día que entren, la cuenta
 * se enganchará por {@code artista.id_usuario}, que existe y está vacío.
 *
 * <p>El email es de contacto, no una credencial: no es único, no sirve para entrar,
 * y puede repetirse con el de un usuario sin que eso signifique nada.
 */
public record AltaArtistaRequest(

        @NotBlank(message = "El artista necesita su nombre artístico.")
        @Size(max = 150)
        String nombreArtistico,

        @Size(max = 150)
        String nombreReal,

        @Email(message = "Ese email no parece válido.")
        @Size(max = 150)
        String emailContacto,

        @Size(max = 40)
        String telefono,

        @Size(max = 100)
        String instagram,

        /**
         * <b>Boxed y no {@code boolean}, y no es estilo.</b> Jackson no puede llenar
         * el constructor canónico de un record si la propiedad no viene en el JSON,
         * así que un formulario que omite el checkbox —lo natural cuando está en
         * false— se come un 400 con un mensaje que no explica nada. Ningún request
         * DTO de este proyecto usa un primitivo, y esta es la razón; se descubrió
         * acá porque este fue el primero que lo intentó.
         */
        Boolean confirmado,

        String bio) {
}
