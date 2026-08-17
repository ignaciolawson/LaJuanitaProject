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
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * La plata que sale (§6, pantalla 5).
 *
 * <p><b>Se carga, se lista y se anula</b> (la anulación, desde el 2026-08-17). Lo
 * que no hay es edición ni borrado: `V9` prohíbe el DELETE sobre {@code egreso}
 * desde que le dio estado de anulación, y ese es el camino — <b>un egreso mal
 * cargado se anula y se vuelve a cargar</b>.
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

    /**
     * Anula un egreso mal cargado.
     *
     * <p><b>No se edita y no se borra:</b> `V9` prohíbe el DELETE desde que le dio
     * estado de anulación. Anular saca el monto del balance, que para la caja es lo
     * mismo que borrarlo, así que lleva las mismas tres exigencias que toda otra
     * excepción del esquema — y la consulta de la caja lo excluye
     * ({@code EgresoRepository.porMoneda}), que es lo que hace que anular
     * signifique algo.
     */
    @Transactional
    public EgresoResumen anular(Long id, String motivo, Long idAutor) {
        Egreso egreso = egresos.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el egreso " + id + "."));

        // La base no lo impide -anular dos veces cumple la constraint igual- pero
        // la segunda anulación pisa el autor y el motivo de la primera, y con eso
        // se pierde quién dio de baja la plata de verdad. Misma guarda que `pago`.
        if (egreso.isAnulado()) {
            throw new SolicitudInvalidaException("Ese egreso ya está anulado.");
        }

        egreso.anular(idAutor, motivo.trim());

        // Sin el flush el UPDATE viaja recién en el commit y esta respuesta
        // describiría una fila que la base todavía no aceptó:
        // `egreso_anulacion_justificada` tiene que hablar ACÁ.
        egresos.flush();
        return EgresoResumen.de(egreso);
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
