package com.lajuanita.backend.reserva;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
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
import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.TipoNotificacion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.pago.dto.AltaPagoRequest;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.reserva.dto.AltaParticipanteRequest;
import com.lajuanita.backend.reserva.dto.AltaReservaRequest;
import com.lajuanita.backend.reserva.dto.AltaSenaRequest;
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
 * <p>Lo que sí vive acá son las cuatro cosas que la base no puede hacer:
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
 *   <li><b>Meter la reserva y sus participantes en una sola transacción</b>
 *       (2026-08-17). Esto no es comodidad: es la condición para que exista la
 *       seña. El {@code CONSTRAINT TRIGGER} de `V10` corre al COMMIT y busca el
 *       dinero detrás de la reserva, que para una clase es la inscripción del que
 *       asiste — si los participantes llegan en un pedido posterior, ese COMMIT no
 *       tiene nada que mirar y rechaza el alta. Ver {@link AltaReservaRequest}.
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

    /**
     * Para la seña. Es el único service del que depende este, y no hay ciclo:
     * {@code PagoService} habla con repositorios, no con este.
     */
    private final PagoService pagos;

    /** Para el aviso de "te movimos la clase". Ver {@code avisarSiSeMovio}. */
    private final NotificacionService avisos;

    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM");

    public ReservaService(ReservaRepository reservas,
            ReservaParticipanteRepository participantes,
            SalaRepository salas,
            TipoUsoRepository tiposDeUso,
            ProfesorRepository profesores,
            UsuarioRepository usuarios,
            InscripcionRepository inscripciones,
            PagoService pagos,
            NotificacionService avisos) {
        this.reservas = reservas;
        this.participantes = participantes;
        this.salas = salas;
        this.tiposDeUso = tiposDeUso;
        this.profesores = profesores;
        this.usuarios = usuarios;
        this.inscripciones = inscripciones;
        this.pagos = pagos;
        this.avisos = avisos;
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
     * Carga una reserva, <b>con los participantes que traiga</b>. Si viene
     * {@code idReservaRecupera}, además cierra el círculo: la reserva original
     * pasa a REPROGRAMADA en la misma transacción.
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

        // Los participantes van en ESTA transacción, no en un pedido aparte, y de
        // eso depende la seña: ver el cuarto punto de la cabeza de la clase.
        //
        // El orden importa y sale gratis: `reserva` es IDENTITY, así que el `save`
        // de arriba ya escribió la fila y le puso el id. Los triggers de `V9` que
        // corren al anotar a alguien -- "nadie en dos salas a la vez" y "no más
        // clases que las contratadas" -- leen `reserva` por SQL, no la sesión, y
        // acá ya la encuentran.
        List<AltaParticipanteRequest> aAnotar = solicitud.participantes() == null
                ? List.of()
                : solicitud.participantes();
        List<ParticipanteResumen> anotados = aAnotar.stream()
                .map(cada -> ParticipanteResumen.de(anotar(guardada, cada)))
                .toList();

        // El otro camino del dinero, para lo que no es clase. Se delega en
        // `PagoService` en vez de armar el `Pago` acá: las reglas de la plata
        // -normalización del importe, la cotización del dólar, quién registra-
        // son suyas, y duplicarlas sería la segunda copia que se olvida de una.
        if (solicitud.sena() != null) {
            registrarLaSena(solicitud.sena(), guardada.getId(), idAutor);
        }

        return ReservaResumen.de(guardada, anotados);
    }

    /**
     * La seña de una reserva que no es clase (`V10`).
     *
     * <p>{@code idReserva} lo pone el servidor con la reserva recién creada, nunca
     * el pedido: el que carga no puede conocer ese id, y dejarlo entrar sería dejar
     * acreditar la seña contra la reserva de otro.
     *
     * <p>{@code SENADO}, no {@code PAGADO}: es plata que entró contra un total que
     * todavía no se completó.
     */
    private void registrarLaSena(AltaSenaRequest sena, Long idReserva, Long idAutor) {
        pagos.registrar(new AltaPagoRequest(
                sena.idUsuario(),
                null, idReserva, null, null,
                "Seña de la reserva",
                sena.monto(),
                sena.moneda(),
                sena.cotizacionDolar(),
                sena.medioPago(),
                null, null,
                EstadoPago.SENADO,
                null, null),
                idAutor);
    }

    @Transactional
    public ReservaResumen editar(Long id, EdicionReservaRequest solicitud, Long idAutor) {
        Reserva reserva = buscar(id);

        // Se lee ANTES de tocar nada: después del set, "lo que había" ya no existe
        // en ningún lado, y sin eso no se puede saber si el cambio es de los que
        // hay que avisar.
        String salaAnterior = reserva.getSala().getNombreSala();
        LocalDate fechaAnterior = reserva.getFecha();
        LocalTime horaAnterior = reserva.getHoraInicio();

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

        avisarSiSeMovio(reserva, salaAnterior, fechaAnterior, horaAnterior);

        return conParticipantes(reserva);
    }

    /**
     * <b>*"Las notificaciones de cambio de sala llegan solas"*</b> — regla dura de
     * §8, y el segundo escritor que tiene la tabla {@code notificacion}.
     *
     * <p>Tres decisiones adentro:
     *
     * <ul>
     *   <li><b>Solo si de verdad se movió.</b> Corregir una nota o asignar el profe
     *       que faltaba no le cambia el día a nadie, y un aviso por cada edición
     *       entrena a la gente a ignorar los avisos — que es peor que no tenerlos.
     *   <li><b>Le llega al profesor y a los alumnos</b>, no solo al profesor: el
     *       alcance nombra al profesor porque la regla se levantó en su entrevista,
     *       pero el que se presenta en la sala equivocada es cualquiera de los dos.
     *   <li><b>Dice de dónde a dónde.</b> "Cambió tu clase" obliga a ir a buscar
     *       qué cambió; con el antes y el después, el aviso se basta solo — que es
     *       la misma razón por la que el rechazo de una solicitud lleva el motivo
     *       adentro. Acá no hay mail ni WhatsApp: esto se lee cuando la persona
     *       entra.
     * </ul>
     */
    private void avisarSiSeMovio(Reserva reserva,
            String salaAnterior,
            LocalDate fechaAnterior,
            LocalTime horaAnterior) {

        boolean cambioDeSala = !reserva.getSala().getNombreSala().equals(salaAnterior);
        boolean cambioDeHorario = !reserva.getFecha().equals(fechaAnterior)
                || !reserva.getHoraInicio().equals(horaAnterior);

        if (!cambioDeSala && !cambioDeHorario) {
            return;
        }

        String texto = "Tu " + reserva.getTipoUso().getNombre().toLowerCase()
                + " pasó de " + salaAnterior + ", " + fechaAnterior.format(DIA)
                + " a las " + horaAnterior
                + " a " + reserva.getSala().getNombreSala() + ", "
                + reserva.getFecha().format(DIA) + " a las " + reserva.getHoraInicio() + ".";

        for (Usuario destino : aQuienesLesCambia(reserva)) {
            avisos.avisar(destino, TipoNotificacion.RESERVA_MOVIDA,
                    "Te movimos una clase", texto, "/mis-reservas");
        }
    }

    /**
     * Quiénes tienen que enterarse: los anotados y el profesor.
     *
     * <p>La participación cancelada no cuenta —esa persona ya no va— y el profesor
     * puede no existir (P37: una clase se carga antes de saber quién la toma).
     */
    private List<Usuario> aQuienesLesCambia(Reserva reserva) {
        List<Usuario> destinos = new ArrayList<>();

        for (ReservaParticipante p : participantes.deLasReservas(List.of(reserva.getId()))) {
            if (p.getEstadoAsistencia() != EstadoAsistencia.CANCELADA) {
                destinos.add(p.getUsuario());
            }
        }

        if (reserva.getProfesor() != null) {
            destinos.add(reserva.getProfesor().getUsuario());
        }
        return destinos;
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

        // Reactivar una reserva cuya seña fue devuelta lo rechaza `V11`, y ese
        // trigger es INMEDIATO: corre cuando el UPDATE llega a la base. Sin este
        // flush el UPDATE viaja recién en el commit y el 409 se convertiría en un
        // 500 -- y peor, hasta entonces la respuesta describiría un estado que la
        // base todavía no aceptó. Es la misma razón por la que `PagoService.anular`
        // flushea, y el mismo cuidado de no depender del flush incidental de una
        // consulta ajena.
        reservas.flush();
        return conParticipantes(reserva);
    }

    // == Participantes =======================================================

    /**
     * Anotar a alguien en una clase que ya existe. <b>Sigue existiendo aunque el
     * alta ahora acepte participantes</b>: un alumno que se suma a una clase
     * grupal la semana siguiente es un gesto real, y las recuperaciones caen acá.
     */
    @Transactional
    public ParticipanteResumen agregarParticipante(Long idReserva, AltaParticipanteRequest solicitud) {
        return ParticipanteResumen.de(anotar(buscar(idReserva), solicitud));
    }

    /**
     * Anotar a una persona en una reserva, por los dos caminos que llevan acá: el
     * alta que trae sus participantes y {@code POST .../participantes}.
     *
     * <p><b>Es uno solo a propósito.</b> Las reglas que se disparan al anotar
     * —que la inscripción sea del que asiste (`V1` §8.2), que nadie esté en dos
     * salas a la vez y que no se consuman más clases que las contratadas (`V9`)—
     * son de la base y no distinguen por dónde se entró. Dos copias de este método
     * serían dos lugares donde olvidarse del pre-chequeo.
     */
    private ReservaParticipante anotar(Reserva reserva, AltaParticipanteRequest solicitud) {
        Usuario persona = usuarios.findById(solicitud.idUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + solicitud.idUsuario() + "."));

        // La base ya lo impide con `participante_unico_por_reserva`; esto existe
        // para que salga un mensaje y no una violación de constraint. Y cubre
        // también a la misma persona repetida dos veces en un alta: la fila
        // anterior ya está en la base -- `reserva_participante` es IDENTITY, así
        // que cada `save` escribe en el momento -- y no solo en la sesión.
        if (participantes.existsByReservaIdAndUsuarioId(reserva.getId(), persona.getId())) {
            throw new DatoDuplicadoException("idUsuario", "Esa persona ya está anotada en esa clase.");
        }

        ReservaParticipante participante = new ReservaParticipante();
        participante.setReserva(reserva);
        participante.setUsuario(persona);
        participante.setInscripcion(buscarInscripcion(solicitud.idInscripcion()));
        participante.setObservaciones(normalizar(solicitud.observaciones()));

        return participantes.save(participante);
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
