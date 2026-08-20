package com.lajuanita.backend.notificacion;

import java.util.Collection;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

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

    /**
     * Une destinatario y clave en una sola cadena comparable.
     *
     * <p>Vive acá y no en quien llama porque las dos puntas —la que arma el
     * conjunto y la que pregunta si algo está adentro— tienen que usar el mismo
     * separador, y si se escribe en dos lados alcanza con que uno cambie para que
     * el conjunto no encuentre nunca nada y todos los avisos se dupliquen en
     * silencio.
     */
    public static final String SEPARADOR = "|";

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

        return avisar(destino, tipo, titulo, contenido, urlDestino, null);
    }

    /**
     * Lo mismo, pero dejando anotado <b>qué hecho</b> se avisó.
     *
     * <p>Solo lo usa el disparador automático ({@code com.lajuanita.backend.aviso}).
     * Un aviso que escribe una persona al resolver algo <b>no lleva clave y no debe
     * llevarla</b>: si administración aprueba dos pedidos parecidos son dos avisos
     * y los dos tienen que llegar. La deduplicación es una propiedad de lo que se
     * dispara solo.
     *
     * <p>El método no chequea si la clave ya está. <b>Si está, la base lo rechaza</b>
     * — el índice único parcial de `V17`— y eso es a propósito: un chequeo acá
     * adentro haría creer que este método es seguro contra concurrencia y no lo
     * sería, que es la forma exacta en que el chequeo de email duplicado dejó pasar
     * cuatro registros iguales. Quien filtra por adelantado es
     * {@code AvisoService}, y lo hace para no intentar de más, no para garantizar.
     */
    @Transactional
    public Notificacion avisar(Usuario destino,
            TipoNotificacion tipo,
            String titulo,
            String contenido,
            String urlDestino,
            String claveEvento) {

        Notificacion aviso = new Notificacion();
        aviso.setDestino(destino);
        aviso.setTipo(tipo);
        aviso.setTitulo(titulo);
        aviso.setContenido(contenido);
        aviso.setUrlDestino(urlDestino);
        aviso.setClaveEvento(claveEvento);

        return notificaciones.save(aviso);
    }

    /**
     * De estas claves, cuáles ya le llegaron a cada persona.
     *
     * @return el conjunto de claves {@code idUsuario|clave} ya avisadas
     */
    @Transactional(readOnly = true)
    public Set<String> yaAvisados(Collection<String> claves) {
        if (claves.isEmpty()) {
            return Set.of();
        }
        return notificaciones.yaAvisados(claves).stream()
                .map(fila -> ((Number) fila[0]).longValue() + SEPARADOR + fila[1])
                .collect(Collectors.toSet());
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
