package com.lajuanita.backend.reserva.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import jakarta.validation.Valid;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/**
 * Alta de una reserva: un bloque de tiempo en una sala.
 *
 * <p><b>Puede traer sus participantes, y eso cambió el 2026-08-17</b> (paso 1 de
 * la seña, P8 / DB-04a). Antes acá decía que la reserva se cargaba siempre vacía
 * y que la gente se anotaba después, en otro pedido — y esa decisión es
 * justamente la que hacía imposible la regla de la seña: el
 * {@code CONSTRAINT TRIGGER} de `V10` exige al COMMIT que haya dinero detrás de
 * la reserva, y para una clase ese dinero llega por la inscripción del
 * participante. Con el alta vacía, al COMMIT no hay participante, no hay
 * inscripción, y <b>toda alta de clase se rechaza</b>.
 *
 * <p>De las tres salidas posibles se eligió <b>adaptar el flujo, no la regla</b>
 * (Ignacio, 2026-08-16): las otras dos convertían la invariante en condicional
 * —<i>"toda reserva tiene plata detrás, salvo que esté vacía"</i>— y esta regla
 * existe porque el cliente dijo que <b>no hay excepción</b>.
 *
 * <p><b>La lista es opcional, no obligatoria</b>, y esa mitad de la decisión
 * también importa: un alquiler de cabina no tiene participantes y su plata llega
 * por {@code pago.id_reserva}. Exigirla haría incargable la mitad del calendario.
 *
 * <p>Anotar a alguien <b>después</b> sigue existiendo
 * ({@code POST /api/reservas/{id}/participantes}): una clase grupal a la que se
 * suma un alumno la semana siguiente es un gesto real. Lo que ya no hace falta es
 * que sea el <i>único</i> camino.
 *
 * <p><b>Las clases de un curso se cargan a mano, de a una</b> (P7, decidido el
 * 2026-08-16). Se evaluó que el sistema generara las ocho semanales al inscribir
 * y se descartó.
 */
public record AltaReservaRequest(

        @NotNull(message = "Elegí la sala.")
        Long idSala,

        @NotNull(message = "Elegí para qué se usa la sala.")
        Long idTipoUso,

        /** Opcional (P37): se puede cargar la clase antes de saber quién la da. */
        Long idProfesor,

        @NotNull(message = "Poné la fecha.")
        LocalDate fecha,

        @NotNull(message = "Poné la hora de inicio.")
        LocalTime horaInicio,

        @NotNull(message = "Poné la hora de fin.")
        LocalTime horaFin,

        String notas,

        /**
         * La reserva que esta reemplaza, cuando es una recuperación. Ninguna
         * clase se pierde (P2): la vieja queda REPROGRAMADA y esta la apunta.
         */
        Long idReservaRecupera,

        String motivoReprogramacion,

        /**
         * Quiénes asisten, en la misma transacción que la reserva.
         *
         * <p><b>El {@code @Valid} no es decorativo:</b> sin él las validaciones de
         * cada {@link AltaParticipanteRequest} —el {@code @NotNull} de
         * {@code idUsuario}— no corren, y un participante sin persona llega hasta
         * el {@code NOT NULL} de la base como un 409 que no señala ningún campo.
         *
         * <p>Y va <b>adentro</b> del {@code List<>}, no delante: sobre el
         * contenedor todavía funciona pero Hibernate Validator lo marca deprecado
         * (HV000271) y lo grita tres veces en cada arranque.
         *
         * <p>Puede venir en null o vacía: ver la cabecera del record.
         */
        List<@Valid AltaParticipanteRequest> participantes,

        /**
         * La seña, para las reservas que no son clase.
         *
         * <p>El otro camino del dinero. Ver {@link AltaSenaRequest}: un alquiler no
         * tiene inscripción que lo cubra, así que su plata es un {@code pago}
         * apuntando a esta reserva, y tiene que entrar en la misma transacción
         * porque no puede apuntar a algo que todavía no existe.
         */
        @Valid AltaSenaRequest sena,

        /**
         * La otra forma de que la reserva nazca: <b>apartada, con la deuda
         * anotada</b> (`mejoras.md` §13 · C1).
         *
         * <p>Excluyente con {@link #sena()}: o la plata entró, o quedó anotada con
         * su plazo. Ver {@link AltaPreconfirmacionRequest}.
         */
        @Valid AltaPreconfirmacionRequest preconfirmacion) {

    /**
     * <b>O se cobra, o se aparta. Nunca las dos.</b>
     *
     * <p>Con las dos, la reserva nacería PRECONFIRMADA <i>y</i> con plata adentro:
     * un plazo corriendo sobre algo ya pagado, que es lo que el CHECK
     * {@code reserva_preconfirmada_vence} existe para que no pase. La base lo
     * rechazaría igual; esto lo dice antes y señalando el campo.
     */
    @AssertTrue(message = "Una reserva se cobra o se aparta con la deuda anotada, no las dos cosas.")
    public boolean isCobradaOApartada() {
        return sena == null || preconfirmacion == null;
    }

    /**
     * <b>Esta es la regla DB-11</b>, y por eso está acá y no en la base.
     *
     * <p>{@code reserva.periodo} es una columna generada que se computa
     * <b>antes</b> que los CHECK de la fila. Con las horas invertidas,
     * {@code tsrange(20:00, 19:00)} lanza <i>"range lower bound must be less than
     * or equal to range upper bound"</i> — un error de dato, sin nombre de
     * constraint, que {@code ManejadorDeErrores} no puede traducir a nada útil. El
     * CHECK {@code reserva_horas_validas} que diría la frase correcta <b>no se
     * alcanza nunca</b>.
     *
     * <p>No se arregla en la base: la columna viene de `V1` y una migración
     * aplicada no se edita. El CHECK queda como defensa en profundidad; la vía de
     * error visible es esta.
     */
    @AssertTrue(message = "La hora de fin tiene que ser posterior a la de inicio.")
    public boolean isHorarioValido() {
        return horaInicio == null || horaFin == null || horaFin.isAfter(horaInicio);
    }
}
