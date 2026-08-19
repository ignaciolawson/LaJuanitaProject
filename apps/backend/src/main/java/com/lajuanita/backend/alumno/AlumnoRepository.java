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
import com.lajuanita.backend.reserva.EstadoAsistencia;

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
     * La fila de alumno de una persona, para el portal.
     *
     * <p>Convive con {@link #existsByUsuarioId} y no lo reemplaza: el menú solo
     * necesita saber si la relación existe, y traer la entidad entera para
     * contestar un booleano en cada pedido de {@code /api/me} sería caro por
     * nada.
     */
    java.util.Optional<Alumno> findByUsuarioId(Long idUsuario);

    /**
     * <b>Los alumnos de un profesor — la definición de "mi alumno", escrita una
     * sola vez</b> (Módulo 5).
     *
     * <p>Son dos caminos, y es la misma forma que ya tiene "mi reserva" en
     * {@code ReservaRepository.deLaPersona}: <b>tener una inscripción asignada a
     * mí, o haber estado en una clase que yo di</b>.
     *
     * <p>El segundo camino no sobra: <b>el suplente</b>. Quien toma una clase que
     * no es suya necesita poder dejar la nota de esa sesión —es el momento en que
     * más falta hace— y por la asignación no aparecería. Y el primero tampoco: un
     * alumno recién inscripto todavía no fue a ninguna clase, y su profesor tiene
     * que verlo desde el día uno.
     *
     * <p>La participación cancelada no cuenta, por lo mismo que en el resto del
     * sistema: quien se dio de baja de esa clase no estuvo ahí.
     *
     * <p><b>Sin {@code DISTINCT}, y no es un olvido</b>: los dos {@code EXISTS} no
     * multiplican filas —es la misma propiedad por la que el filtro por disciplina
     * de acá arriba usa {@code EXISTS} y no {@code JOIN}—, así que un alumno con
     * ocho clases dictadas por mí sale una sola vez. Ponerlo además rompía:
     * Postgres rechaza un {@code SELECT DISTINCT} cuyo {@code ORDER BY} usa
     * expresiones que no están en la lista de selección, y este ordena por
     * {@code LOWER(apellido)}.
     *
     * <p><b>Esta consulta es la regla dura *"un profesor accede solo a sus propios
     * alumnos"*</b>, y vive acá y no en la base a propósito: ver la cabecera de
     * `V14`. Todo lo que el portal del profesor devuelve se filtra por esta lista.
     *
     * <p><b>{@code idAlumno} es opcional y por eso hay una sola consulta y no
     * dos.</b> En null devuelve la lista; con un id, devuelve ese alumno solo si
     * es mío — que es el chequeo que hace cada endpoint del módulo antes de tocar
     * nada. Separarlas habría significado escribir la condición de dos caminos dos
     * veces, que es exactamente lo que la cabecera de `V14` explica que este
     * proyecto ya pagó una vez y no quiere volver a pagar.
     */
    @Query("""
            SELECT a FROM Alumno a
            JOIN FETCH a.usuario u
            WHERE (:idAlumno IS NULL OR a.id = :idAlumno)
              AND (EXISTS (SELECT 1 FROM Inscripcion i
                          WHERE i.alumno = a AND i.profesor.id = :idProfesor)
               OR EXISTS (SELECT 1 FROM ReservaParticipante rp
                          JOIN rp.reserva r
                          WHERE rp.usuario = u
                            AND r.profesor.id = :idProfesor
                            AND rp.estadoAsistencia <> :cancelada))
            ORDER BY LOWER(u.apellido), LOWER(u.nombre)
            """)
    List<Alumno> delProfesor(@Param("idProfesor") Long idProfesor,
            @Param("idAlumno") Long idAlumno,
            @Param("cancelada") EstadoAsistencia cancelada);

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
