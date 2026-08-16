package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.dinero.Importe;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.MedioPago;
import com.lajuanita.backend.pago.Pago;

/**
 * Una fila del listado de pagos.
 *
 * <p>{@code destino} y {@code queSalda} vienen resueltos del servidor: la
 * pantalla necesita decir <i>"Inscripción · DJ inicial"</i> y no
 * <i>"id_inscripcion: 42"</i>, y armar eso en el front obliga a cruzar cuatro
 * listas por fila para algo que acá es un {@code switch}.
 */
public record PagoResumen(
        Long idPago,
        Long idUsuario,
        String nombre,
        String apellido,
        String email,

        /** Cuál de los cuatro destinos: `INSCRIPCION`, `RESERVA`, … */
        String destino,
        Long idDestino,
        /** Ya legible: "DJ · inicial", "Sala 2 · 14/08 10:00". */
        String queSalda,

        String concepto,
        BigDecimal monto,
        Moneda moneda,
        BigDecimal cotizacionDolar,
        MedioPago medioPago,
        BigDecimal descuentoPorcentaje,
        String motivoDescuento,
        EstadoPago estadoPago,
        /** Si suma a la caja. Lo decide `EstadoPago.ENTRARON`, no la pantalla. */
        boolean entro,

        String comprobantePath,
        boolean comprobanteInvalido,
        String motivoInvalidacion,

        String motivoAnulacion,
        OffsetDateTime fechaAnulacion,

        LocalDate fechaPago,
        OffsetDateTime fechaRegistro) {

    public static PagoResumen de(Pago pago) {
        var persona = pago.getUsuario();

        return new PagoResumen(
                pago.getId(),
                persona.getId(),
                persona.getNombre(),
                persona.getApellido(),
                persona.getEmail(),
                destinoDe(pago),
                idDestinoDe(pago),
                queSaldaDe(pago),
                pago.getConcepto(),
                Importe.normalizar(pago.getMonto()),
                pago.getMoneda(),
                pago.getCotizacionDolar(),
                pago.getMedioPago(),
                pago.getDescuentoPorcentaje(),
                pago.getMotivoDescuento(),
                pago.getEstadoPago(),
                pago.getEstadoPago().entro(),
                pago.getComprobantePath(),
                pago.isComprobanteInvalido(),
                pago.getMotivoInvalidacion(),
                pago.getMotivoAnulacion(),
                pago.getFechaAnulacion(),
                pago.getFechaPago(),
                pago.getFechaRegistro());
    }

    private static String destinoDe(Pago pago) {
        if (pago.getInscripcion() != null) return "INSCRIPCION";
        if (pago.getReserva() != null) return "RESERVA";
        if (pago.getIdTrabajoMastering() != null) return "TRABAJO_MASTERING";
        return "VENTA_EQUIPO";
    }

    private static Long idDestinoDe(Pago pago) {
        if (pago.getInscripcion() != null) return pago.getInscripcion().getId();
        if (pago.getReserva() != null) return pago.getReserva().getId();
        if (pago.getIdTrabajoMastering() != null) return pago.getIdTrabajoMastering();
        return pago.getIdVentaEquipo();
    }

    /**
     * Los dos destinos con módulo se nombran; los dos que todavía no lo tienen
     * salen con su id. <b>Se nombran igual</b> en vez de omitirse: una fila que
     * no dice qué salda es exactamente el problema que este sistema resuelve.
     */
    private static String queSaldaDe(Pago pago) {
        if (pago.getInscripcion() != null) {
            var inscripcion = pago.getInscripcion();
            return inscripcion.getNivel() == null
                    ? inscripcion.getDisciplina().name()
                    : inscripcion.getDisciplina().name() + " · " + inscripcion.getNivel().name();
        }
        if (pago.getReserva() != null) {
            var reserva = pago.getReserva();
            return reserva.getSala().getNombreSala() + " · " + reserva.getFecha() + " " + reserva.getHoraInicio();
        }
        if (pago.getIdTrabajoMastering() != null) {
            return "Trabajo de mastering #" + pago.getIdTrabajoMastering();
        }
        return "Venta de equipo #" + pago.getIdVentaEquipo();
    }
}
