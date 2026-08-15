package com.lajuanita.backend.alumno;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
     * Listado con buscador y filtro por estado. Los dos parámetros son
     * opcionales: en null, no filtran.
     *
     * <p>El {@code JOIN FETCH} no es decorativo. Sin él, {@code AlumnoResumen}
     * lee el usuario de cada fila y Hibernate dispara una consulta por alumno
     * (el problema N+1): 50 alumnos serían 51 consultas. Con el fetch, es una.
     */
    @Query("""
            SELECT a FROM Alumno a
            JOIN FETCH a.usuario u
            WHERE (:estado IS NULL OR a.estadoAlumno = :estado)
              AND (LOWER(u.nombre)   LIKE :patron ESCAPE '\\'
                   OR LOWER(u.apellido) LIKE :patron ESCAPE '\\'
                   OR LOWER(u.email)    LIKE :patron ESCAPE '\\')
            ORDER BY LOWER(u.apellido), LOWER(u.nombre)
            """)
    Page<Alumno> buscar(@Param("patron") String patron,
            @Param("estado") EstadoAlumno estado,
            Pageable paginado);
}
