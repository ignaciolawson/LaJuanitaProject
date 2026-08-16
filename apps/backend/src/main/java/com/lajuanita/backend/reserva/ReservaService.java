package com.lajuanita.backend.reserva;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
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
import com.lajuanita.backend.reserva.dto.UsoDeSala;
import com.lajuanita.backend.reserva.dto.UsoDeSala.UsoPorTipo;
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

    /** Techo del informe de uso. Ver {@code verificarRangoDelInforme}. */
    public static final int MAXIMO_DE_DIAS_DEL_INFORME = 366;

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

    /**
     * Módulo 2, pantalla 4 — el historial de uso por sala y período.
     *
     * <p><b>Arranca del catálogo de salas, no de las reservas</b>, y por eso una
     * sala sin uso sale en cero en vez de no salir. Pide las inactivas también:
     * un período pasado puede tener adentro una sala que hoy ya no se usa, y
     * omitirla haría que los totales no cierren contra el calendario.
     */
    @Transactional(readOnly = true)
    public List<UsoDeSala> uso(LocalDate desde, LocalDate hasta, Long idSala) {
        verificarRangoDelInforme(desde, hasta);

        List<String> ocupan = EstadoReserva.OCUPAN_LA_SALA.stream().map(Enum::name).toList();
        Map<Long, String> nombreDelTipo = new HashMap<>();
        Map<Long, String> colorDelTipo = new HashMap<>();
        for (TipoUso tipo : tiposDeUso.listar(true)) {
            nombreDelTipo.put(tipo.getId(), tipo.getNombre());
            colorDelTipo.put(tipo.getId(), tipo.getColor());
        }

        Map<Long, List<UsoPorTipo>> desglose = new HashMap<>();
        Map<Long, long[]> totales = new HashMap<>();

        for (Object[] fila : reservas.usoPorSala(desde, hasta, idSala, ocupan)) {
            Long deSala = ((Number) fila[0]).longValue();
            Long deTipo = ((Number) fila[1]).longValue();
            long cantidad = ((Number) fila[2]).longValue();
            BigDecimal horas = redondear(fila[3]);
            long canceladas = ((Number) fila[4]).longValue();
            long reprogramadas = ((Number) fila[5]).longValue();

            // Un tipo que no ocupó nada en el período no aporta una fila al
            // desglose: sería una lista de ceros por sala y no dice nada. Lo que
            // sí se pierde de vista es lo que se cayó, y por eso va al total.
            if (cantidad > 0) {
                desglose.computeIfAbsent(deSala, id -> new ArrayList<>()).add(new UsoPorTipo(
                        deTipo, nombreDelTipo.get(deTipo), colorDelTipo.get(deTipo), cantidad, horas));
            }

            long[] acumulado = totales.computeIfAbsent(deSala, id -> new long[3]);
            acumulado[0] += cantidad;
            acumulado[1] += canceladas;
            acumulado[2] += reprogramadas;
        }

        return salas.listar(true).stream()
                .filter(s -> idSala == null || s.getId().equals(idSala))
                .map(s -> {
                    List<UsoPorTipo> porTipo = desglose.getOrDefault(s.getId(), List.of()).stream()
                            .sorted(Comparator.comparing(UsoPorTipo::horas).reversed())
                            .toList();
                    long[] acumulado = totales.getOrDefault(s.getId(), new long[3]);
                    BigDecimal horas = porTipo.stream()
                            .map(UsoPorTipo::horas)
                            .reduce(BigDecimal.ZERO, BigDecimal::add);

                    return new UsoDeSala(s.getId(), s.getNombreSala(), s.isActiva(),
                            acumulado[0], horas, acumulado[1], acumulado[2], porTipo);
                })
                .toList();
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

    /**
     * El informe tiene otro techo que la agenda, y la razón es distinta.
     *
     * <p>Lo que acota a la agenda es el <b>tamaño de la respuesta</b>: son todas
     * las reservas, una por una. Acá la respuesta son tres salas por seis tipos
     * de uso, pida el período que pida — lo que se acota es el barrido, y un año
     * es el período natural del informe anual que va a pedir el Módulo 8.
     */
    private void verificarRangoDelInforme(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw new SolicitudInvalidaException("La fecha de fin no puede ser anterior a la de inicio.");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) > MAXIMO_DE_DIAS_DEL_INFORME) {
            throw new SolicitudInvalidaException("El informe se pide de a un año como máximo.");
        }
    }

    /**
     * Las horas, con dos decimales.
     *
     * <p>La suma llega como {@code BigDecimal} o como {@code Double} según cómo
     * el driver resuelva la división, así que se normaliza en un solo lugar.
     * {@code HALF_UP} porque esto se lee, no se cobra.
     */
    private BigDecimal redondear(Object valor) {
        BigDecimal horas = valor instanceof BigDecimal exacto
                ? exacto
                : BigDecimal.valueOf(((Number) valor).doubleValue());
        return horas.setScale(2, RoundingMode.HALF_UP);
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
