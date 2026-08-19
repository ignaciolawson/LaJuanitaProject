package com.lajuanita.backend.notificacion;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.notificacion.dto.NotificacionResumen;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.Usuario;

/**
 * La bandeja de avisos.
 *
 * <p>Dos mitades bien distintas: {@link #avisar} la escriben otros servicios
 * cuando pasa algo que a alguien le importa, y el resto lo lee el portal sobre lo
 * suyo.
 *
 * <p><b>Ninguna lectura ni escritura acepta un destinatario por parámetro desde
 * el cliente.</b> El id sale del token en el controller y llega hasta la
 * consulta; no hay forma de pedir la bandeja de otro porque no hay consulta que
 * lo permita.
 */
@Service
public class NotificacionService {

    private final NotificacionRepository notificaciones;

    public NotificacionService(NotificacionRepository notificaciones) {
        this.notificaciones = notificaciones;
    }

    /**
     * Dejar un aviso. Lo llaman otros servicios, no el cliente.
     *
     * <p>No existe endpoint para esto y no debería existir: un aviso es la
     * consecuencia de un hecho del negocio —te aprobaron la sala, te la
     * rechazaron—, no algo que alguien manda. Si algún día hace falta un mensaje
     * escrito a mano, es otra cosa y va a tener su propia tabla.
     */
    @Transactional
    public Notificacion avisar(Usuario destino,
            TipoNotificacion tipo,
            String titulo,
            String contenido,
            String urlDestino) {

        Notificacion aviso = new Notificacion();
        aviso.setDestino(destino);
        aviso.setTipo(tipo);
        aviso.setTitulo(titulo);
        aviso.setContenido(contenido);
        aviso.setUrlDestino(urlDestino);

        return notificaciones.save(aviso);
    }

    @Transactional(readOnly = true)
    public List<NotificacionResumen> mias(Long idUsuario, boolean soloNoLeidas) {
        return notificaciones.deLaPersona(idUsuario, soloNoLeidas).stream()
                .map(NotificacionResumen::de)
                .toList();
    }

    @Transactional(readOnly = true)
    public long sinLeer(Long idUsuario) {
        return notificaciones.countByDestinoIdAndLeidaFalse(idUsuario);
    }

    /**
     * Marcar una como leída.
     *
     * <p><b>La notificación de otro se contesta "no existe", no "no podés".</b>
     * Son dos respuestas distintas y la segunda confirma que la fila existe, que
     * es justamente lo que alguien probando ids ajenos quiere averiguar. Es el
     * mismo criterio con el que el login devuelve el mismo 401 para las tres
     * formas de fallar.
     */
    @Transactional
    public NotificacionResumen marcarLeida(Long idNotificacion, Long idUsuario) {
        Notificacion aviso = notificaciones.findById(idNotificacion)
                .filter(n -> n.getDestino().getId().equals(idUsuario))
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe esa notificación (" + idNotificacion + ")."));

        aviso.setLeida(true);
        return NotificacionResumen.de(aviso);
    }

    /** Marcar todas. Devuelve cuántas cambiaron, que es lo que la pantalla muestra. */
    @Transactional
    public int marcarTodasLeidas(Long idUsuario) {
        return notificaciones.marcarTodasLeidas(idUsuario);
    }
}
