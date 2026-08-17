package com.lajuanita.backend.venta.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.dinero.Importe;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.venta.VentaEquipo;

/** Una fila del listado de ventas. */
public record VentaResumen(
        Long idVenta,
        /** El nombre de la cuenta si la hay; si no, el texto libre. */
        String comprador,
        Long idUsuarioComprador,
        String contactoCompradorExterno,
        String vendedor,
        Long idUsuarioVendedor,
        String categoria,
        String marca,
        String modeloEquipo,
        BigDecimal precio,
        Moneda moneda,
        BigDecimal cotizacionDolar,
        LocalDate fechaVenta,
        String notas,
        OffsetDateTime fechaRegistro,
        /**
         * Si ya entró la plata de esta venta.
         *
         * <p>Lo calcula el service contra `pago`, no la entidad: la venta y su
         * cobro son dos hechos y la relación va al revés
         * ({@code pago.id_venta_equipo}). Va en el listado porque una venta sin
         * cobrar que no se ve es una venta que nadie reclama.
         */
        boolean cobrada,
        /** Anulada sale del total del período pero no del listado: es historial. */
        boolean anulada,
        String motivoAnulacion,
        OffsetDateTime fechaAnulacion) {

    public static VentaResumen de(VentaEquipo venta, boolean cobrada) {
        Usuario comprador = venta.getComprador();
        Usuario vendedor = venta.getVendedor();

        return new VentaResumen(
                venta.getId(),
                // La cuenta gana sobre el texto libre, igual que en `EgresoResumen`:
                // si la venta apunta a un alumno, su nombre real es más confiable
                // que lo que alguien haya tipeado en el campo suelto.
                comprador != null
                        ? comprador.getNombre() + " " + comprador.getApellido()
                        : venta.getNombreCompradorExterno(),
                comprador == null ? null : comprador.getId(),
                venta.getContactoCompradorExterno(),
                vendedor.getNombre() + " " + vendedor.getApellido(),
                vendedor.getId(),
                venta.getCategoria(),
                venta.getMarca(),
                venta.getModeloEquipo(),
                // La misma normalización que `pago` y `egreso`: sin esto el mismo
                // importe sale con tres escalas distintas según de dónde se lea.
                Importe.normalizar(venta.getPrecio()),
                venta.getMoneda(),
                venta.getCotizacionDolar(),
                venta.getFechaVenta(),
                venta.getNotas(),
                venta.getFechaRegistro(),
                cobrada,
                venta.isAnulada(),
                venta.getMotivoAnulacion(),
                venta.getFechaAnulacion());
    }
}
