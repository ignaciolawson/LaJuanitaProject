package com.lajuanita.backend.solicitante;

import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.venta.VentaEquipo;

/**
 * Lo que una ficha del buzón produjo: una reserva, una inscripción o una venta.
 *
 * <p><b>Es un tipo y no tres parámetros anulables, y esa es toda la razón de que
 * exista.</b> Con una firma {@code atender(reserva, inscripcion, venta, autor)},
 * pasar dos —o ninguna— compila perfecto y lo rechaza recién la base, con un
 * mensaje de constraint. Sellado, <b>el compilador es el que garantiza que sea
 * exactamente uno</b>, que es lo mismo que el CHECK
 * {@code solicitante_atendido_produjo_algo} pide del otro lado.
 *
 * <p>Es la contracara de una decisión que este proyecto ya tomó al revés y con
 * razón: {@code AltaSenaRequest} y {@code AltaPreconfirmacionRequest} son dos
 * records en vez de uno con una bandera, porque <i>"la misma estructura no puede
 * significar dos cosas según un campo"</i>. Acá el problema es el simétrico —tres
 * campos donde va uno— y la solución es la misma familia.
 *
 * <p><b>No hay destino para Mix & Mastering</b>, y no es un olvido: no entra al
 * buzón. Llega por WhatsApp a Ghezz y se carga a mano, que es la decisión vigente
 * del Módulo 6 y lo que `V20` ya había resuelto igual.
 */
public sealed interface DestinoDeLaFicha {

    /**
     * Escribirse en la ficha.
     *
     * <p>Sólo lo llama {@code Solicitante#atender}, que además pone el estado y la
     * firma: las tres cosas van juntas o la base rechaza la fila.
     */
    void anotarEn(Solicitante ficha);

    /** Lo que pidió una cabina o una grabación de set. */
    record DeUnaReserva(Reserva reserva) implements DestinoDeLaFicha {
        @Override
        public void anotarEn(Solicitante ficha) {
            ficha.setReserva(reserva);
        }
    }

    /** Lo que pidió un curso. */
    record DeUnaInscripcion(Inscripcion inscripcion) implements DestinoDeLaFicha {
        @Override
        public void anotarEn(Solicitante ficha) {
            ficha.setInscripcion(inscripcion);
        }
    }

    /** Lo que consultó por equipos. */
    record DeUnaVenta(VentaEquipo venta) implements DestinoDeLaFicha {
        @Override
        public void anotarEn(Solicitante ficha) {
            ficha.setVentaEquipo(venta);
        }
    }
}
