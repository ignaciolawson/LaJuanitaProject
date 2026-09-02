package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.dinero.Importe;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.Egreso;
import com.lajuanita.backend.usuario.Usuario;

/** Una fila del listado de egresos. */
public record EgresoResumen(
        Long idEgreso,
        BigDecimal monto,
        Moneda moneda,
        BigDecimal cotizacionDolar,
        String concepto,
        /** El nombre de la cuenta si la hay; si no, el texto libre. */
        String destinatario,
        Long idUsuarioDestino,
        /**
         * Si esta plata es un sueldo (`mejoras.md` §12 · C3).
         *
         * <p>Es {@code idUsuarioDestino != null} con nombre: la fila tiene que
         * poder decir de qué lado del corte está sin que la pantalla vuelva a
         * deducirlo, que es la forma en que dos lugares terminan contando
         * distinto. Ver {@link com.lajuanita.backend.pago.EgresoRepository#listar}
         * para por qué el corte es ése y no la relación de profesor.
         */
        boolean esPagoAProfesor,
        String comprobantePath,
        LocalDate fechaEgreso,
        OffsetDateTime fechaRegistro,
        /**
         * Anulado deja de contar en la caja, pero <b>sigue en el listado</b>: es
         * historial y la fila anulada es la que explica por qué el total cambió.
         */
        boolean anulado,
        String motivoAnulacion,
        OffsetDateTime fechaAnulacion) {

    public static EgresoResumen de(Egreso egreso) {
        Usuario destino = egreso.getUsuarioDestino();

        return new EgresoResumen(
                egreso.getId(),
                Importe.normalizar(egreso.getMonto()),
                egreso.getMoneda(),
                egreso.getCotizacionDolar(),
                egreso.getConcepto(),
                // El nombre de la cuenta gana sobre el texto libre: si el egreso
                // apunta a un profesor, decir su nombre real es más útil que lo
                // que alguien haya tipeado en el campo suelto.
                destino != null
                        ? destino.getNombre() + " " + destino.getApellido()
                        : egreso.getDestinatario(),
                destino == null ? null : destino.getId(),
                destino != null,
                egreso.getComprobantePath(),
                egreso.getFechaEgreso(),
                egreso.getFechaRegistro(),
                egreso.isAnulado(),
                egreso.getMotivoAnulacion(),
                egreso.getFechaAnulacion());
    }
}
