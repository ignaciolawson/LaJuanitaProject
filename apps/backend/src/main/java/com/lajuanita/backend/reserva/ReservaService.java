package com.lajuanita.backend.reserva;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.reserva.dto.AltaParticipanteRequest;
import com.lajuanita.backend.reserva.dto.AltaReservaRequest;
import com.lajuanita.backend.reserva.dto.EdicionReservaRequest;
import com.lajuanita.backend.reserva.dto.ParticipanteResumen;
import com.lajuanita.backend.reserva.dto.ReservaResumen;
import com.lajuanita.backend.sala.Sala;
import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUso;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.DatoDuplicadoException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * El calendario: qué pasa en cada sala y a qué hora.
 *
 * <p><b>Casi ninguna regla de este módulo está en este archivo</b>, y es la
 * característica del proyecto: el solapamiento lo impide un EXCLUDE, la
 * combinación sala×uso una FK compuesta, los bloqueos y "nadie en dos salas a la
 * vez" unos triggers, y las clases contratadas otro. Todos rechazan con un
 * mensaje redactado para que lo lea una persona, y {@code ManejadorDeErrores} lo
 * pasa tal cual.
 *
 * <p>Lo que sí vive acá son las tres cosas que la base no puede hacer:
 *
 * <ul>
 *   <li><b>Declarar el autor.</b> `V7` exige {@code id_usuario_modifico} para
 *       editar una reserva o cambiar una asistencia, y ese dato solo lo sabe la
 *       aplicación. Sale del token, nunca del cuerpo del pedido.
 *   <li><b>Acotar el rango de la agenda.</b> Una consulta sin límite de fechas
 *       trae el historial entero.
 *   <li><b>Cerrar el círculo de la reprogramación.</b> Crear la reserva nueva y
 *       marcar la vieja como REPROGRAMADA es un solo gesto del negocio, y si se
 *       hace en dos pasos, el que se olvida del segundo deja la sala ocupada dos
 *       veces.
 * </ul>
 */
@Service
public class ReservaService {

    /**
     * Techo del rango de la agenda.
     *
     * <p>Existe por lo mismo que {@code Pagina.acotarTamanio}: el calendario no
     * pagina —una semana se dibuja entera o la respuesta es engañosa— así que lo
     * que acota el tamaño es la ventana de fechas. Dos meses cubre la vista
     * mensual con margen; pedir más es querer el historial, y para eso está el
     * listado por sala y período.
     */
    public static final int MAXIMO_DE_DIAS = 62;

    private final ReservaRepository reservas;
    private final ReservaParticipanteRepository participantes;
    private final SalaRepository salas;
    private final TipoUsoRepository tiposDeUso;
    private final ProfesorRepository profesores;
    private final UsuarioRepository usuarios;
    private final InscripcionRepository inscripciones;

    public ReservaService(ReservaRepository reservas,
            ReservaParticipanteRepository participantes,
            SalaRepository salas,
            TipoUsoRepository tiposDeUso,
            ProfesorRepository profesores,
            UsuarioRepository usuarios,
            InscripcionRepository inscripciones) {
        this.reservas = reservas;
        this.participantes = participantes;
        this.salas = salas;
        this.tiposDeUso = tiposDeUso;
        this.profesores = profesores;
        this.usuarios = usuarios;
        this.inscripciones = inscripciones;
    }

    // == El calendario ========================================================

    @Transactional(readOnly = true)
    public List<ReservaResumen> agenda(LocalDate desde,
            LocalDate hasta,
            Long idSala,
            Long idProfesor,
            boolean incluirCanceladas) {

        verificarRango(desde, hasta);

        List<Reserva> encontradas = reservas.agenda(
                desde, hasta, idSala, idProfesor, incluirCanceladas, EstadoReserva.OCUPAN_LA_SALA);

        Map<Long, List<ParticipanteResumen>> porReserva = participantesDe(encontradas);
        return encontradas.stream()
                .map(r -> ReservaResumen.de(r, porReserva.getOrDefault(r.getId(), List.of())))
                .toList();
    }

    @Transactional(readOnly = true)
    public ReservaResumen porId(Long id) {
        Reserva reserva = reservas.porIdConDetalle(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la reserva " + id + "."));
        return ReservaResumen.de(reserva,
                participantesDe(List.of(reserva)).getOrDefault(id, List.of()));
    }

    // == Alta y edición ======================================================

    /**
     * Carga una reserva. Si viene {@code idReservaRecupera}, además cierra el
     * círculo: la reserva original pasa a REPROGRAMADA en la misma transacción.
     */
    @Transactional
    public ReservaResumen alta(AltaReservaRequest solicitud, Long idAutor) {
        Reserva reserva = new Reserva();
        reserva.setSala(buscarSala(solicitud.idSala()));
        reserva.setTipoUso(buscarTipoUso(solicitud.idTipoUso()));
        reserva.setProfesor(buscarProfesor(solicitud.idProfesor()));
        reserva.setFecha(solicitud.fecha());
        reserva.setHoraInicio(solicitud.horaInicio());
        reserva.setHoraFin(solicitud.horaFin());
        reserva.setNotas(normalizar(solicitud.notas()));
        reserva.setMotivoReprogramacion(normalizar(solicitud.motivoReprogramacion()));
        reserva.setIdUsuarioCreo(idAutor);

        if (solicitud.idReservaRecupera() != null) {
            Reserva original = buscar(solicitud.idReservaRecupera());
            reserva.setReservaRecupera(original);

            // El otro lado del "ninguna clase se pierde": si la vieja no se marca,
            // sigue ocupando su franja y el alumno aparece en dos clases.
            original.setEstado(EstadoReserva.REPROGRAMADA);
            original.setIdUsuarioModifico(idAutor);

            // Y esto NO es decorativo. Hibernate ordena los INSERT antes que los
            // UPDATE dentro de una misma transacción, así que sin el flush la
            // reserva nueva se inserta mientras la original todavía figura
            // CONFIRMADA -- y el EXCLUDE de solapamiento la rechaza. No se nota
            // al mover una clase a otra semana; se nota al correrla una hora,
            // que es el caso más común de todos: el horario nuevo pisa el viejo.
            reservas.flush();
        }

        Reserva guardada = reservas.save(reserva);
        return ReservaResumen.de(guardada, List.of());
    }

    @Transactional
    public ReservaResumen editar(Long id, EdicionReservaRequest solicitud, Long idAutor) {
        Reserva reserva = buscar(id);
        reserva.setSala(buscarSala(solicitud.idSala()));
        reserva.setTipoUso(buscarTipoUso(solicitud.idTipoUso()));
        reserva.setProfesor(buscarProfesor(solicitud.idProfesor()));
        reserva.setFecha(solicitud.fecha());
        reserva.setHoraInicio(solicitud.horaInicio());
        reserva.setHoraFin(solicitud.horaFin());
        reserva.setNotas(normalizar(solicitud.notas()));
        // Sin esto, `V7` rechaza el UPDATE. Va siempre, aunque el pedido no haya
        // cambiado nada de lo auditado: es más barato que adivinar qué cambió.
        reserva.setIdUsuarioModifico(idAutor);

        return conParticipantes(reserva);
    }

    /**
     * Cancelar, finalizar o reactivar. <b>Nunca borra</b>: `V7` lo prohíbe con un
     * trigger, porque esto es historial de clases.
     */
    @Transactional
    public ReservaResumen cambiarEstado(Long id, EstadoReserva estado, Long idAutor) {
        Reserva reserva = buscar(id);
        reserva.setEstado(estado);
        reserva.setIdUsuarioModifico(idAutor);
        return conParticipantes(reserva);
    }

    // == Participantes =======================================================

    @Transactional
    public ParticipanteResumen agregarParticipante(Long idReserva, AltaParticipanteRequest solicitud) {
        Reserva reserva = buscar(idReserva);

        Usuario persona = usuarios.findById(solicitud.idUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + solicitud.idUsuario() + "."));

        // La base ya lo impide con `participante_unico_por_reserva`; esto existe
        // para que salga un mensaje y no una violación de constraint.
        if (participantes.existsByReservaIdAndUsuarioId(idReserva, persona.getId())) {
            throw new DatoDuplicadoException("idUsuario", "Esa persona ya está anotada en esa clase.");
        }

        ReservaParticipante participante = new ReservaParticipante();
        participante.setReserva(reserva);
        participante.setUsuario(persona);
        participante.setInscripcion(buscarInscripcion(solicitud.idInscripcion()));
        participante.setObservaciones(normalizar(solicitud.observaciones()));

        return ParticipanteResumen.de(participantes.save(participante));
    }

    /**
     * Tomar lista. Es el cambio más delicado del módulo: pasar un PRESENTE a
     * AUSENTE es lo que decide cuántas clases le quedan al alumno, y por eso `V7`
     * exige que quede firmado quién lo hizo.
     */
    @Transactional
    public ParticipanteResumen cambiarAsistencia(Long idParticipacion,
            EstadoAsistencia estado,
            Long idAutor) {

        ReservaParticipante participante = participantes.findById(idParticipacion)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe esa participación (" + idParticipacion + ")."));

        participante.setEstadoAsistencia(estado);
        participante.setIdUsuarioModifico(idAutor);
        return ParticipanteResumen.de(participante);
    }

    // -------------------------------------------------------------------------

    /**
     * El rango tiene que tener sentido y tener techo.
     *
     * <p>Las dos mitades son el mismo cuidado: sin la primera, un rango invertido
     * devuelve una lista vacía que se lee como "no hay nada esa semana"; sin la
     * segunda, pedir un año trae el historial entero por una URL.
     */
    private void verificarRango(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw new SolicitudInvalidaException("La fecha de fin no puede ser anterior a la de inicio.");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) >= MAXIMO_DE_DIAS) {
            throw new SolicitudInvalidaException(
                    "El calendario se pide de a " + MAXIMO_DE_DIAS + " días como máximo.");
        }
    }

    private Map<Long, List<ParticipanteResumen>> participantesDe(Collection<Reserva> filas) {
        List<Long> ids = filas.stream().map(Reserva::getId).toList();
        if (ids.isEmpty()) {
            // `IN ()` no es SQL válido: sin esto, una semana vacía revienta.
            return Map.of();
        }

        Map<Long, List<ParticipanteResumen>> porReserva = new HashMap<>();
        for (ReservaParticipante p : participantes.deLasReservas(ids)) {
            porReserva.computeIfAbsent(p.getReserva().getId(), id -> new ArrayList<>())
                    .add(ParticipanteResumen.de(p));
        }
        return porReserva;
    }

    private ReservaResumen conParticipantes(Reserva reserva) {
        return ReservaResumen.de(reserva,
                participantesDe(List.of(reserva)).getOrDefault(reserva.getId(), List.of()));
    }

    private Reserva buscar(Long id) {
        return reservas.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la reserva " + id + "."));
    }

    private Sala buscarSala(Long id) {
        return salas.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la sala " + id + "."));
    }

    private TipoUso buscarTipoUso(Long id) {
        return tiposDeUso.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el tipo de uso " + id + "."));
    }

    private Profesor buscarProfesor(Long id) {
        if (id == null) {
            return null;
        }
        return profesores.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el profesor " + id + "."));
    }

    private Inscripcion buscarInscripcion(Long id) {
        if (id == null) {
            return null;
        }
        return inscripciones.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la inscripción " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
