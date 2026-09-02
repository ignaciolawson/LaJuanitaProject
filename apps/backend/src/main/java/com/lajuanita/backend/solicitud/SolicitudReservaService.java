package com.lajuanita.backend.solicitud;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.TipoNotificacion;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.reserva.ReservaService;
import com.lajuanita.backend.reserva.dto.AltaParticipanteRequest;
import com.lajuanita.backend.reserva.dto.AltaPreconfirmacionRequest;
import com.lajuanita.backend.reserva.dto.AltaReservaRequest;
import com.lajuanita.backend.reserva.dto.AltaSenaRequest;
import com.lajuanita.backend.reserva.dto.ReservaCreada;
import com.lajuanita.backend.reserva.dto.ReservaResumen;
import com.lajuanita.backend.sala.Sala;
import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUso;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.solicitud.dto.AltaSolicitudRequest;
import com.lajuanita.backend.solicitud.dto.AprobacionRealizada;
import com.lajuanita.backend.solicitud.dto.AprobacionRequest;
import com.lajuanita.backend.solicitud.dto.RechazoRequest;
import com.lajuanita.backend.solicitud.dto.SolicitudResumen;
import com.lajuanita.backend.usuario.OperacionNoPermitidaException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * El circuito completo de un pedido de sala: alguien pide, administración
 * resuelve, y si aprueba nace la reserva con su seña.
 *
 * <p><b>Este es el service que junta los dos ejes de permisos del sistema.</b>
 * Del lado del portal el alcance es por identidad —cada uno lo suyo, y el id sale
 * del token—; del lado de la bandeja es por rol, como todo el resto de
 * administración. Las dos mitades están acá porque son el mismo hecho visto desde
 * los dos lados, y partirlas haría que la regla de "quién puede aprobar" viva
 * lejos de la de "quién puede pedir".
 *
 * <p>Lo que la base sostiene y este archivo no repite: que solo se pidan los usos
 * marcados en el catálogo, que la sala admita ese uso, que una resolución diga
 * quién y cuándo, que una aprobación tenga reserva y un rechazo motivo, y que una
 * solicitud resuelta no se toque nunca más. Todo eso es `V13`.
 */
@Service
public class SolicitudReservaService {

    /**
     * Hasta cuándo se puede pedir una sala.
     *
     * <p>Mismo motivo que el techo de la agenda: sin un límite entra un pedido
     * para 2043 que nadie va a resolver y que igual ocupa la bandeja. Dos meses es
     * lo que el calendario dibuja.
     */
    public static final int DIAS_MAXIMOS_DE_ANTICIPACION = 62;

    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    /**
     * El vencimiento de una prereserva se dice <b>con la hora</b>.
     *
     * <p>El plazo puede ser de menos de un día —es el menor entre 24hs y el inicio
     * de la franja (P44)—, así que "vence el 03/09" sobre algo que se cae a las
     * 10 de la mañana es información que hace perder el horario.
     */
    private static final DateTimeFormatter DIA_Y_HORA =
            DateTimeFormatter.ofPattern("dd/MM 'a las' HH:mm");

    private final SolicitudReservaRepository solicitudes;
    private final UsuarioRepository usuarios;
    private final SalaRepository salas;
    private final TipoUsoRepository tiposDeUso;
    private final ReservaRepository reservas;
    private final ReservaService circuitoDeReservas;
    private final NotificacionService avisos;

    public SolicitudReservaService(SolicitudReservaRepository solicitudes,
            UsuarioRepository usuarios,
            SalaRepository salas,
            TipoUsoRepository tiposDeUso,
            ReservaRepository reservas,
            ReservaService circuitoDeReservas,
            NotificacionService avisos) {
        this.solicitudes = solicitudes;
        this.usuarios = usuarios;
        this.salas = salas;
        this.tiposDeUso = tiposDeUso;
        this.reservas = reservas;
        this.circuitoDeReservas = circuitoDeReservas;
        this.avisos = avisos;
    }

    // == El portal ===========================================================

    /**
     * Pedir una sala.
     *
     * <p>{@code idQuienPide} sale del token y nunca del cuerpo: ver
     * {@link AltaSolicitudRequest}.
     */
    @Transactional
    public SolicitudResumen pedir(AltaSolicitudRequest pedido, Long idQuienPide) {
        verificarFecha(pedido.fecha());

        SolicitudReserva solicitud = new SolicitudReserva();
        solicitud.setUsuario(buscarUsuario(idQuienPide));
        solicitud.setSala(buscarSala(pedido.idSala()));
        solicitud.setTipoUso(buscarTipoUso(pedido.idTipoUso()));
        solicitud.setFecha(pedido.fecha());
        solicitud.setHoraInicio(pedido.horaInicio());
        solicitud.setHoraFin(pedido.horaFin());
        solicitud.setComentario(normalizar(pedido.comentario()));

        return SolicitudResumen.de(solicitudes.save(solicitud));
    }

    /** Lo que pidió una persona. Todos los estados: lo resuelto también es historial. */
    @Transactional(readOnly = true)
    public List<SolicitudResumen> mias(Long idUsuario) {
        return solicitudes.deLaPersona(idUsuario).stream().map(SolicitudResumen::de).toList();
    }

    /**
     * El que pidió se arrepiente.
     *
     * <p>Dos guardas distintas y las dos hacen falta: que la solicitud sea suya
     * —si no, cualquiera cancela el pedido de cualquiera— y que siga pendiente.
     * La segunda la sostiene igual el trigger de `V13`; el pre-chequeo existe para
     * que el mensaje explique qué pasó en vez de llegar como una violación.
     *
     * <p>La ajena se contesta "no existe" y no "no podés", por lo mismo que en
     * {@code NotificacionService}: la segunda respuesta confirma que la fila
     * existe.
     */
    @Transactional
    public SolicitudResumen cancelar(Long id, Long idQuienPide) {
        SolicitudReserva solicitud = solicitudes.porIdConDetalle(id)
                .filter(s -> s.getUsuario().getId().equals(idQuienPide))
                .orElseThrow(() -> noExiste(id));

        if (!solicitud.estaPendiente()) {
            throw new OperacionNoPermitidaException(
                    "Esa solicitud ya fue resuelta (" + solicitud.getEstado() + ") y no se puede cancelar.");
        }

        solicitud.cancelar(solicitud.getUsuario());
        return SolicitudResumen.de(solicitud);
    }

    // == La bandeja de administración ========================================

    @Transactional(readOnly = true)
    public Pagina<SolicitudResumen> listar(EstadoSolicitud estado, int pagina, int tamanio) {
        return Pagina.de(solicitudes
                .listar(estado, PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio)))
                .map(SolicitudResumen::de));
    }

    /**
     * Aprobar: nace la reserva, con su seña y con el que pidió adentro.
     *
     * <p><b>Todo en una transacción, y el orden no es negociable.</b> La reserva,
     * su participante y su seña entran juntos porque el {@code CONSTRAINT TRIGGER}
     * de `V10` corre al COMMIT y busca el dinero detrás de la reserva; se delega en
     * {@link ReservaService#alta} en vez de armar la reserva acá, que es lo mismo
     * que hace el calendario y por el mismo motivo — las reglas de una reserva son
     * suyas, y una segunda copia es la que se olvida de una.
     *
     * <p><b>Al que pidió se lo anota como participante</b>, aunque un alquiler no
     * sea una clase. Es cierto —está en la sala, ocupándola— y es lo que hace que
     * "mis próximas reservas" tenga una sola definición. De regalo entra en la
     * regla de `V9`: nadie puede estar en dos salas a la vez, y alquilar una cabina
     * mientras se tiene clase es exactamente eso. Va sin inscripción, así que no
     * consume ninguna clase contratada.
     *
     * <p>Si la franja se ocupó mientras la solicitud esperaba, el EXCLUDE de
     * solapamiento rechaza acá con su mensaje y la solicitud queda pendiente: es
     * el comportamiento correcto, porque lo que falló es la reserva y no la
     * decisión de aprobarla.
     */
    @Transactional
    public AprobacionRealizada aprobar(Long id, AprobacionRequest aprobacion, Long idAutor) {
        SolicitudReserva solicitud = pendientePorId(id);
        Usuario quienPidio = solicitud.getUsuario();

        ReservaCreada creada = circuitoDeReservas.alta(new AltaReservaRequest(
                solicitud.getSala().getId(),
                solicitud.getTipoUso().getId(),
                null,
                solicitud.getFecha(),
                solicitud.getHoraInicio(),
                solicitud.getHoraFin(),
                solicitud.getComentario(),
                null,
                null,
                List.of(new AltaParticipanteRequest(quienPidio.getId(), null)),
                // Quién paga lo pone el servidor: es el que pidió. Ver AprobacionRequest.
                //
                // Los dos caminos son excluyentes y lo dice `AltaReservaRequest`: o
                // se cobra ahora (el de siempre), o se aparta el horario con la
                // deuda anotada y su plazo (`V24`).
                aprobacion.esPreconfirmacion() ? null
                        : new AltaSenaRequest(quienPidio.getId(),
                                aprobacion.monto(),
                                aprobacion.moneda(),
                                aprobacion.cotizacionDolar(),
                                aprobacion.medioPago()),
                aprobacion.esPreconfirmacion()
                        ? new AltaPreconfirmacionRequest(quienPidio.getId(),
                                aprobacion.monto(),
                                aprobacion.moneda(),
                                aprobacion.cotizacionDolar(),
                                aprobacion.medioPago(),
                                normalizar(aprobacion.respuesta()))
                        : null),
                idAutor);

        Reserva reserva = reservas.getReferenceById(creada.reserva().idReserva());
        solicitud.aprobar(reserva, buscarUsuario(idAutor), normalizar(aprobacion.respuesta()));

        // ⚠️ El aviso dice cosas distintas y no es cosmética: en la prereserva, la
        // persona TIENE QUE HACER ALGO y tiene hasta cuándo. Un "está confirmado"
        // sobre un horario que se cae en 24hs es la peor forma de perder una venta,
        // porque el que lo lee se queda tranquilo. Y como no hay mail ni WhatsApp,
        // esta notificación ES el canal: el texto tiene que aguantar solo.
        if (reserva.estaPreconfirmada()) {
            avisos.avisar(quienPidio,
                    TipoNotificacion.RESERVA_PRECONFIRMADA,
                    "Te apartamos la sala: falta abonarla",
                    "Te reservamos " + solicitud.getSala().getNombreSala() + " para el "
                            + solicitud.getFecha().format(DIA) + " a las " + solicitud.getHoraInicio()
                            + ". Para confirmarla hay que abonar "
                            + aprobacion.moneda() + " "
                            + aprobacion.monto().setScale(2, RoundingMode.HALF_UP).toPlainString()
                            + " antes del " + reserva.getVencePreconfirmacion().format(DIA_Y_HORA)
                            + ". Pasado ese plazo el horario se libera."
                            + textoExtra(aprobacion.respuesta()),
                    "/mis-reservas");
        } else {
            avisos.avisar(quienPidio,
                    TipoNotificacion.SOLICITUD_APROBADA,
                    "Te confirmamos la sala",
                    "Tu pedido de " + solicitud.getTipoUso().getNombre().toLowerCase()
                            + " en " + solicitud.getSala().getNombreSala() + " para el "
                            + solicitud.getFecha().format(DIA) + " a las " + solicitud.getHoraInicio()
                            + " está confirmado.",
                    "/mis-reservas");
        }

        // El id de la seña vuelve con la solicitud para que la pantalla le adjunte
        // el comprobante que quien aprueba está mirando. Ver `AprobacionRealizada`.
        return new AprobacionRealizada(SolicitudResumen.de(solicitud), creada.idPagoSena());
    }

    /**
     * Rechazar, diciendo por qué.
     *
     * <p>El motivo va también en la notificación: la persona tiene que poder leer
     * qué pasó sin entrar a buscar la solicitud.
     */
    @Transactional
    public SolicitudResumen rechazar(Long id, RechazoRequest rechazo, Long idAutor) {
        SolicitudReserva solicitud = pendientePorId(id);

        solicitud.rechazar(rechazo.respuesta().trim(), buscarUsuario(idAutor));

        avisos.avisar(solicitud.getUsuario(),
                TipoNotificacion.SOLICITUD_RECHAZADA,
                "No pudimos confirmarte la sala",
                "Tu pedido para el " + solicitud.getFecha().format(DIA) + " a las "
                        + solicitud.getHoraInicio() + " no se pudo confirmar: "
                        + rechazo.respuesta().trim(),
                "/mis-solicitudes");

        return SolicitudResumen.de(solicitud);
    }

    // -------------------------------------------------------------------------

    /**
     * Una solicitud que todavía se pueda resolver.
     *
     * <p>El trigger de `V13` impide igual tocar una resuelta; esto existe para que
     * el segundo que aprueba lea *"ya fue resuelta"* en vez de un error de base, y
     * sobre todo para que no llegue a crear la reserva antes de enterarse — sin
     * este chequeo, aprobar dos veces intenta dos reservas y la segunda se cae
     * recién contra el trigger, con la franja ya duplicada en el intento.
     */
    private SolicitudReserva pendientePorId(Long id) {
        SolicitudReserva solicitud = solicitudes.porIdConDetalle(id)
                .orElseThrow(() -> noExiste(id));

        if (!solicitud.estaPendiente()) {
            throw new OperacionNoPermitidaException(
                    "Esa solicitud ya fue resuelta (" + solicitud.getEstado() + ").");
        }
        return solicitud;
    }

    /**
     * La fecha pedida tiene que tener sentido.
     *
     * <p>No está en la base a propósito: un CHECK contra {@code CURRENT_DATE} no es
     * inmutable y convierte cualquier restauración de backup en una fila que ya no
     * valida. Lo que la base sí sostiene —las horas en orden, la sala, el uso— está
     * en `V13`.
     */
    private void verificarFecha(LocalDate fecha) {
        LocalDate hoy = LocalDate.now();
        if (fecha.isBefore(hoy)) {
            throw new SolicitudInvalidaException("No se puede pedir una sala para una fecha que ya pasó.");
        }
        if (fecha.isAfter(hoy.plusDays(DIAS_MAXIMOS_DE_ANTICIPACION))) {
            throw new SolicitudInvalidaException(
                    "Se puede pedir con hasta " + DIAS_MAXIMOS_DE_ANTICIPACION + " días de anticipación.");
        }
    }

    private RecursoNoEncontradoException noExiste(Long id) {
        return new RecursoNoEncontradoException("No existe la solicitud " + id + ".");
    }

    private Usuario buscarUsuario(Long id) {
        return usuarios.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + id + "."));
    }

    private Sala buscarSala(Long id) {
        return salas.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la sala " + id + "."));
    }

    private TipoUso buscarTipoUso(Long id) {
        return tiposDeUso.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el tipo de uso " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    /**
     * Lo que administración quiso agregarle al aviso, si escribió algo.
     *
     * <p>Va <b>adentro del texto</b> de la notificación y no como un campo aparte
     * por lo mismo que el motivo de un rechazo: acá no hay mail ni WhatsApp, la
     * notificación es el canal, y lo que no entre en ese texto no llega.
     */
    private String textoExtra(String respuesta) {
        String limpio = normalizar(respuesta);
        return limpio == null ? "" : " " + limpio;
    }
}
