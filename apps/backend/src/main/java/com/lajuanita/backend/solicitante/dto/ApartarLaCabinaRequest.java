package com.lajuanita.backend.solicitante.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalTime;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;

/**
 * Apartarle la cabina a quien la pidió desde la web, <b>sin salir del buzón</b>
 * (`mejoras.md` §15 · Fase 3).
 *
 * <h2>Qué resuelve</h2>
 *
 * <p>Hasta acá el recorrido eran tres pantallas: crear la cuenta en el buzón, ir
 * al calendario a cargar la reserva, volver al buzón a cerrar la ficha. <b>Y el
 * paso del medio es el que se perdía</b>, que es la queja que abrió esta sección:
 * <i>"una vez que ponés dar cuenta desaparece el coso, entonces quizás ya te
 * olvidaste qué quería"</i>. Con esto la cuenta, la reserva apartada, la deuda y
 * el cierre de la ficha son <b>un solo movimiento</b>.
 *
 * <h2>Lo que NO viaja acá, y por qué</h2>
 *
 * <ul>
 *   <li><b>Quién paga.</b> Es quien mandó la ficha, y la cuenta la crea el mismo
 *       movimiento (P54). Dejarlo elegir sería poder apartarle la cabina a una
 *       persona y anotarle la deuda a otra.
 *   <li><b>El plazo.</b> Lo calcula el servidor —el menor entre 24hs y el inicio
 *       de la reserva (P44/P57)—. Un vencimiento que el cliente pudiera dictar no
 *       es un plazo, es una sugerencia.
 *   <li><b>La hora de fin.</b> Ver {@link #duracionMinutos()}.
 *   <li><b>La seña ya cobrada.</b> Este endpoint <b>siempre</b> aparta con la
 *       deuda anotada. Quien ya transfirió se carga desde el calendario, que es
 *       donde ese camino vive — meterlo acá con una bandera haría que la misma
 *       estructura signifique dos cosas según un campo, que es exactamente por lo
 *       que {@code AltaSenaRequest} y {@code AltaPreconfirmacionRequest} son dos
 *       records y no uno.
 * </ul>
 */
public record ApartarLaCabinaRequest(

        @NotNull(message = "Elegí la sala.")
        Long idSala,

        /**
         * Para qué se usa.
         *
         * <p><b>Tiene que ser un uso solicitable</b> ({@code
         * tipo_uso.solicitable_por_usuario}, P17): alquiler de cabina o grabación
         * de set. No es una lista nueva — es la misma que ya define qué se puede
         * pedir desde el portal, y por la misma razón: una clase se apartaría sin
         * la inscripción que la descuenta, que es lo que P39 prohíbe. Lo verifica
         * el servicio, porque es una regla del catálogo y no del formato.
         */
        @NotNull(message = "Elegí para qué se usa la sala.")
        Long idTipoUso,

        @NotNull(message = "Poné la fecha.")
        LocalDate fecha,

        @NotNull(message = "Poné la hora de inicio.")
        LocalTime horaInicio,

        /**
         * Cuánto dura, en minutos. <b>La hora de fin la calcula el servidor.</b>
         *
         * <p>Es lo que P58 decidió para el formulario de la web —<i>"2 horas" es lo
         * que la persona piensa; la hora de fin la calcula el sistema</i>— y acá
         * vale doble: <b>este pedido transcribe lo que la persona pidió</b>, y su
         * preferencia está guardada justamente así ({@code duracion_minutos}). Con
         * hora de fin, la precarga tendría que hacer esa cuenta en la pantalla, y
         * sería un segundo lugar donde se decide qué significa "dos horas desde
         * las 18".
         *
         * <p>Que la suma se pase de medianoche no necesita regla propia: la hora de
         * fin queda antes que la de inicio y lo rechaza el {@code @AssertTrue} de
         * {@code AltaReservaRequest}, que es el que ya dice esa frase (DB-11).
         */
        @NotNull(message = "Poné cuánto dura.")
        @Min(value = 15, message = "La reserva más corta es de 15 minutos.")
        Integer duracionMinutos,

        @NotNull(message = "Poné el monto que hay que abonar.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se va a cobrar.")
        MedioPago medioPago,

        /** Lo que se le dice. Viaja hasta la notificación, así que se lee solo. */
        String mensaje) {

    /** Espeja {@code pago_usd_con_cotizacion}: sin ella el importe no se reconstruye. */
    @AssertTrue(message = "Un importe en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }
}
