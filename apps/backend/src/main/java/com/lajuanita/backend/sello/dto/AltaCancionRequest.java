package com.lajuanita.backend.sello.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Cargar o corregir un tema. Sirve para el alta y para la edición.
 *
 * <p><b>No lleva {@code orden}, y eso es la decisión</b>: la posición la asigna
 * siempre el servidor —{@code max + 1} al agregar, intercambio al mover— así que
 * no hay forma de que dos temas queden en el mismo lugar por algo que alguien
 * tipeó. Es lo que hace que el UNIQUE diferido de `V26` no le cueste nada a nadie.
 *
 * <p><b>Los tres campos de P53 son opcionales.</b> El ISRC en particular aparece
 * <i>después</i> de la distribución: exigirlo al crear el tema haría imposible
 * armar el tracklist antes de mandarlo. La forma sí la verifica `V26` cuando hay
 * algo escrito, porque un ISRC que no es un ISRC se publica como si lo fuera.
 */
public record AltaCancionRequest(

        @NotBlank(message = "Poné el nombre del tema.")
        @Size(max = 200)
        String titulo,

        @Positive(message = "La duración tiene que ser mayor a cero.")
        Integer duracionSegundos,

        @Size(max = 200)
        String artistaInvitado,

        @Size(max = 20)
        String isrc) {
}
