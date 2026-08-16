package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

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
        String comprobantePath,
        LocalDate fechaEgreso,
        OffsetDateTime fechaRegistro) {

    public static EgresoResumen de(Egreso egreso) {
        Usuario destino = egreso.getUsuarioDestino();

        return new EgresoResumen(
                egreso.getId(),
                egreso.getMonto(),
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
                egreso.getComprobantePath(),
                egreso.getFechaEgreso(),
                egreso.getFechaRegistro());
    }
}
