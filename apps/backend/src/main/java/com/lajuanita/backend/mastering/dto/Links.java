package com.lajuanita.backend.mastering.dto;

/**
 * Un link tiene que parecer un link.
 *
 * <p>Existe porque este módulo lo valida en <b>tres campos y dos DTO</b> —material
 * del cliente, master y premaster— y escribir el mismo {@code startsWith} tres
 * veces es cómo se cuela la vez que dice {@code https} y no {@code http}.
 *
 * <p><b>Es floja a propósito</b>: no verifica que la URL exista ni que responda.
 * Ataja el error real, que es pegar el nombre del archivo en vez de su dirección —
 * y produce un entregable que el cliente abre y no lleva a ningún lado.
 *
 * <p>{@code AltaMaterialRequest} del Módulo 5 tiene esta misma comprobación
 * escrita adentro. No se movió acá: son dos módulos distintos y mudarla obligaría
 * a que uno dependa del otro por cuatro líneas. Si aparece un tercero, esto sube a
 * un lugar común — es el mismo criterio con el que {@code Autoridades} y
 * {@code Busqueda} salieron de sus controllers.
 */
final class Links {

    private Links() {
    }

    /** Vacío pasa: el campo es opcional y lo obligatorio lo dice {@code @NotBlank}. */
    static boolean pareceUnLink(String url) {
        return url == null
                || url.isBlank()
                || url.startsWith("http://")
                || url.startsWith("https://");
    }
}
