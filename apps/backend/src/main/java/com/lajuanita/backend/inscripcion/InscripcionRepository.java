package com.lajuanita.backend.inscripcion;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.EstadoReserva;

public interface InscripcionRepository extends JpaRepository<Inscripcion, Long> {

    /**
     * El pre-chequeo de "una sola activa por disciplina" (P3).
     *
     * <p>Quien decide de verdad es el índice único parcial
     * {@code inscripcion_una_activa_por_disciplina}: esto existe para que salga
     * un mensaje entendible en vez de una violación de constraint, igual que en
     * el alta de alumno.
     */
    boolean existsByAlumnoIdAndDisciplinaAndEstado(Long idAlumno,
            Disciplina disciplina,
            EstadoInscripcion estado);

    /**
     * Listado con buscador y cuatro filtros, todos opcionales: en null, no
     * filtran.
     *
     * <p>Los {@code JOIN FETCH} traen alumno, persona y profesor en la misma
     * consulta. Sin ellos, {@code InscripcionResumen} los lee fila por fila y
     * Hibernate dispara tres consultas por inscripción — el problema N+1 que ya
     * se había resuelto en el listado de alumnos.
     *
     * <p>El del profesor va {@code LEFT} porque una inscripción sin profe
     * asignado es válida, y con un {@code JOIN} a secas desaparecería del
     * listado justo cuando es la que hay que mirar.
     */
    @Query("""
            SELECT i FROM Inscripcion i
            JOIN FETCH i.alumno a
            JOIN FETCH a.usuario u
            LEFT JOIN FETCH i.profesor p
            LEFT JOIN FETCH p.usuario
            WHERE (:idAlumno   IS NULL OR a.id = :idAlumno)
              AND (:idProfesor IS NULL OR p.id = :idProfesor)
              AND (:disciplina IS NULL OR i.disciplina = :disciplina)
              AND (:estado     IS NULL OR i.estado = :estado)
              AND (LOWER(u.nombre)   LIKE :patron ESCAPE '\\'
                   OR LOWER(u.apellido) LIKE :patron ESCAPE '\\'
                   OR LOWER(u.email)    LIKE :patron ESCAPE '\\')
            ORDER BY LOWER(u.apellido), LOWER(u.nombre), i.id DESC
            """)
    Page<Inscripcion> buscar(@Param("patron") String patron,
            @Param("idAlumno") Long idAlumno,
            @Param("idProfesor") Long idProfesor,
            @Param("disciplina") Disciplina disciplina,
            @Param("estado") EstadoInscripcion estado,
            Pageable paginado);

    /**
     * Cuántas clases consumió cada inscripción de la lista.
     *
     * <p><b>Esta consulta es la definición de "clase consumida" del lado de la
     * aplicación, y tiene que decir exactamente lo mismo que
     * {@code verificar_clases_contratadas} en {@code V9} §5.</b> Si las dos se
     * separan, la pantalla muestra un número que la base no reconoce: le dice a
     * Micaela que quedan tres clases y al cargar la siguiente la rechaza. Al
     * cambiar una, cambiar la otra.
     *
     * <p>La regla, de {@code platform.md} §13: <i>una clase solo se consume
     * cuando se toma</i>. No cuentan las reservas CANCELADA ni REPROGRAMADA, ni
     * las participaciones dadas de baja. <b>El ausente sí consume</b> — faltar
     * sin avisar no devuelve la clase, y eso es lo que le da sentido a
     * {@code AUSENTE_JUSTIFICADO} como estado aparte.
     *
     * <p><b>Era SQL nativo</b> hasta el 2026-08-16, porque {@code reserva} y
     * {@code reserva_participante} no tenían entidad. Ahora que la tienen se
     * escribe en JPQL, y eso no es cosmética: las dos exclusiones dejaron de ser
     * literales sueltas y pasan por {@link EstadoAsistencia#CANCELADA} y
     * {@link EstadoReserva#OCUPAN_LA_SALA}, que son las mismas constantes que usa
     * el resto del sistema. Un estado nuevo ya no puede quedarse afuera de esta
     * cuenta en silencio.
     *
     * @param ids no puede venir vacía — un {@code IN ()} es un error de sintaxis.
     *        {@code InscripcionService} corta antes.
     * @return filas {@code [id_inscripcion, cantidad]}; las inscripciones sin
     *         ninguna clase dada no aparecen
     */
    @Query("""
            SELECT p.inscripcion.id, count(p)
            FROM ReservaParticipante p
            JOIN p.reserva r
            WHERE p.inscripcion.id IN :ids
              AND p.estadoAsistencia <> :cancelada
              AND r.estado IN :ocupan
            GROUP BY p.inscripcion.id
            """)
    List<Object[]> contarClasesConsumidas(@Param("ids") Collection<Long> ids,
            @Param("cancelada") EstadoAsistencia cancelada,
            @Param("ocupan") Collection<EstadoReserva> ocupan);

    /**
     * Las inscripciones de una persona, por {@code usuario} y no por {@code alumno}.
     *
     * <p>La distinción importa acá más que en ningún otro lado: {@code pago} se
     * lleva contra {@code id_usuario} —como todas las tablas transaccionales—
     * mientras que {@code inscripcion} cuelga de {@code alumno}. El estado de
     * cuenta cruza las dos cosas, así que necesita entrar por la identidad raíz.
     *
     * <p>Trae todas, de cualquier estado: una inscripción cancelada con un saldo
     * a favor sigue siendo parte de la cuenta de esa persona.
     */
    @Query("""
            SELECT i FROM Inscripcion i
            JOIN FETCH i.alumno a
            JOIN FETCH a.usuario u
            WHERE u.id = :idUsuario
            ORDER BY i.id
            """)
    List<Inscripcion> deLaPersona(@Param("idUsuario") Long idUsuario);

    /**
     * Las inscripciones vigentes de un conjunto de alumnos, en una consulta.
     *
     * <p>Para "Mis alumnos" del portal del profesor, que muestra cuántas clases le
     * quedan a cada uno: pedirlo de a un alumno son treinta consultas para pintar
     * treinta números.
     *
     * <p><b>Solo las vigentes</b> —{@code ACTIVA} + {@code PAUSADA}—, la misma
     * definición que usa el listado de alumnos: lo que interesa es lo que la
     * persona está cursando, no lo que terminó el año pasado. La pausada cuenta
     * porque sigue teniendo clases debidas, que es justo al alumno que hay que ir
     * a buscar.
     *
     * @param ids no puede venir vacía — un {@code IN ()} es un error de sintaxis
     */
    @Query("""
            SELECT i FROM Inscripcion i
            WHERE i.alumno.id IN :ids AND i.estado IN :vigentes
            """)
    List<Inscripcion> vigentesDeLosAlumnos(@Param("ids") Collection<Long> ids,
            @Param("vigentes") Collection<EstadoInscripcion> vigentes);
}
