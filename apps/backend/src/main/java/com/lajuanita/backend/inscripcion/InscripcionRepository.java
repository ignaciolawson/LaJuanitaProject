package com.lajuanita.backend.inscripcion;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * <p>Va en SQL nativo porque {@code reserva} y {@code reserva_participante}
     * no tienen entidad todavía: llegan con el Módulo 2. Devuelve
     * {@code Object[]} y no una proyección para no depender de cómo Spring Data
     * hace calzar los alias de una consulta nativa, que en Postgres además
     * vuelven en minúscula.
     *
     * @param ids no puede venir vacía — un {@code IN ()} es un error de sintaxis.
     *        {@code InscripcionService} corta antes.
     * @return filas {@code [id_inscripcion, cantidad]}; las inscripciones sin
     *         ninguna clase dada no aparecen
     */
    @Query(value = """
            SELECT p.id_inscripcion, count(*)
            FROM reserva_participante p
            JOIN reserva r ON r.id_reserva = p.id_reserva
            WHERE p.id_inscripcion IN (:ids)
              AND p.estado_asistencia <> 'CANCELADA'
              AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA')
            GROUP BY p.id_inscripcion
            """, nativeQuery = true)
    List<Object[]> contarClasesConsumidas(@Param("ids") Collection<Long> ids);
}
