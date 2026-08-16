package com.lajuanita.backend.alumno;

import java.util.Collection;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.EstadoInscripcion;
import com.lajuanita.backend.inscripcion.Nivel;

public interface AlumnoRepository extends JpaRepository<Alumno, Long> {

    /**
     * Responde "¿esta persona es alumna?" para armar el menú del portal.
     *
     * <p>Se pregunta por la EXISTENCIA de la fila, no por {@code estado_alumno}:
     * quien terminó el curso sigue siendo alumno para el sistema y conserva el
     * acceso a sus materiales y su historial. Ver P19 en
     * {@code docs/requirements/platform.md} -- si el cliente decide que el
     * alumno inactivo pierde el portal, el cambio es acá y en ningún otro lado.
     */
    boolean existsByUsuarioId(Long idUsuario);

    /**
     * Listado con buscador y tres filtros, todos opcionales: en null, no filtran.
     *
     * <p>El {@code JOIN FETCH} no es decorativo. Sin él, {@code AlumnoResumen}
     * lee el usuario de cada fila y Hibernate dispara una consulta por alumno
     * (el problema N+1): 50 alumnos serían 51 consultas. Con el fetch, es una.
     *
     * <p><b>La disciplina y el nivel se filtran con un EXISTS, y las dos
     * condiciones van DENTRO del mismo</b> (decidido con Ignacio el 2026-08-16).
     * Los dos detalles importan:
     *
     * <ul>
     *   <li><b>EXISTS y no JOIN</b> porque un alumno puede tener varias
     *       inscripciones: con un JOIN aparecería repetido tantas veces como
     *       cursos tenga, y el total de la página mentiría.
     *   <li><b>Una sola subconsulta y no dos</b> porque quien hace DJ inicial y
     *       producción avanzada <i>no</i> hace DJ avanzado. Con un EXISTS por
     *       cada filtro, buscar "DJ avanzado" lo traería igual: uno se
     *       satisfaría con la inscripción de DJ y el otro con la de producción.
     *       La misma inscripción tiene que cumplir las dos condiciones.
     * </ul>
     *
     * <p>Solo mira las inscripciones {@link EstadoInscripcion#VIGENTES}: filtrar
     * por "DJ" trae a quien está haciendo DJ, no a quien lo terminó el año
     * pasado. Y un alumno con DJ y mentoría aparece en las dos listas, que es lo
     * que se pidió.
     */
    @Query("""
            SELECT a FROM Alumno a
            JOIN FETCH a.usuario u
            WHERE (:estado IS NULL OR a.estadoAlumno = :estado)
              AND (LOWER(u.nombre)   LIKE :patron ESCAPE '\\'
                   OR LOWER(u.apellido) LIKE :patron ESCAPE '\\'
                   OR LOWER(u.email)    LIKE :patron ESCAPE '\\')
              AND (:disciplina IS NULL AND :nivel IS NULL
                   OR EXISTS (SELECT 1 FROM Inscripcion i
                              WHERE i.alumno = a
                                AND i.estado IN :vigentes
                                AND (:disciplina IS NULL OR i.disciplina = :disciplina)
                                AND (:nivel      IS NULL OR i.nivel = :nivel)))
            ORDER BY LOWER(u.apellido), LOWER(u.nombre)
            """)
    Page<Alumno> buscar(@Param("patron") String patron,
            @Param("estado") EstadoAlumno estado,
            @Param("disciplina") Disciplina disciplina,
            @Param("nivel") Nivel nivel,
            @Param("vigentes") Collection<EstadoInscripcion> vigentes,
            Pageable paginado);

    /**
     * Qué está cursando cada alumno de la lista, en una sola consulta.
     *
     * <p>Existe para que el listado pueda <b>mostrar</b> la disciplina, no solo
     * filtrar por ella: una lista filtrada por "DJ" que no dice de qué es cada
     * fila obliga a confiar en que el filtro hizo lo que dijo.
     *
     * <p>Mira las mismas inscripciones que el filtro de arriba. Si las dos se
     * separan, la pantalla filtra por una cosa y muestra otra.
     *
     * @param ids no puede venir vacía — un {@code IN ()} es un error de sintaxis.
     *        {@code AlumnoService} corta antes.
     * @return filas {@code [id_alumno, disciplina]}; los alumnos sin nada vigente
     *         no aparecen
     */
    @Query("""
            SELECT i.alumno.id, i.disciplina
            FROM Inscripcion i
            WHERE i.alumno.id IN :ids
              AND i.estado IN :vigentes
            ORDER BY i.alumno.id, i.disciplina
            """)
    List<Object[]> disciplinasVigentes(@Param("ids") Collection<Long> ids,
            @Param("vigentes") Collection<EstadoInscripcion> vigentes);
}
