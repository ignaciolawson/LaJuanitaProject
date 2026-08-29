package com.lajuanita.backend.solicitud;

import java.time.LocalDate;
import java.time.format.DateTimeFormatter;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.TipoNotificacion;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.reserva.ReservaService;
import com.lajuanita.backend.reserva.dto.EdicionReservaRequest;
import com.lajuanita.backend.solicitud.dto.AltaReprogramacionRequest;
import com.lajuanita.backend.solicitud.dto.AprobacionReprogramacionRequest;
import com.lajuanita.backend.solicitud.dto.ReprogramacionResumen;
import com.lajuanita.backend.solicitud.dto.RechazoRequest;
import com.lajuanita.backend.usuario.OperacionNoPermitidaException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * "No puedo ese día": el circuito completo de mover una clase.
 *
 * <p>Es la pieza que el Módulo 4 se debía —la tabla y su trigger existen desde
 * `V1` y `V13`, sin nadie que escribiera en ellos— y la última de la Fase 2 de
 * {@code docs/mejoras.md}.
 *
 * <h2>1 · Aprobar es mover, y la clase se mueve EN EL LUGAR</h2>
 *
 * <p>Esta es la decisión de la que cuelga todo lo demás, y hay dos formas de
 * mover una reserva en este sistema:
 *
 * <ul>
 *   <li><b>Editarla</b> — la misma fila cambia de día. Es lo que hace el
 *       calendario, y {@code ReservaService.editar} ya avisa a todos los que
 *       tienen que enterarse, diciendo de dónde a dónde.
 *   <li><b>Reemplazarla</b> — la original pasa a REPROGRAMADA y nace otra que la
 *       apunta con {@code id_reserva_recupera}. Es el modelo de <b>recuperación</b>
 *       de P2: <i>"ninguna clase se pierde"</i>, para la clase que <b>no se
 *       dictó</b> porque faltó alguien.
 * </ul>
 *
 * <p><b>Un pedido de reprogramación es lo primero, no lo segundo.</b> La clase
 * todavía no pasó y nadie faltó: se corre de día. Elegir el segundo camino traería
 * un problema de plata que no tiene por qué existir — la reserva REPROGRAMADA deja
 * de deber seña (`V11`) y la nueva la debe, así que mover un alquiler de cabina
 * pasaría a ser cobrar de nuevo y devolver lo cobrado, dos movimientos de caja por
 * una mudanza. Moviéndola en el lugar, <b>la plata ni se entera</b>: es la misma
 * fila y el mismo pago.
 *
 * <h2>2 · No se aprueba "tal como se pidió", y no es una excepción</h2>
 *
 * <p>El pedido de sala se aprueba exactamente como llegó —decisión de alcance del
 * Módulo 4—. Acá no se puede, y lo dice la tabla: {@code fecha_alternativa_solicitada}
 * es un {@code DATE} <b>opcional</b>, sin hora y sin sala. La diferencia no es de
 * criterio sino de quién puede saber qué: el que pide una cabina elige una franja
 * libre que el portal le muestra; el que pide mover su clase <b>no puede saber</b>
 * qué sala queda libre ni de qué profesor depende. Pide un día, o ni eso, y el
 * horario lo pone administración.
 *
 * <h2>3 · Quién puede pedirlo: tres caminos, y el tercero es P9</h2>
 *
 * <p>Estar anotado en la clase, haberla pagado —los dos caminos de "mía" que ya
 * usan el portal y `V12`— <b>o ser el profesor de esa clase</b> (P9, contestada
 * por Ignacio el 2026-08-29: el profesor pide con el mismo botón que el alumno).
 * El tercero se chequea acá y <b>no</b> se agregó a
 * {@code ReservaRepository.deLaPersona}: ahí haría que las clases que dicta le
 * aparezcan entre "sus reservas" como si fuera el cliente de ellas.
 *
 * <p>La reserva ajena contesta <b>"no existe"</b> y no "no podés", por lo mismo
 * que en el resto del portal: la segunda respuesta confirma que la fila existe.
 */
@Service
public class SolicitudReprogramacionService {

    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM");

    private final SolicitudReprogramacionRepository solicitudes;
    private final ReservaRepository reservas;
    private final ReservaService circuitoDeReservas;
    private final UsuarioRepository usuarios;
    private final NotificacionService avisos;

    public SolicitudReprogramacionService(SolicitudReprogramacionRepository solicitudes,
            ReservaRepository reservas,
            ReservaService circuitoDeReservas,
            UsuarioRepository usuarios,
            NotificacionService avisos) {
        this.solicitudes = solicitudes;
        this.reservas = reservas;
        this.circuitoDeReservas = circuitoDeReservas;
        this.usuarios = usuarios;
        this.avisos = avisos;
    }

    // == El portal ===========================================================

    /** Pedir que muevan una clase. {@code idQuienPide} sale del token. */
    @Transactional
    public ReprogramacionResumen pedir(AltaReprogramacionRequest pedido, Long idQuienPide) {
        Reserva reserva = reservas.findById(pedido.idReserva())
                .orElseThrow(() -> noExisteLaReserva(pedido.idReserva()));

        verificarQueEsSuya(reserva, idQuienPide);
        verificarQueTodaviaSePuedeMover(reserva);

        if (solicitudes.existsByReservaIdAndEstado(reserva.getId(), EstadoReprogramacion.PENDIENTE)) {
            throw new OperacionNoPermitidaException(
                    "Ya hay un pedido para mover esa clase esperando respuesta.");
        }

        SolicitudReprogramacion solicitud = new SolicitudReprogramacion();
        solicitud.setUsuario(buscarUsuario(idQuienPide));
        solicitud.setReserva(reserva);
        solicitud.setMotivo(pedido.motivo().trim());
        solicitud.setFechaAlternativaSolicitada(pedido.fechaAlternativa());

        return ReprogramacionResumen.de(solicitudes.save(solicitud));
    }

    /** Lo que pidió una persona. Todos los estados: lo resuelto también es historial. */
    @Transactional(readOnly = true)
    public List<ReprogramacionResumen> mios(Long idUsuario) {
        return solicitudes.deLaPersona(idUsuario).stream().map(ReprogramacionResumen::de).toList();
    }

    // == La bandeja de administración ========================================

    @Transactional(readOnly = true)
    public Pagina<ReprogramacionResumen> listar(EstadoReprogramacion estado, int pagina, int tamanio) {
        return Pagina.de(solicitudes
                .listar(estado, PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio)))
                .map(ReprogramacionResumen::de));
    }

    /**
     * Aprobar: la clase se mueve, y el pedido queda resuelto.
     *
     * <p>Se delega en {@link ReservaService#editar} y no se tocan las columnas de
     * la reserva acá: ahí viven la firma que `V7` exige, el aviso de "te movimos
     * la clase" y las tres reglas de la base que un movimiento despierta —la sala
     * nueva libre, la sala nueva sin bloqueo, y ningún participante en dos salas a
     * la vez (`V9` §1)—. Si alguna rechaza, <b>la solicitud queda pendiente</b>:
     * lo que falló es el movimiento, no la decisión de aprobarlo, y la franja
     * elegida se corrige y se aprueba de nuevo.
     *
     * <p><b>No se manda una notificación de "pedido aprobado".</b> Sería la
     * segunda por el mismo hecho: {@code editar} ya le avisa a los anotados y al
     * profesor <i>de dónde a dónde</i> se movió la clase, que es exactamente lo que
     * quien pidió quiere saber. Dos avisos por una cosa entrenan a la gente a
     * ignorarlos, que es la misma razón por la que {@code avisarSiSeMovio} no avisa
     * cuando la edición no movió nada.
     */
    @Transactional
    public ReprogramacionResumen aprobar(Long id, AprobacionReprogramacionRequest nuevaFranja,
            Long idAutor) {

        SolicitudReprogramacion solicitud = pendientePorId(id);
        Reserva reserva = solicitud.getReserva();

        verificarQueSeMueveDeVerdad(reserva, nuevaFranja);

        circuitoDeReservas.editar(reserva.getId(), new EdicionReservaRequest(
                nuevaFranja.idSala(),
                // El uso y el profesor quedan como estaban: mover una clase es
                // mover una clase. Cambiarle el profesor es otra cosa, y su lugar
                // es la edición del calendario.
                reserva.getTipoUso().getId(),
                reserva.getProfesor() == null ? null : reserva.getProfesor().getId(),
                nuevaFranja.fecha(),
                nuevaFranja.horaInicio(),
                nuevaFranja.horaFin(),
                reserva.getNotas()),
                idAutor);

        solicitud.aprobar(buscarUsuario(idAutor), normalizar(nuevaFranja.respuesta()));
        return ReprogramacionResumen.de(solicitud);
    }

    /**
     * Rechazar, diciendo por qué.
     *
     * <p>Acá sí va la notificación, y es el único aviso que este circuito manda:
     * nada se movió, así que si no se le dice, la persona se queda esperando. El
     * motivo viaja adentro — con "no se pudo" a secas no hay nada que hacer;
     * con el porqué, se pide otro día, que es lo que el estudio quiere que pase.
     */
    @Transactional
    public ReprogramacionResumen rechazar(Long id, RechazoRequest rechazo, Long idAutor) {
        SolicitudReprogramacion solicitud = pendientePorId(id);
        Reserva reserva = solicitud.getReserva();

        solicitud.rechazar(rechazo.respuesta().trim(), buscarUsuario(idAutor));

        avisos.avisar(solicitud.getUsuario(),
                TipoNotificacion.REPROGRAMACION_RECHAZADA,
                "No pudimos mover tu clase",
                "Tu clase del " + reserva.getFecha().format(DIA) + " a las "
                        + reserva.getHoraInicio() + " queda como estaba: "
                        + rechazo.respuesta().trim(),
                "/mis-reservas");

        return ReprogramacionResumen.de(solicitud);
    }

    // -------------------------------------------------------------------------

    /** Los tres caminos de la cabecera. Ver el punto 3. */
    private void verificarQueEsSuya(Reserva reserva, Long idQuienPide) {
        boolean esElProfesor = reserva.getProfesor() != null
                && reserva.getProfesor().getUsuario().getId().equals(idQuienPide);

        if (esElProfesor) {
            return;
        }

        boolean laTiene = reservas.esDeLaPersona(reserva.getId(), idQuienPide,
                EstadoAsistencia.CANCELADA, EstadoPago.ENTRARON);

        if (!laTiene) {
            throw noExisteLaReserva(reserva.getId());
        }
    }

    /**
     * Se pide mover algo que todavía va a pasar.
     *
     * <p>Dos condiciones y las dos son obvias hasta que faltan: la reserva tiene
     * que <b>ocupar su franja</b> —una cancelada o una ya reprogramada no hay nada
     * que mover, y una FINALIZADA ya se dictó— y tiene que ser <b>de acá en
     * adelante</b>. Pedir que muevan la clase del martes pasado no es un pedido:
     * es un reclamo, y para eso está el motivo de la clase que no se dio.
     *
     * <p>La segunda no está en la base y no puede estarlo: un CHECK contra
     * {@code CURRENT_DATE} no es inmutable y convertiría cualquier restauración de
     * backup en filas que ya no validan. Es el mismo razonamiento que
     * {@code SolicitudReservaService.verificarFecha}.
     */
    private void verificarQueTodaviaSePuedeMover(Reserva reserva) {
        if (!reserva.getEstado().ocupaLaSala()) {
            throw new SolicitudInvalidaException(
                    "Esa clase está " + reserva.getEstado().name().toLowerCase()
                            + ": no hay nada que mover.");
        }
        if (reserva.getFecha().isBefore(LocalDate.now())) {
            throw new SolicitudInvalidaException("Esa clase ya pasó.");
        }
    }

    /**
     * Aprobar dejando todo igual no es aprobar.
     *
     * <p>Sin esta guarda el pedido queda resuelto, {@code editar} no avisa a nadie
     * —porque no hubo movimiento— y quien pidió se queda esperando un cambio que
     * nunca pasó, sin nada que le diga que ya fue contestado.
     */
    private void verificarQueSeMueveDeVerdad(Reserva reserva, AprobacionReprogramacionRequest franja) {
        boolean igual = reserva.getSala().getId().equals(franja.idSala())
                && reserva.getFecha().equals(franja.fecha())
                && reserva.getHoraInicio().equals(franja.horaInicio())
                && reserva.getHoraFin().equals(franja.horaFin());

        if (igual) {
            throw new SolicitudInvalidaException(
                    "Para aprobar el pedido hay que darle un horario distinto al que ya tiene. "
                            + "Si el horario no se puede cambiar, corresponde rechazarlo con el motivo.");
        }
    }

    /**
     * Una solicitud que todavía se pueda resolver.
     *
     * <p>El trigger de `V13` impide igual tocar una resuelta; esto existe para que
     * el segundo que aprueba lea <i>"ya fue resuelta"</i> en vez de un error de
     * base, y sobre todo <b>para que no llegue a mover la clase antes de
     * enterarse</b>.
     */
    private SolicitudReprogramacion pendientePorId(Long id) {
        SolicitudReprogramacion solicitud = solicitudes.porIdConDetalle(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el pedido " + id + "."));

        if (!solicitud.estaPendiente()) {
            throw new OperacionNoPermitidaException(
                    "Ese pedido ya fue resuelto (" + solicitud.getEstado() + ").");
        }
        return solicitud;
    }

    private RecursoNoEncontradoException noExisteLaReserva(Long id) {
        return new RecursoNoEncontradoException("No existe la reserva " + id + ".");
    }

    private Usuario buscarUsuario(Long id) {
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
