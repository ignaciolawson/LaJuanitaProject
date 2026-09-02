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

    /**
     * El horario apartado con la deuda anotada y su vencimiento (`V24`).
     *
     * <p><b>Ocupa la franja</b> — ése es el punto entero: el que pidió primero se
     * queda con el horario mientras consigue la plata. Lo que la hace legítima
     * frente a la regla que `V12` cerró es que <b>tiene plazo</b>: la base obliga
     * a fechar el vencimiento, y al cumplirse la reserva se cancela sola.
     *
     * <p>Se entra acá <b>sólo al crear</b> la reserva y se sale sólo a
     * {@link #CONFIRMADA} (entró la plata) o {@link #CANCELADA} (se venció, o
     * administración la dio de baja). Lo sostiene un trigger de `V24` §5.
     */
    PRECONFIRMADA,

    /** Cargada, cobrada y en pie. */
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
     *
     * <p>⚠️ <b>Y acá está escrita por enumeración, que es la diferencia que
     * cuesta.</b> `V24` agregó {@link #PRECONFIRMADA} y del lado SQL no hubo nada
     * que tocar —las cinco copias dicen {@code NOT IN ('CANCELADA','REPROGRAMADA')},
     * así que un estado nuevo que ocupa entra solo—; esta constante hubo que
     * editarla a mano. Un estado nuevo que ocupe y no se agregue acá no rompe
     * nada: simplemente deja de ocupar del lado de Java, y las dos mitades del
     * sistema empiezan a contestar distinto.
     */
    public static final Set<EstadoReserva> OCUPAN_LA_SALA =
            Set.of(PRECONFIRMADA, CONFIRMADA, MODIFICADA, FINALIZADA);

    /** ¿Esta reserva le saca el lugar a otra? */
    public boolean ocupaLaSala() {
        return OCUPAN_LA_SALA.contains(this);
    }
}
