package com.lajuanita.backend.venta;

import java.time.LocalDate;
import java.util.List;
import java.util.Set;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.PagoRepository;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.pago.dto.AltaPagoRequest;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.dto.Pagina;
import com.lajuanita.backend.venta.dto.AltaVentaRequest;
import com.lajuanita.backend.venta.dto.VentaResumen;

/**
 * Venta de equipamiento (§6, pantalla 6) — la última pieza del Módulo 3.
 *
 * <p><b>Se carga y se lista, y nada más</b>, igual que {@code EgresoService} y por
 * la misma razón: `V9` prohíbe el DELETE desde que le dio estado de anulación, y la
 * anulación en sí llega cuando exista la pantalla que la pida. Una operación
 * irreversible sin caso de uso es peor que no tenerla. <b>La consecuencia hay que
 * saberla</b>: una venta mal cargada hoy no se puede corregir ni sacar.
 *
 * <p><b>Esto no es un inventario.</b> No hay stock propio —se vende contra el de
 * Pioneer (§1)— así que no hay unidades que descontar ni catálogo que mantener: es
 * el registro de una operación que ya pasó.
 */
@Service
public class VentaEquipoService {

    private final VentaEquipoRepository ventas;
    private final UsuarioRepository usuarios;
    private final PagoRepository pagosLeidos;

    /** Para el cobro. Igual que en {@code ReservaService}, no hay ciclo. */
    private final PagoService pagos;

    public VentaEquipoService(VentaEquipoRepository ventas,
            UsuarioRepository usuarios,
            PagoRepository pagosLeidos,
            PagoService pagos) {
        this.ventas = ventas;
        this.usuarios = usuarios;
        this.pagosLeidos = pagosLeidos;
        this.pagos = pagos;
    }

    @Transactional(readOnly = true)
    public Pagina<VentaResumen> listar(String buscar, LocalDate desde, LocalDate hasta,
            int pagina, int tamanio) {

        // Por fecha de la venta y no de carga: es la que la pantalla muestra y por
        // la que se filtra, y ordenar por una y filtrar por otra da una lista que
        // parece desordenada. El id desempata las del mismo día.
        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio),
                Sort.by(Sort.Direction.DESC, "fechaVenta").and(Sort.by(Sort.Direction.DESC, "id")));

        var encontradas = ventas.listar(desde, hasta, Busqueda.patron(buscar), paginado);
        Set<Long> cobradas = cobradasEntre(encontradas.getContent());

        return Pagina.de(encontradas.map(v -> VentaResumen.de(v, cobradas.contains(v.getId()))));
    }

    @Transactional
    public VentaResumen registrar(AltaVentaRequest solicitud, Long idAutor) {
        VentaEquipo venta = new VentaEquipo();

        if (solicitud.idUsuarioComprador() != null) {
            venta.setComprador(buscarPersona(solicitud.idUsuarioComprador()));
        }
        venta.setNombreCompradorExterno(normalizar(solicitud.nombreCompradorExterno()));
        venta.setContactoCompradorExterno(normalizar(solicitud.contactoCompradorExterno()));
        venta.setVendedor(buscarPersona(solicitud.idUsuarioVendedor()));

        venta.setCategoria(normalizar(solicitud.categoria()));
        venta.setMarca(normalizar(solicitud.marca()));
        venta.setModeloEquipo(solicitud.modeloEquipo().trim());

        venta.setPrecio(solicitud.precio());
        venta.setMoneda(solicitud.moneda());
        venta.setCotizacionDolar(solicitud.cotizacionDolar());
        venta.setNotas(normalizar(solicitud.notas()));
        if (solicitud.fechaVenta() != null) {
            venta.setFechaVenta(solicitud.fechaVenta());
        }

        // `saveAndFlush` y no `save`: el cobro de abajo necesita el id, y además el
        // alta devuelve la fila y `fecha_registro` la escribe la base.
        VentaEquipo guardada = ventas.saveAndFlush(venta);

        boolean cobrada = solicitud.medioPago() != null;
        if (cobrada) {
            registrarElCobro(solicitud, guardada, idAutor);
        }

        return VentaResumen.de(guardada, cobrada);
    }

    /**
     * El cobro de la venta, en la misma transacción.
     *
     * <p>Se delega en {@code PagoService} en vez de armar el {@code Pago} acá, por
     * lo mismo que hace la seña de una reserva: las reglas de la plata son suyas y
     * una segunda copia es la que se olvida de una.
     *
     * <p><b>Por el precio total y no una parte</b>: a diferencia de una reserva,
     * acá el precio está en la fila, así que un cobro parcial se podría expresar —
     * pero nadie lo pidió y §1 describe la venta como una operación de una sola vez.
     * El día que haga falta, es un campo más en el request, no otro diseño.
     */
    private void registrarElCobro(AltaVentaRequest solicitud, VentaEquipo venta, Long idAutor) {
        pagos.registrar(new AltaPagoRequest(
                solicitud.idUsuarioComprador(),
                null, null, null, venta.getId(),
                "Venta de " + venta.getModeloEquipo(),
                venta.getPrecio(),
                venta.getMoneda(),
                venta.getCotizacionDolar(),
                solicitud.medioPago(),
                null, null,
                EstadoPago.PAGADO,
                venta.getFechaVenta(),
                null),
                idAutor);
    }

    private Set<Long> cobradasEntre(List<VentaEquipo> filas) {
        List<Long> ids = filas.stream().map(VentaEquipo::getId).toList();
        if (ids.isEmpty()) {
            // `IN ()` no es SQL válido: sin esto, una página vacía revienta.
            return Set.of();
        }
        return Set.copyOf(pagosLeidos.ventasConPago(ids, EstadoPago.ENTRARON));
    }

    private Usuario buscarPersona(Long id) {
        return usuarios.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
