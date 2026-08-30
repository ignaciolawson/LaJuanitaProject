package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

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

        /** Null si el pagador no tiene cuenta (`V19`). Ver {@link #pagador}. */
        Long idUsuario,
        String nombre,
        String apellido,
        String email,

        /**
         * Cómo se llama quien pagó, <b>tenga cuenta o no</b>. Siempre tiene valor.
         *
         * <p>Existe para que la pantalla tenga un solo campo que mostrar en vez de
         * un `if` por fila, y porque una fila de plata sin nombre es exactamente el
         * problema que este sistema resuelve.
         */
        String pagador,

        /** Si el pagador no tiene cuenta. La pantalla lo marca; no se le puede cruzar el estado de cuenta. */
        boolean pagadorSinCuenta,

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

        /**
         * Los respaldos adjuntos, en orden de carga. <b>Vacía, no null</b>, cuando
         * no hay ninguno: la pantalla dibuja "sin comprobante" y no un hueco.
         *
         * <p>Viaja en el listado y no solo en el detalle a propósito. Es la misma
         * razón por la que {@code queSalda} viene resuelto del servidor: la fila
         * tiene que poder decir <i>si este pago tiene respaldo</i> sin un pedido por
         * fila, que es justo lo que hace inservible un listado de cien pagos.
         */
        List<ComprobanteResumen> comprobantes,

        String motivoAnulacion,
        OffsetDateTime fechaAnulacion,

        LocalDate fechaPago,
        OffsetDateTime fechaRegistro) {

    /**
     * <p>⚠️ <b>Desde `V19` un pago puede no tener cuenta</b>, así que
     * {@code getUsuario()} puede venir en null y este método era uno de los cinco
     * lugares que lo asumían presente (`mejoras.md` §9.1). Sin el chequeo, listar
     * los pagos reventaba con un NPE en la primera fila de una venta cobrada a un
     * comprador externo.
     *
     * <p>Los tres campos de la persona salen en null y el nombre lo aporta
     * {@code pagador}, que <b>siempre</b> tiene valor: es el que la pantalla
     * muestra, y por eso no hay una fila que diga "sin datos".
     */
    public static PagoResumen de(Pago pago) {
        var persona = pago.getUsuario();

        return new PagoResumen(
                pago.getId(),
                persona == null ? null : persona.getId(),
                persona == null ? null : persona.getNombre(),
                persona == null ? null : persona.getApellido(),
                persona == null ? null : persona.getEmail(),
                pagadorDe(pago),
                persona == null,
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
                pago.getComprobantes().stream().map(ComprobanteResumen::de).toList(),
                pago.getMotivoAnulacion(),
                pago.getFechaAnulacion(),
                pago.getFechaPago(),
                pago.getFechaRegistro());
    }

    /**
     * El nombre de quien pagó, por el camino que sea. <b>Nunca vuelve vacío</b>: el
     * CHECK {@code pago_pagador_identificado} garantiza que uno de los dos está.
     */
    private static String pagadorDe(Pago pago) {
        var persona = pago.getUsuario();
        if (persona != null) {
            return persona.getNombre() + " " + persona.getApellido();
        }
        return pago.getNombrePagadorExterno();
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
