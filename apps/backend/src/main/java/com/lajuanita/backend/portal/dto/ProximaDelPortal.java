package com.lajuanita.backend.portal.dto;

/**
 * Lo próximo que tengo, sin ventana (§17 · H1).
 *
 * <p>Un envoltorio con un solo campo, que puede ser {@code null}: "no tenés nada
 * por delante" es una respuesta y no un 404 — la pantalla la muestra distinto
 * de "no cargó". Es la misma razón por la que el informe de uso devuelve ceros
 * en vez de omitir la sala.
 */
public record ProximaDelPortal(ReservaDelPortal reserva) {
}
