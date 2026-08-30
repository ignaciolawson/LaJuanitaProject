package com.lajuanita.backend.reserva.dto;

/**
 * Lo que quedó creado por un alta: la reserva y, si vino con seña, el pago que la
 * respalda.
 *
 * <p><b>Existe por el comprobante.</b> Desde `V21` el respaldo de un pago es un
 * archivo que se sube por su propio endpoint, y no puede viajar adentro del JSON
 * del alta. Entonces la pantalla hace dos cosas seguidas —crear la reserva con su
 * seña, adjuntarle el archivo— y para la segunda necesita el id del pago que acaba
 * de nacer. Sin esto no hay forma de saberlo: la seña la crea el servidor, no el
 * pedido.
 *
 * <p>Eso sostiene lo que `mejoras.md` §9.9 decidió el 2026-08-29 — que el
 * comprobante se adjunta <b>en el momento en que existe</b>, que es cuando quien
 * carga está mirando la transferencia. Un respaldo que hay que ir a adjuntar
 * después, desde otra pantalla, es el que no se adjunta.
 *
 * <p><b>Por qué no es un campo más de {@link ReservaResumen}.</b> Ese record
 * también dibuja los listados de la agenda, donde nadie consulta la plata: el campo
 * vendría siempre en null y <i>"null"</i> se leería como "esta reserva no tiene
 * seña", que es falso y no falla en ningún lado. Es el mismo criterio con el que el
 * portal tiene sus propios DTO en vez de reusar los de administración.
 *
 * @param idPagoSena null cuando el alta no traía seña — una clase se respalda con
 *                   la inscripción del que asiste, no con un pago propio.
 */
public record ReservaCreada(ReservaResumen reserva, Long idPagoSena) {
}
