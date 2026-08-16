package com.lajuanita.backend.reserva;

import java.util.Set;

/**
 * Estado de una reserva. Coincide con el CHECK {@code reserva_estado_valido}.
 *
 * <p><b>{@link #OCUPAN_LA_SALA} es la definición canónica del esquema</b>, y no
 * un detalle de esta clase. `V1` la escribió una vez y la repite en tres lugares
 * —el EXCLUDE de solapamiento y los dos triggers de bloqueo— con esta
 * advertencia: <i>"si cambia, cambia en los tres o la base empieza a
 * contradecirse"</i>. `V9` la usa dos veces más. Esta constante es la cuarta
 * copia, del lado de Java, y tiene que decir lo mismo que las otras.
 */
public enum EstadoReserva {

    /** Cargada y en pie. */
    CONFIRMADA,

    /** Se le cambió algo y sigue en pie. */
    MODIFICADA,

    /** No va a pasar. Libera la sala. */
    CANCELADA,

    /** Se movió a otra fecha; la reserva nueva apunta a esta. Libera la sala. */
    REPROGRAMADA,

    /** Ya se dictó. */
    FINALIZADA;

    /**
     * Los estados que <b>ocupan la franja</b>. Todo lo que no sea
     * {@link #CANCELADA} ni {@link #REPROGRAMADA}.
     *
     * <p>Se define por lo que queda afuera, igual que en el SQL, porque es la
     * forma en que la regla se piensa: una reserva ocupa su horario salvo que se
     * haya caído.
     */
    public static final Set<EstadoReserva> OCUPAN_LA_SALA =
            Set.of(CONFIRMADA, MODIFICADA, FINALIZADA);

    /** ¿Esta reserva le saca el lugar a otra? */
    public boolean ocupaLaSala() {
        return OCUPAN_LA_SALA.contains(this);
    }
}
