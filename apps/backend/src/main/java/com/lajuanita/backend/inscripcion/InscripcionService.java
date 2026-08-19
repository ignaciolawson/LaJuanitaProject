package com.lajuanita.backend.inscripcion;

import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.inscripcion.dto.AltaInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.EdicionInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.InscripcionResumen;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.DatoDuplicadoException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.dinero.Moneda;

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

    public InscripcionService(InscripcionRepository inscripciones,
            AlumnoRepository alumnos,
            ProfesorRepository profesores) {
        this.inscripciones = inscripciones;
        this.alumnos = alumnos;
        this.profesores = profesores;
    }

    @Transactional
    public InscripcionResumen alta(AltaInscripcionRequest solicitud) {
        Alumno alumno = alumnos.findById(solicitud.idAlumno())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el alumno " + solicitud.idAlumno() + "."));

        // El índice único parcial es quien decide; esto es para que el mensaje
        // nombre el problema real y no una violación de constraint.
        if (inscripciones.existsByAlumnoIdAndDisciplinaAndEstado(
                alumno.getId(), solicitud.disciplina(), EstadoInscripcion.ACTIVA)) {
            throw new DatoDuplicadoException("disciplina",
                    "Ese alumno ya tiene una inscripción activa en esa disciplina.");
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

        Inscripcion guardada = inscripciones.save(inscripcion);
        // Recién creada: no hay ninguna clase dada todavía.
        return InscripcionResumen.de(guardada, 0);
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
     */
    @Transactional
    public InscripcionResumen cambiarEstado(Long id, EstadoInscripcion estado) {
        Inscripcion inscripcion = buscar(id);
        inscripcion.setEstado(estado);
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
     */
    private short clasesDe(Disciplina disciplina, Short pedidas) {
        if (pedidas != null) {
            return pedidas;
        }

        Integer estandar = disciplina.clasesEstandar();
        if (estandar == null) {
            throw new SolicitudInvalidaException(
                    "La mentoría se arma a medida: decí cuántas clases son en `clasesContratadas`.");
        }
        return estandar.shortValue();
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
