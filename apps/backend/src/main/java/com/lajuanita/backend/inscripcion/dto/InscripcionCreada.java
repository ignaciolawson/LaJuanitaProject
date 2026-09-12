package com.lajuanita.backend.inscripcion.dto;

/**
 * Lo que devuelve el alta de una inscripción: la fila, y el id del pago de la
 * seña si vino con una.
 *
 * <p>Es el molde de {@code ReservaCreada} (`V21`): el comprobante de la seña se
 * adjunta contra el pago en un segundo pedido —un archivo no viaja adentro de
 * un JSON— y sin este id se pierde en el momento exacto en que existe. Y por lo
 * mismo que allá <b>no es un campo nullable de {@code InscripcionResumen}</b>:
 * ese record dibuja el listado, donde el campo estaría siempre en null y se
 * leería como "esta inscripción no tiene seña".
 *
 * <p>{@code idPagoSena} es null cuando nació preinscripta: no hay pago todavía.
 */
public record InscripcionCreada(InscripcionResumen inscripcion, Long idPagoSena) {
}
