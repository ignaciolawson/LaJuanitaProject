package com.lajuanita.backend.solicitud.dto;

/**
 * Lo que quedó hecho al aprobar un pedido de sala: la solicitud resuelta y el pago
 * de la seña que nació con ella.
 *
 * <p>Mismo molde y mismo motivo que {@code ReservaCreada} y que
 * {@code ConversionRealizada} del buzón: la operación crea <b>dos cosas</b> y la
 * pantalla necesita las dos. Acá el id del pago es lo que le permite adjuntarle el
 * comprobante enseguida, que desde `V21` es un archivo y no cabe en el JSON de la
 * aprobación.
 *
 * <p>Este es el circuito donde más importa, y está razonado en `mejoras.md` §9.9:
 * la persona pidió por el portal, transfirió, y <b>quien aprueba está mirando esa
 * transferencia</b>. Si el respaldo no se puede adjuntar ahí, se pierde en el mismo
 * momento en que existe.
 *
 * @param idPagoSena nunca null: `V10` no deja nacer una reserva de alquiler sin su
 *                   seña, y por eso {@code AprobacionRequest} la exige. Se devuelve
 *                   igual para que la pantalla no tenga que deducirlo.
 */
public record AprobacionRealizada(SolicitudResumen solicitud, Long idPagoSena) {
}
