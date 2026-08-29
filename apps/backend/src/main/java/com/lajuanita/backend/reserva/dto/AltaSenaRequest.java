package com.lajuanita.backend.reserva.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * La seña de una reserva, <b>en el mismo pedido que la reserva</b>.
 *
 * <p>Es la otra mitad de {@link AltaReservaRequest#participantes()}, y existe por
 * la misma razón: `V10` verifica al COMMIT que haya dinero detrás de la reserva, y
 * ese dinero llega por dos caminos. Para una clase lo trae la inscripción del que
 * asiste; para <b>un alquiler de cabina o una grabación de set no hay inscripción
 * ninguna</b>, así que la plata tiene que ser un {@code pago} apuntando a la
 * reserva — y un pago no puede apuntar a una reserva que todavía no existe. Los
 * dos entran juntos o no entra ninguno.
 *
 * <p>Sin esto, `V10` deja <b>incargable la mitad del calendario</b>: se detectó
 * escribiendo la migración, probando que un alquiler dejaba de poder cargarse.
 *
 * <p><b>El monto se escribe a mano y no se calcula</b>, y no es un atajo: el
 * precio de un alquiler sale de las horas por una tarifa que todavía no está en el
 * sistema (P13, lo único que sigue abierto del Módulo 3). Cuando exista, el 50%
 * pasa a ser una cuenta y lo verifica la base; hasta entonces lo sostiene quien
 * carga.
 *
 * <p>Va como {@code SENADO} y no como {@code PAGADO}: es plata que entró contra un
 * total que todavía no se completó, que es exactamente lo que dice ese estado.
 */
public record AltaSenaRequest(

        /**
         * Quién paga. <b>No sale de la reserva</b>: `reserva` no tiene titular —
         * quienes participan viven en {@code reserva_participante} y un alquiler
         * puede no tener ninguno. Que el pagador sea explícito es también lo que
         * pide `pago.id_usuario`.
         */
        @NotNull(message = "Decí quién paga la seña.")
        Long idUsuario,

        @NotNull(message = "Poné el monto de la seña.")
        @Positive(message = "El monto tiene que ser mayor a cero.")
        BigDecimal monto,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cómo se pagó.")
        MedioPago medioPago,

        /**
         * El comprobante de la seña. <b>Opcional</b>: una seña en efectivo no tiene
         * ninguno, y exigirlo dejaría media caja sin poder cargarse.
         *
         * <p><b>Faltaba, y era el hallazgo #5 de `docs/mejoras.md`.</b>
         * {@code pago.comprobante_path} existe desde `V1` y el alta manual de
         * `/admin/pagos` ya lo usaba; este record —el que se usa al cargar una
         * reserva y al aprobar un pedido de sala— nunca lo tuvo. O sea que la seña
         * de una transferencia entraba sin su respaldo, que es justamente el caso
         * donde el comprobante importa.
         */
        @Size(max = 500, message = "La ruta del comprobante no puede pasar de 500 caracteres.")
        String comprobantePath) {

    /** Espeja {@code pago_usd_con_cotizacion}: sin ella el importe no se reconstruye. */
    @AssertTrue(message = "Un pago en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }
}
