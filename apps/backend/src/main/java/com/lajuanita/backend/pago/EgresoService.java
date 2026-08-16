package com.lajuanita.backend.pago;

import java.time.LocalDate;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.pago.dto.AltaEgresoRequest;
import com.lajuanita.backend.pago.dto.EgresoResumen;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * La plata que sale (§6, pantalla 5).
 *
 * <p><b>Se carga y se lista, y nada más.</b> No hay edición ni borrado: `V9`
 * prohíbe el DELETE sobre {@code egreso} desde que le dio estado de anulación, y
 * la anulación en sí llega cuando exista la pantalla que la pida — hoy nadie la
 * pidió y una operación irreversible sin caso de uso es peor que no tenerla.
 */
@Service
public class EgresoService {

    private final EgresoRepository egresos;
    private final com.lajuanita.backend.usuario.UsuarioRepository usuarios;

    public EgresoService(EgresoRepository egresos,
            com.lajuanita.backend.usuario.UsuarioRepository usuarios) {
        this.egresos = egresos;
        this.usuarios = usuarios;
    }

    @Transactional(readOnly = true)
    public Pagina<EgresoResumen> listar(String buscar, LocalDate desde, LocalDate hasta,
            int pagina, int tamanio) {

        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio),
                Sort.by(Sort.Direction.DESC, "fechaEgreso").and(Sort.by(Sort.Direction.DESC, "id")));

        return Pagina.de(egresos.listar(desde, hasta, Busqueda.patron(buscar), paginado)
                .map(EgresoResumen::de));
    }

    @Transactional
    public EgresoResumen registrar(AltaEgresoRequest solicitud, Long idAutor) {
        Egreso egreso = new Egreso();
        egreso.setMonto(solicitud.monto());
        egreso.setMoneda(solicitud.moneda());
        egreso.setCotizacionDolar(solicitud.cotizacionDolar());
        egreso.setConcepto(solicitud.concepto().trim());
        egreso.setDestinatario(normalizar(solicitud.destinatario()));
        egreso.setComprobantePath(normalizar(solicitud.comprobantePath()));
        // El autor sale del token: es la mitad de "todo egreso queda con usuario,
        // fecha y motivo" que el cliente no puede aportar.
        egreso.setIdUsuarioRegistra(idAutor);

        if (solicitud.idUsuarioDestino() != null) {
            egreso.setUsuarioDestino(usuarios.findById(solicitud.idUsuarioDestino())
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No existe el usuario " + solicitud.idUsuarioDestino() + ".")));
        }
        if (solicitud.fechaEgreso() != null) {
            egreso.setFechaEgreso(solicitud.fechaEgreso());
        }

        return EgresoResumen.de(egresos.saveAndFlush(egreso));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
