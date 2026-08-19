package com.lajuanita.backend.docencia;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.docencia.dto.AltaMaterialRequest;
import com.lajuanita.backend.docencia.dto.AltaNotaRequest;
import com.lajuanita.backend.docencia.dto.AlumnoDelProfesor;
import com.lajuanita.backend.docencia.dto.ClasesDictadas;
import com.lajuanita.backend.docencia.dto.MaterialResumen;
import com.lajuanita.backend.docencia.dto.NotaResumen;
import com.lajuanita.backend.docencia.dto.SeguimientoRequest;
import com.lajuanita.backend.docencia.dto.SeguimientoResumen;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.EstadoInscripcion;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.inscripcion.InscripcionService;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaParticipante;
import com.lajuanita.backend.reserva.ReservaParticipanteRepository;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.reserva.dto.ParticipanteResumen;
import com.lajuanita.backend.reserva.dto.ReservaResumen;
import com.lajuanita.backend.usuario.OperacionNoPermitidaException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;

/**
 * El portal del profesor: su agenda, sus alumnos y lo que anota sobre ellos.
 *
 * <p><b>Todo lo de acá pasa por {@link #miDocencia} y por
 * {@link #verificarQueEsMiAlumno}, y no hay un solo método que se los saltee.</b>
 * Es la regla dura más importante del módulo —*"un profesor accede solo a sus
 * propios alumnos"*— y vive en Java y no en la base a propósito: la razón está
 * escrita en la cabecera de `V14`, y es que "mi alumno" tiene dos caminos y
 * duplicar ese JOIN doble en SQL cuesta más de lo que compra para una regla de
 * lectura.
 *
 * <p>Que viva acá tiene una consecuencia que conviene tener presente: <b>si un
 * método nuevo se olvida del chequeo, nada falla</b>. La pantalla anda igual y
 * muestra de más. Por eso {@code DocenciaTest} está escrito en pares —un profesor
 * mira lo suyo, otro mira lo del primero por el mismo endpoint— y por eso el
 * chequeo es una línea al principio y no una condición repartida por la consulta.
 *
 * <p><b>Este service no modifica reservas</b>, y también es una regla de §8: el
 * profesor ve su agenda y no la toca. Por eso {@link #miAgenda} delega en una
 * consulta de lectura y no hay ningún método que escriba sobre {@code reserva}.
 */
@Service
public class DocenciaService {

    /** Techo del historial, como el del informe de uso y por el mismo motivo. */
    public static final int MAXIMO_DE_DIAS = 366;

    private final ProfesorRepository profesores;
    private final AlumnoRepository alumnos;
    private final NotaProfesorRepository notas;
    private final MaterialRepository materiales;
    private final SeguimientoAlumnoRepository seguimientos;
    private final ReservaRepository reservas;
    private final ReservaParticipanteRepository participantes;
    private final InscripcionRepository inscripciones;
    private final InscripcionService cursos;

    public DocenciaService(ProfesorRepository profesores,
            AlumnoRepository alumnos,
            NotaProfesorRepository notas,
            MaterialRepository materiales,
            SeguimientoAlumnoRepository seguimientos,
            ReservaRepository reservas,
            ReservaParticipanteRepository participantes,
            InscripcionRepository inscripciones,
            InscripcionService cursos) {
        this.profesores = profesores;
        this.alumnos = alumnos;
        this.notas = notas;
        this.materiales = materiales;
        this.seguimientos = seguimientos;
        this.reservas = reservas;
        this.participantes = participantes;
        this.inscripciones = inscripciones;
        this.cursos = cursos;
    }

    // == Mi agenda y mi historial ============================================

    /**
     * Las clases que doy en un rango.
     *
     * <p>Reusa la consulta del calendario de administración filtrando por
     * profesor — <b>y devuelve el mismo DTO, con los participantes adentro</b>,
     * que es correcto acá y no lo sería en el portal del alumno: el profesor
     * necesita saber quién va a su clase, y son <i>sus</i> alumnos.
     */
    @Transactional(readOnly = true)
    public List<ReservaResumen> miAgenda(Long idUsuario, LocalDate desde, LocalDate hasta) {
        Profesor yo = miDocencia(idUsuario);
        verificarRango(desde, hasta);

        List<Reserva> encontradas = reservas.agenda(
                desde, hasta, null, yo.getId(), false, EstadoReserva.OCUPAN_LA_SALA);

        Map<Long, List<ParticipanteResumen>> porReserva = participantesDe(encontradas);
        return encontradas.stream()
                .map(r -> ReservaResumen.de(r, porReserva.getOrDefault(r.getId(), List.of())))
                .toList();
    }

    /**
     * Cuántas clases di, que es lo que Ghezz pidió textual.
     *
     * <p><b>Cuenta y no liquida</b>: P20 —si el pago al profesor sale de esta
     * cuenta o se carga a mano— sigue sin respuesta, y poner acá una tarifa sería
     * decidir por el cliente algo que le cuesta plata. Ver {@link ClasesDictadas}.
     *
     * <p>Solo lo que ocupó la sala: una clase cancelada no se dictó. Es la misma
     * definición canónica que usan el informe de uso y las clases consumidas.
     */
    @Transactional(readOnly = true)
    public ClasesDictadas misClasesDictadas(Long idUsuario, LocalDate desde, LocalDate hasta) {
        Profesor yo = miDocencia(idUsuario);
        verificarRango(desde, hasta);

        List<Reserva> dictadas = reservas.agenda(
                desde, hasta, null, yo.getId(), false, EstadoReserva.OCUPAN_LA_SALA);

        Map<String, Long> porTipo = new HashMap<>();
        for (Reserva r : dictadas) {
            porTipo.merge(r.getTipoUso().getNombre(), 1L, Long::sum);
        }

        // Personas distintas, no suma de participaciones: quien fue a ocho clases
        // es un alumno atendido, no ocho.
        Set<Long> personas = new HashSet<>();
        for (ReservaParticipante p : participantesDeLista(dictadas)) {
            if (p.getEstadoAsistencia() != EstadoAsistencia.CANCELADA) {
                personas.add(p.getUsuario().getId());
            }
        }

        List<ClasesDictadas.PorTipo> desglose = porTipo.entrySet().stream()
                .map(e -> new ClasesDictadas.PorTipo(e.getKey(), e.getValue()))
                .sorted((a, b) -> Long.compare(b.clases(), a.clases()))
                .toList();

        return new ClasesDictadas(desde, hasta, dictadas.size(), personas.size(), desglose);
    }

    // == Mis alumnos =========================================================

    /**
     * Mis alumnos, con su semáforo y cuántas clases les quedan.
     *
     * <p>Tres consultas para toda la lista y no tres por alumno: la lista, sus
     * disciplinas, sus seguimientos y sus inscripciones salen cada una de una sola
     * consulta. Con treinta alumnos, la versión ingenua son noventa.
     */
    @Transactional(readOnly = true)
    public List<AlumnoDelProfesor> misAlumnos(Long idUsuario) {
        Profesor yo = miDocencia(idUsuario);

        List<Alumno> mios = alumnos.delProfesor(yo.getId(), null, EstadoAsistencia.CANCELADA);
        if (mios.isEmpty()) {
            // Un profesor recién dado de alta. Lista vacía, no error.
            return List.of();
        }

        List<Long> ids = mios.stream().map(Alumno::getId).toList();

        Map<Long, List<Disciplina>> disciplinas = new HashMap<>();
        for (Object[] fila : alumnos.disciplinasVigentes(ids, EstadoInscripcion.VIGENTES)) {
            disciplinas.computeIfAbsent(((Number) fila[0]).longValue(), id -> new ArrayList<>())
                    .add((Disciplina) fila[1]);
        }

        Map<Long, SeguimientoResumen> semaforo = new HashMap<>();
        for (SeguimientoAlumno s : seguimientos.delProfesorPara(yo.getId(), ids)) {
            semaforo.put(s.getAlumno().getId(), SeguimientoResumen.de(s));
        }

        Map<Long, Integer> restantes = clasesRestantesPorAlumno(ids);

        return mios.stream()
                .map(a -> AlumnoDelProfesor.de(a,
                        disciplinas.getOrDefault(a.getId(), List.of()),
                        semaforo.get(a.getId()),
                        restantes.getOrDefault(a.getId(), 0)))
                .toList();
    }

    // == Notas privadas ======================================================

    @Transactional(readOnly = true)
    public List<NotaResumen> misNotasSobre(Long idUsuario, Long idAlumno) {
        Profesor yo = miDocencia(idUsuario);
        verificarQueEsMiAlumno(yo, idAlumno);

        return notas.delProfesorSobreElAlumno(yo.getId(), idAlumno).stream()
                .map(NotaResumen::de)
                .toList();
    }

    /**
     * Anotar algo sobre un alumno.
     *
     * <p>El autor sale del token. La coherencia entre la sesión y el alumno la
     * verifica la base (`V14` §1): una nota sobre Juan colgada de la clase de Ana
     * no rompe ninguna consulta y arruina el historial, que es exactamente lo que
     * este módulo viene a arreglar.
     */
    @Transactional
    public NotaResumen anotar(Long idUsuario, AltaNotaRequest solicitud) {
        Profesor yo = miDocencia(idUsuario);
        Alumno alumno = verificarQueEsMiAlumno(yo, solicitud.idAlumno());

        NotaProfesor nota = new NotaProfesor();
        nota.setProfesor(yo);
        nota.setAlumno(alumno);
        nota.setContenido(solicitud.contenido().trim());

        if (solicitud.idParticipacion() != null) {
            nota.setParticipacion(participantes.findById(solicitud.idParticipacion())
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No existe esa participación (" + solicitud.idParticipacion() + ").")));
        }

        return NotaResumen.de(notas.save(nota));
    }

    /**
     * Corregir una nota propia.
     *
     * <p>{@code suya} filtra por profesor en la consulta, así que la nota de otro
     * contesta "no existe" — y acá esa respuesta importa más que en ningún otro
     * lado: confirmar que existe una nota ajena sobre un alumno ya dice algo.
     */
    @Transactional
    public NotaResumen corregirNota(Long idUsuario, Long idNota, String contenido) {
        Profesor yo = miDocencia(idUsuario);

        NotaProfesor nota = notas.suya(idNota, yo.getId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe esa nota (" + idNota + ")."));

        nota.corregir(contenido.trim());
        return NotaResumen.de(nota);
    }

    // == Material ============================================================

    @Transactional(readOnly = true)
    public List<MaterialResumen> misMateriales(Long idUsuario, Long idAlumno) {
        Profesor yo = miDocencia(idUsuario);
        if (idAlumno != null) {
            verificarQueEsMiAlumno(yo, idAlumno);
        }

        return materiales.delProfesor(yo.getId(), idAlumno).stream()
                .map(MaterialResumen::de)
                .toList();
    }

    /**
     * Subir material: hoy, un link.
     *
     * <p><b>Sin {@code idAlumno} el material es grupal</b>, y esa traducción se
     * hace acá y no en el formulario: la base no acepta las dos cosas ni ninguna
     * ({@code material_destinatario_definido}), así que dejar que el cliente mande
     * los dos campos por separado es dejar que los mande contradictorios.
     */
    @Transactional
    public MaterialResumen subirMaterial(Long idUsuario, AltaMaterialRequest solicitud) {
        Profesor yo = miDocencia(idUsuario);

        Material material = new Material();
        material.setProfesor(yo);
        material.setTitulo(solicitud.titulo().trim());
        material.setTipo(normalizar(solicitud.tipo()));
        material.setUrlExterna(solicitud.urlExterna().trim());
        material.setVisibleAlumno(solicitud.visibleAlumno() == null || solicitud.visibleAlumno());

        if (solicitud.idAlumno() == null) {
            material.setEsGrupal(true);
        } else {
            material.setEsGrupal(false);
            material.setAlumno(verificarQueEsMiAlumno(yo, solicitud.idAlumno()));
        }

        return MaterialResumen.de(materiales.save(material));
    }

    /** Publicar o esconder un material propio. Es la regla dura "solo si lo habilitó". */
    @Transactional
    public MaterialResumen cambiarVisibilidad(Long idUsuario, Long idMaterial, boolean visible) {
        Profesor yo = miDocencia(idUsuario);

        Material material = materiales.suyo(idMaterial, yo.getId())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe ese material (" + idMaterial + ")."));

        material.setVisibleAlumno(visible);
        return MaterialResumen.de(material);
    }

    // == Seguimiento =========================================================

    /**
     * Mover el semáforo de un alumno, o ponerlo por primera vez.
     *
     * <p>Es un {@code PUT} y no un alta más una edición porque hay <b>uno solo por
     * par profesor-alumno</b> (UNIQUE de `V1`): si esto fuera un POST, el segundo
     * intento chocaría contra el índice y habría que explicarle a alguien por qué
     * "ya existe" cuando lo que quiso fue cambiarlo.
     *
     * <p>La fecha no se toca acá: la pone el trigger de `V14`.
     */
    @Transactional
    public SeguimientoResumen fijarSeguimiento(Long idUsuario,
            Long idAlumno,
            SeguimientoRequest solicitud) {

        Profesor yo = miDocencia(idUsuario);
        Alumno alumno = verificarQueEsMiAlumno(yo, idAlumno);

        SeguimientoAlumno seguimiento = seguimientos
                .findByProfesorIdAndAlumnoId(yo.getId(), idAlumno)
                .orElseGet(() -> {
                    SeguimientoAlumno nuevo = new SeguimientoAlumno();
                    nuevo.setProfesor(yo);
                    nuevo.setAlumno(alumno);
                    return nuevo;
                });

        seguimiento.setEstado(solicitud.estado());
        seguimiento.setObservaciones(normalizar(solicitud.observaciones()));

        return SeguimientoResumen.de(seguimientos.save(seguimiento));
    }

    // -------------------------------------------------------------------------

    /**
     * Quién soy como profesor.
     *
     * <p><b>Es la puerta del módulo entero.</b> Ser profesor no es un rol de
     * permisos sino una relación (§2.1), así que esto no lo puede decidir un
     * {@code @PreAuthorize}: hay que ir a buscar la fila. Ghezz llega acá siendo
     * STAFF y pasa; un ADMIN sin fila en {@code profesor} no pasa, y está bien —
     * administrar el estudio no es dar clases.
     */
    private Profesor miDocencia(Long idUsuario) {
        return profesores.findByUsuarioId(idUsuario)
                .orElseThrow(() -> new OperacionNoPermitidaException(
                        "Esta sección es de los profesores del estudio."));
    }

    /**
     * <b>La regla dura de §8, en una línea.</b>
     *
     * <p>Contesta "no existe" y no "no podés", por lo mismo que en el resto del
     * portal: la segunda respuesta confirma que ese alumno existe, y acá además
     * confirmaría que es alumno de otro profesor.
     */
    private Alumno verificarQueEsMiAlumno(Profesor yo, Long idAlumno) {
        return alumnos.delProfesor(yo.getId(), idAlumno, EstadoAsistencia.CANCELADA).stream()
                .findFirst()
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe ese alumno entre los tuyos (" + idAlumno + ")."));
    }

    /** Cuántas clases le quedan a cada alumno, sumando sus inscripciones vigentes. */
    private Map<Long, Integer> clasesRestantesPorAlumno(List<Long> idsAlumno) {
        List<Inscripcion> vigentes = inscripciones.vigentesDeLosAlumnos(
                idsAlumno, EstadoInscripcion.VIGENTES);
        if (vigentes.isEmpty()) {
            return Map.of();
        }

        // La misma cuenta que hace administración y que hace "Mi progreso" del
        // alumno: una tercera definición de "clase consumida" sería la que un día
        // dice un número que la base no reconoce.
        Map<Long, Integer> consumidas = cursos.clasesConsumidas(vigentes);

        Map<Long, Integer> porAlumno = new HashMap<>();
        for (Inscripcion i : vigentes) {
            int restan = Math.max(
                    i.getClasesContratadas() - consumidas.getOrDefault(i.getId(), 0), 0);
            porAlumno.merge(i.getAlumno().getId(), restan, Integer::sum);
        }
        return porAlumno;
    }

    private List<ReservaParticipante> participantesDeLista(Collection<Reserva> filas) {
        List<Long> ids = filas.stream().map(Reserva::getId).toList();
        if (ids.isEmpty()) {
            return List.of();
        }
        return participantes.deLasReservas(ids);
    }

    private Map<Long, List<ParticipanteResumen>> participantesDe(Collection<Reserva> filas) {
        Map<Long, List<ParticipanteResumen>> porReserva = new HashMap<>();
        for (ReservaParticipante p : participantesDeLista(filas)) {
            porReserva.computeIfAbsent(p.getReserva().getId(), id -> new ArrayList<>())
                    .add(ParticipanteResumen.de(p));
        }
        return porReserva;
    }

    private void verificarRango(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw new SolicitudInvalidaException("La fecha de fin no puede ser anterior a la de inicio.");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) > MAXIMO_DE_DIAS) {
            throw new SolicitudInvalidaException("Se pide de a un año como máximo.");
        }
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
