package com.lajuanita.backend.solicitante.dto;

import java.time.LocalDate;

import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.venta.VentaEquipo;

/**
 * Algo que una ficha del buzón <b>pudo haber producido</b>, ofrecido para
 * cerrarla.
 *
 * <h2>Por qué existe, y no un campo donde escribir el id</h2>
 *
 * <p>Cerrar una ficha es decir <i>qué</i> se cargó, y eso es un id. <b>Pero este
 * sistema no muestra ids en ninguna pantalla</b>: el profesor elige
 * <i>"12/08 10:00 · Clase de DJ"</i> y nunca un número; el pago elige la
 * inscripción por {@code queSalda}. Un campo numérico acá sería el único lugar
 * donde alguien tiene que copiar un id de otra pantalla — o sea el único lugar
 * donde se puede pegar el equivocado, cerrando una ficha contra la reserva de
 * otra persona. <b>Una ficha mal cerrada es peor que una abierta</b>: la abierta
 * la vuelve a mirar alguien.
 *
 * <p>Los candidatos salen de <b>la cuenta de la ficha</b>, con las consultas que
 * ya definen "lo suyo" ({@code ReservaRepository#deLaPersona},
 * {@code InscripcionRepository#deLaPersona}) — no de una búsqueda nueva.
 *
 * <h2>Por qué el texto lo arma el servidor</h2>
 *
 * <p>Es lo mismo que hace {@code PagoResumen.queSalda} desde el Módulo 3, y por
 * la misma razón: son tres tablas distintas y la pantalla tendría que saber
 * describir cada una: una cuarta forma de escribir una reserva, después de las
 * del calendario, el portal y el estado de cuenta.
 *
 * <p>⚠️ <b>La fecha NO viaja escrita</b>, y esa es la parte que no se copia de
 * {@code queSalda}. Va {@link LocalDate} para que la escriba {@code fecha()} del
 * front, que es <b>la única forma en que este sistema escribe una fecha</b> desde
 * §14 · A5 — donde se encontraron seis dialectos, uno de ellos devolviendo
 * {@code 19T14:33:12Z/08/2026} sin fallar.
 */
public record CandidatoDeLaFicha(

        DestinoRequest.Tipo tipo,

        Long id,

        /** Qué es, ya legible. Ver la cabecera. */
        String descripcion,

        /**
         * Cuándo. La fecha de la clase, del inicio del curso o de la venta.
         *
         * <p>Es el dato con el que se reconoce la fila —quien atiende se acuerda
         * de <i>"la cabina del viernes"</i>—, así que va typed y lo escribe el
         * front.
         */
        LocalDate cuando,

        /**
         * Lo que descalificaría a este candidato, o {@code null} si no hay nada.
         *
         * <p><b>Estas filas se ofrecen igual y no se filtran</b>, que es una
         * decisión y no un descuido: si la reserva se canceló o la venta se anuló,
         * esconderla deja a quien atiende buscando algo que está y no aparece, y
         * el final de esa búsqueda es cerrar la ficha contra cualquier otra cosa.
         * Mostrada con el reparo escrito, la decisión la toma quien mira.
         */
        String reparo) {

    /** Una reserva de esa persona: la cabina o la grabación que pidió. */
    public static CandidatoDeLaFicha de(Reserva reserva) {
        return new CandidatoDeLaFicha(
                DestinoRequest.Tipo.RESERVA,
                reserva.getId(),
                reserva.getTipoUso().getNombre() + " · " + reserva.getSala().getNombreSala()
                        + " · " + reserva.getHoraInicio(),
                reserva.getFecha(),
                switch (reserva.getEstado()) {
                    case CANCELADA -> "cancelada";
                    case REPROGRAMADA -> "se movió de día";
                    case PRECONFIRMADA -> "apartada, falta la seña";
                    default -> null;
                });
    }

    /** Una inscripción de esa persona: el curso que pidió. */
    public static CandidatoDeLaFicha de(Inscripcion inscripcion) {
        return new CandidatoDeLaFicha(
                DestinoRequest.Tipo.INSCRIPCION,
                inscripcion.getId(),
                inscripcion.getNivel() == null
                        ? inscripcion.getDisciplina().name()
                        : inscripcion.getDisciplina().name() + " · " + inscripcion.getNivel().name(),
                inscripcion.getFechaInicio(),
                switch (inscripcion.getEstado()) {
                    case CANCELADA -> "cancelada";
                    case COMPLETADA -> "ya terminó";
                    case PAUSADA -> "pausada";
                    default -> null;
                });
    }

    /** Una venta a esa persona: los equipos por los que consultó. */
    public static CandidatoDeLaFicha de(VentaEquipo venta) {
        String equipo = venta.getMarca() == null
                ? venta.getModeloEquipo()
                : venta.getMarca() + " " + venta.getModeloEquipo();

        return new CandidatoDeLaFicha(
                DestinoRequest.Tipo.VENTA,
                venta.getId(),
                equipo,
                venta.getFechaVenta(),
                venta.isAnulada() ? "anulada" : null);
    }
}
