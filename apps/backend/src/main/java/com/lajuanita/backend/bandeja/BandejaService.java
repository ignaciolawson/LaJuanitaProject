package com.lajuanita.backend.bandeja;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.bandeja.dto.Pendientes;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.solicitante.SolicitanteRepository;
import com.lajuanita.backend.solicitud.EstadoReprogramacion;
import com.lajuanita.backend.solicitud.EstadoSolicitud;
import com.lajuanita.backend.solicitud.SolicitudReprogramacionRepository;
import com.lajuanita.backend.solicitud.SolicitudReservaRepository;

/**
 * Cuántas cosas hay esperando en cada bandeja de administración.
 *
 * <p>Tres {@code COUNT} y nada más. El servicio existe igual —en vez de contar
 * desde el controller— porque <b>la definición de "pendiente" es de negocio y no
 * de la pantalla</b>: es el estado inicial de cada una de las tres tablas, y el
 * día que alguna gane un estado intermedio ("en revisión", pongamos), el número
 * del menú tiene que cambiar acá y no en el sidebar.
 */
@Service
public class BandejaService {

    private final SolicitudReservaRepository pedidosDeSala;
    private final SolicitudReprogramacionRepository pedidosDeCambio;
    private final SolicitanteRepository buzon;
    private final PagoService pagos;

    public BandejaService(SolicitudReservaRepository pedidosDeSala,
            SolicitudReprogramacionRepository pedidosDeCambio,
            SolicitanteRepository buzon,
            PagoService pagos) {
        this.pedidosDeSala = pedidosDeSala;
        this.pedidosDeCambio = pedidosDeCambio;
        this.buzon = buzon;
        this.pagos = pagos;
    }

    @Transactional(readOnly = true)
    public Pendientes contar() {
        return new Pendientes(
                pedidosDeSala.countByEstado(EstadoSolicitud.PENDIENTE),
                pedidosDeCambio.countByEstado(EstadoReprogramacion.PENDIENTE),
                // ⚠️ **Abiertas y no PENDIENTE**, que era la mitad del bug que `V27`
                // cerró: este contador y la lista del buzón dejaban de mirar en el
                // mismo punto —al crear la cuenta— así que las dos cosas que
                // existen para que no se pierda nadie se apagaban juntas. Las dos
                // leen `FichaAbierta` ahora.
                buzon.contarAbiertas(),
                // La lista de la pantalla, contada. Es más caro que un COUNT y
                // vale la pena: es la única forma de que el número y la lista no
                // puedan discrepar — la regla de "cuando el conjunto ya tiene
                // nombre, usá el nombre", aplicada a una definición entera.
                pagos.deudores().size());
    }
}
