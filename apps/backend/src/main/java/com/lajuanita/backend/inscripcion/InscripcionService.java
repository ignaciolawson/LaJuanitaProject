package com.lajuanita.backend.inscripcion;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.inscripcion.dto.AltaInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.EdicionInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.InscripcionResumen;
import com.lajuanita.backend.inscripcion.dto.SenaDeInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.InscripcionCreada;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.pago.dto.AltaPagoRequest;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.programa.Programa;
import com.lajuanita.backend.programa.ProgramaService;
import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.DatoDuplicadoException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.TipoNotificacion;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * El curso contratado: qué cursa cada alumno, con quién, cuántas clases y por
 * cuánto.
 *
 * <p>Es la pieza de la que dependen los filtros del listado de alumnos, el
 * perfil, y —cuando llegue el Módulo 2— el "cada profesor ve solo sus alumnos",
 * porque la relación profesor↔alumno vive en {@code inscripcion.id_profesor} y
 * no en el alumno.
 *
 * <p><b>Buena parte de las reglas de este módulo no están en este archivo.</b>
 * Están en la base, que es donde este proyecto puso sus reglas de negocio: una
 * sola inscripción activa por disciplina (índice único parcial), no consumir más
 * clases que las contratadas y no bajar de nivel sin firma ({@code V9}). Lo de
 * acá son los mensajes entendibles delante de esas reglas y las que la base no
 * puede expresar sola.
 */
@Service
public class InscripcionService {

    private final InscripcionRepository inscripciones;
    private final AlumnoRepository alumnos;
    private final ProfesorRepository profesores;
    private final ProgramaService programas;
    private final PagoService pagos;

    /**
     * Hasta cuándo se aguanta una preinscripción sin señar (P59 · P72: 24 hs).
     * Configurable con default, por lo mismo que {@code lajuanita.prereserva.horas}:
     * una regla de negocio que sólo vive en un archivo de configuración es una
     * regla que nadie encuentra.
     */
    @Value("${lajuanita.preinscripcion.horas:24}")
    private long horasDePreinscripcion;

    /**
     * A los cuántos días del alta una preinscripción sin señar se cancela sola
     * (P73, §17 · H3: <i>"ponele 3 semanas"</i>). Es el límite automático que
     * Ignacio ofreció para que un preinscripto que nunca contestó no viva en
     * Deudores para siempre; hasta ahí, la cancela Mica a mano (P61).
     */
    @Value("${lajuanita.preinscripcion.cancelacion-dias:21}")
    private long diasParaCancelarSola;

    private final NotificacionService avisos;
    private final UsuarioRepository usuarios;

    public InscripcionService(InscripcionRepository inscripciones,
            AlumnoRepository alumnos,
            ProfesorRepository profesores,
            ProgramaService programas,
            PagoService pagos,
            NotificacionService avisos,
            UsuarioRepository usuarios) {
        this.inscripciones = inscripciones;
        this.alumnos = alumnos;
        this.profesores = profesores;
        this.programas = programas;
        this.pagos = pagos;
        this.avisos = avisos;
        this.usuarios = usuarios;
    }

    /**
     * La sexta regla del scheduler (P73): la preinscripta que pasó
     * {@code diasParaCancelarSola} desde el alta sin la seña se cancela sola.
     *
     * <p>Es el espejo de {@code ReservaService.vencerLasPrereservas} con dos
     * diferencias que son la decisión: <b>el reloj es de días y no de horas</b>
     * (no hay horario que liberar — P60, sin cupo —, sólo Deudores que limpiar),
     * y <b>entre las 24 hs y las tres semanas manda Mica</b> (P61 · P72): la
     * alerta de la quinta regla ya la avisó, y ella cobró o no. Esto es el
     * final para lo que nadie resolvió.
     *
     * <p>Sale por la escalera de `V30` (PREINSCRIPTA → CANCELADA está permitido)
     * sin firma: la inscripción no tiene autor de cambio de estado, a diferencia
     * de la reserva. Avisa a las dos partes por motivos distintos —la persona
     * creía estar anotada; administración pierde una fila de Deudores sin haber
     * cobrado— con la clave del hecho, así que correrlo dos veces avisa una.
     *
     * @return cuántas se cancelaron
     */
    @Transactional
    public int cancelarLasAbandonadas() {
        OffsetDateTime limite = OffsetDateTime.now().minusDays(diasParaCancelarSola);
        List<Inscripcion> abandonadas = inscripciones.preinscripcionesAbandonadas(
                EstadoInscripcion.PREINSCRIPTA, limite);

        for (Inscripcion i : abandonadas) {
            i.pasarA(EstadoInscripcion.CANCELADA);
            avisarQueSeCancelo(i);
        }
        // La escalera de `V30` es inmediata: sin el flush, un rechazo llegaría
        // como un 500 desde afuera del método, sin dónde explicarlo.
        inscripciones.flush();
        return abandonadas.size();
    }

    private void avisarQueSeCancelo(Inscripcion i) {
        Usuario persona = i.getAlumno().getUsuario();
        String programa = i.getDisciplina().name();
        String clave = "PREINSCRIPCION_CANCELADA:i=" + i.getId();

        if (!avisos.yaAvisados(List.of(clave)).contains(clave)) {
            avisos.avisar(persona,
                    TipoNotificacion.PREINSCRIPCION_CANCELADA,
                    "Se canceló tu preinscripción a " + programa,
                    "Pasaron " + diasParaCancelarSola + " días sin la seña, así que tu lugar en "
                            + programa + " quedó cancelado. Si todavía querés hacerlo, "
                            + "escribinos y te anotamos de nuevo.",
                    "/mis-cursos",
                    clave);
        }

        for (Usuario admin : usuarios.activosConRol(List.of(Rol.ADMIN, Rol.STAFF))) {
            avisos.avisar(admin,
                    TipoNotificacion.PREINSCRIPCION_CANCELADA,
                    "Preinscripción cancelada por abandono: " + persona.getNombre() + " "
                            + persona.getApellido(),
                    persona.getNombre() + " " + persona.getApellido() + " se anotó a " + programa
                            + " hace más de " + diasParaCancelarSola
                            + " días y nunca señó: la preinscripción se canceló sola y salió de Deudores.",
                    "/admin/inscripciones");
        }
    }

    /**
     * Alta de una inscripción, con o sin su seña (P59, `V30`, P72).
     *
     * <p><b>Con seña nace ACTIVA</b> y el pago entra {@code SENADO} apuntándole,
     * en la misma transacción — el molde de {@code ReservaService.alta}: una
     * inscripción activa cuyo pago falló es lo que la escalera de `V30` existe
     * para no permitir por otro camino. <b>Sin seña nace PREINSCRIPTA</b>, con el
     * plazo puesto por el servidor, y la activa después el pago de la seña
     * ({@code PagoService.registrar}). <b>En cero nace activa sin seña</b>: una
     * beca es un precio (§13) y no tiene qué señar.
     *
     * <p>{@code idAutor} firma el pago de la seña; sin seña no se usa.
     */
    @Transactional
    public InscripcionCreada alta(AltaInscripcionRequest solicitud, Long idAutor) {
        Alumno alumno = alumnos.findById(solicitud.idAlumno())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el alumno " + solicitud.idAlumno() + "."));

        // El índice único parcial es quien decide; esto es para que el mensaje
        // nombre el problema real y no una violación de constraint. Desde `V30`
        // el índice mira ACTIVA y PREINSCRIPTA (`ABIERTAS`), y el mensaje lo dice.
        if (inscripciones.existsByAlumnoIdAndDisciplinaAndEstadoIn(
                alumno.getId(), solicitud.disciplina(), EstadoInscripcion.ABIERTAS)) {
            throw new DatoDuplicadoException("disciplina",
                    "Ese alumno ya tiene una inscripción abierta en esa disciplina "
                    + "(activa o preinscripta).");
        }

        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setProfesor(buscarProfesor(solicitud.idProfesor()));
        inscripcion.setDisciplina(solicitud.disciplina());
        inscripcion.setNivel(solicitud.nivel());
        inscripcion.setClasesContratadas(
                clasesDe(solicitud.disciplina(), solicitud.clasesContratadas()));
        inscripcion.setPrecioTotal(solicitud.precioTotal());
        inscripcion.setMoneda(solicitud.moneda() == null ? Moneda.ARS : solicitud.moneda());
        inscripcion.setCotizacionDolar(solicitud.cotizacionDolar());
        inscripcion.setFechaInicio(solicitud.fechaInicio());
        inscripcion.setNotas(normalizar(solicitud.notas()));

        boolean hayQueSeniar = solicitud.sena() == null
                && solicitud.precioTotal().compareTo(BigDecimal.ZERO) > 0;
        if (hayQueSeniar) {
            inscripcion.preinscribir(
                    OffsetDateTime.now().plusHours(horasDePreinscripcion));
        }

        Inscripcion guardada = inscripciones.save(inscripcion);

        Long idPagoSena = solicitud.sena() == null
                ? null
                : registrarLaSena(solicitud.sena(), guardada, idAutor);

        // Recién creada: no hay ninguna clase dada todavía.
        return new InscripcionCreada(InscripcionResumen.de(guardada, 0), idPagoSena);
    }

    /**
     * La seña como {@code pago}, delegada a Módulo 3 para que la caja, el estado
     * de cuenta y Deudores la vean como cualquier otro pago. Va {@code SENADO} y
     * no {@code PAGADO}: es plata contra un total que todavía no se completó.
     */
    private Long registrarLaSena(SenaDeInscripcionRequest sena, Inscripcion inscripcion,
            Long idAutor) {
        return pagos.registrar(new AltaPagoRequest(
                inscripcion.getAlumno().getUsuario().getId(),
                null, null,
                inscripcion.getId(), null, null, null,
                "Seña del programa",
                sena.monto(),
                sena.moneda(),
                sena.cotizacionDolar(),
                sena.medioPago(),
                null, null,
                EstadoPago.SENADO,
                null),
                idAutor).idPago();
    }

    @Transactional(readOnly = true)
    public Page<InscripcionResumen> listar(String buscar,
            Long idAlumno,
            Long idProfesor,
            Disciplina disciplina,
            EstadoInscripcion estado,
            Pageable paginado) {

        Page<Inscripcion> pagina = inscripciones.buscar(
                Busqueda.patron(buscar), idAlumno, idProfesor, disciplina, estado, paginado);

        Map<Long, Integer> consumidas = clasesConsumidas(pagina.getContent());
        return pagina.map(i -> InscripcionResumen.de(i, consumidas.getOrDefault(i.getId(), 0)));
    }

    @Transactional(readOnly = true)
    public InscripcionResumen porId(Long id) {
        Inscripcion inscripcion = buscar(id);
        return InscripcionResumen.de(inscripcion,
                clasesConsumidas(List.of(inscripcion)).getOrDefault(id, 0));
    }

    /**
     * Edita una inscripción ya cargada.
     *
     * <p>El único paso que no es asignar campos es el nivel: si baja, este
     * método deja la firma que {@code V9} va a exigir en el UPDATE. El autor sale
     * del token y la fecha del reloj del servidor — de la solicitud viene solo el
     * motivo.
     */
    @Transactional
    public InscripcionResumen editar(Long id, EdicionInscripcionRequest solicitud, Long idAutor) {
        Inscripcion inscripcion = buscar(id);

        Nivel nuevoNivel = solicitud.nivel();
        if (nuevoNivel != null && nuevoNivel.esRetrocesoDesde(inscripcion.getNivel())) {
            String motivo = normalizar(solicitud.motivoBajaNivel());
            if (motivo == null) {
                // La base también lo rechaza, pero con el texto del trigger. Acá
                // sale como 400 y nombrando el campo que falta completar.
                throw new SolicitudInvalidaException(
                        "Bajar el nivel de " + inscripcion.getNivel() + " a " + nuevoNivel
                                + " necesita un motivo: es una decisión que queda firmada.");
            }
            inscripcion.firmarBajaDeNivel(idAutor, motivo);
        }

        inscripcion.setProfesor(buscarProfesor(solicitud.idProfesor()));
        inscripcion.setNivel(nuevoNivel);
        inscripcion.setClasesContratadas(solicitud.clasesContratadas());
        inscripcion.setPrecioTotal(solicitud.precioTotal());
        inscripcion.setMoneda(solicitud.moneda());
        inscripcion.setCotizacionDolar(solicitud.cotizacionDolar());
        inscripcion.setFechaInicio(solicitud.fechaInicio());
        inscripcion.setNotas(normalizar(solicitud.notas()));
        empujarALaBase();

        return InscripcionResumen.de(inscripcion,
                clasesConsumidas(List.of(inscripcion)).getOrDefault(id, 0));
    }

    /**
     * Cambia el estado. Nada se borra: cancelar una inscripción conserva sus
     * clases, sus pagos y su historial.
     *
     * <p>Volver a {@code ACTIVA} puede chocar con el índice único si en el medio
     * se abrió otra de la misma disciplina. Eso sale como 409 con su mensaje,
     * que es exactamente lo que hay que decirle a quien lo intenta.
     *
     * <p><b>Sobre una preinscripta, la base decide</b> (`V30` §4): a ACTIVA sólo
     * con la seña cobrada —y para eso el camino es registrar el pago, que la
     * activa solo—, a CANCELADA siempre, a cualquier otra cosa nunca. El 409
     * trae el texto del trigger. Acá no se duplica esa regla: el
     * {@code pasarA} sólo se ocupa de que el plazo se vaya con el estado.
     */
    @Transactional
    public InscripcionResumen cambiarEstado(Long id, EstadoInscripcion estado) {
        Inscripcion inscripcion = buscar(id);
        inscripcion.pasarA(estado);
        empujarALaBase();
        return InscripcionResumen.de(inscripcion,
                clasesConsumidas(List.of(inscripcion)).getOrDefault(id, 0));
    }

    // -------------------------------------------------------------------------

    /**
     * Manda los cambios pendientes a la base <b>ahora</b>, para que las reglas
     * que viven ahí puedan rechazarlos durante el pedido.
     *
     * <p>Las dos reglas de este módulo que no están en Java —el índice único de
     * "una activa por disciplina" y el trigger de `V9` que exige firmar una baja
     * de nivel— solo hablan cuando el UPDATE llega. Hibernate, por su cuenta,
     * lo posterga hasta el commit.
     *
     * <p><b>Esto funcionaba sin querer hasta el 2026-08-16.</b>
     * {@code contarClasesConsumidas} era una consulta nativa, y ante una nativa
     * Hibernate no puede saber qué tablas toca, así que vacía la sesión entera
     * por las dudas. Al pasarla a JPQL —que sí sabe, y por eso ya no vacía nada
     * ajeno— la reactivación de una inscripción que choca con otra activa
     * empezó a devolver 200. Lo encontró un test, y la corrección no es volver
     * a la consulta nativa sino dejar de depender de un efecto colateral.
     */
    private void empujarALaBase() {
        inscripciones.flush();
    }

    /**
     * Cuántas clases lleva dictadas cada inscripción de la lista, en una sola
     * consulta para toda la página.
     *
     * <p><b>Es público desde el Módulo 4</b>, para que "Mi progreso" del portal
     * cuente igual que esta pantalla. La alternativa era que el portal armara su
     * propia cuenta, y ahí serían tres definiciones de "clase consumida" —esta, la
     * del portal y la de `V9` §5— en vez de dos que ya se cuidan juntas.
     */
    public Map<Long, Integer> clasesConsumidas(Collection<Inscripcion> filas) {
        List<Long> ids = filas.stream().map(Inscripcion::getId).toList();
        if (ids.isEmpty()) {
            // `IN ()` no es SQL válido: sin esto, una página vacía revienta.
            return Map.of();
        }

        Map<Long, Integer> porInscripcion = new HashMap<>();
        for (Object[] fila : inscripciones.contarClasesConsumidas(
                ids, EstadoAsistencia.CANCELADA, EstadoReserva.OCUPAN_LA_SALA)) {
            porInscripcion.put(((Number) fila[0]).longValue(), ((Number) fila[1]).intValue());
        }
        return porInscripcion;
    }

    /**
     * Las clases del curso, con la cantidad de fábrica de la disciplina como
     * valor por defecto (§13, P34).
     *
     * <p>Vive en el servidor y no en la pantalla a propósito: es una regla del
     * negocio, y si la supiera solo el front, la misma alta hecha por la API
     * quedaría sin ella.
     *
     * <p><b>Desde `V28` la cantidad sale del catálogo</b>, no del enum: es la
     * misma fila que Mica edita en {@code /admin/programas}, así que el 8 de DJ
     * vive en UN lugar. El catálogo también decide si la disciplina se ofrece
     * hoy ({@code activo}); la cantidad pedida a mano le sigue ganando al
     * estándar, como siempre.
     */
    private short clasesDe(Disciplina disciplina, Short pedidas) {
        Programa programa = programas.paraInscribir(disciplina);

        if (pedidas != null) {
            return pedidas;
        }

        Short estandar = programa.getClasesEstandar();
        if (estandar == null) {
            throw new SolicitudInvalidaException(
                    "El programa de " + disciplina
                            + " no tiene una cantidad estándar de clases: decí cuántas son en `clasesContratadas`.");
        }
        return estandar;
    }

    private Profesor buscarProfesor(Long idProfesor) {
        if (idProfesor == null) {
            return null;
        }
        return profesores.findById(idProfesor)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el profesor " + idProfesor + "."));
    }

    private Inscripcion buscar(Long id) {
        return inscripciones.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe la inscripción " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
