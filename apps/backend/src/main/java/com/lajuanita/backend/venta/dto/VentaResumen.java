package com.lajuanita.backend.venta.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import com.lajuanita.backend.dinero.Importe;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.Pago;
import com.lajuanita.backend.pago.dto.ComprobanteResumen;
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

        /**
         * El pago vivo de esta venta, para poder adjuntarle el comprobante.
         *
         * <p>⚠️ <b>{@code idPago} puede venir con {@code cobrada} en falso</b>, y
         * no es una contradicción: son las dos lecturas que `V12` enseñó a no
         * confundir. Una deuda anotada es un pago vivo —se le adjunta el respaldo
         * de la transferencia, que es justo el papel con el que después se la
         * cobra— y no es plata que entró.
         *
         * <p>Va acá y no como una tabla propia de la venta porque <b>el
         * comprobante se cuelga del pago desde `V21`</b>: es la misma pieza, el
         * mismo endpoint y la misma regla de que un comprobante marcado inválido
         * no se borra ni se edita. Una segunda tabla de archivos para la venta
         * sería una segunda definición de lo mismo.
         */
        Long idPago,

        /**
         * Los comprobantes de ese pago, ya en la fila.
         *
         * <p>Vienen con el pago por el {@code BatchSize} que {@code Pago} declara,
         * o sea una consulta para la página entera. Sin esto la pantalla tendría
         * que pedirlos por fila para poder decir si ya hay respaldo — y "adjuntar"
         * sin ver lo que ya está adjunto termina en el mismo archivo subido tres
         * veces.
         */
        List<ComprobanteResumen> comprobantes,
        /** Anulada sale del total del período pero no del listado: es historial. */
        boolean anulada,
        String motivoAnulacion,
        OffsetDateTime fechaAnulacion) {

    /**
     * @param pago el pago vivo de la venta, o {@code null} si no tiene ninguno
     */
    public static VentaResumen de(VentaEquipo venta, Pago pago) {
        Usuario comprador = venta.getComprador();
        Usuario vendedor = venta.getVendedor();

        // "Cobrada" es ENTRARON y no "tiene un pago": una deuda anotada es un pago
        // vivo y no es plata que entró. Es la distinción de `V12`, y acá las dos
        // salen de la misma fila, así que confundirlas es especialmente fácil.
        boolean cobrada = pago != null && EstadoPago.ENTRARON.contains(pago.getEstadoPago());

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
                pago == null ? null : pago.getId(),
                pago == null
                        ? List.of()
                        : pago.getComprobantes().stream().map(ComprobanteResumen::de).toList(),
                venta.isAnulada(),
                venta.getMotivoAnulacion(),
                venta.getFechaAnulacion());
    }
}
