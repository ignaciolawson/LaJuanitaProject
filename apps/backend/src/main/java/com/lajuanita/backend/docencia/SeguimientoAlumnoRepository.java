package com.lajuanita.backend.docencia;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SeguimientoAlumnoRepository extends JpaRepository<SeguimientoAlumno, Long> {

    /** El estado que este profesor le puso a este alumno, si le puso alguno. */
    Optional<SeguimientoAlumno> findByProfesorIdAndAlumnoId(Long idProfesor, Long idAlumno);

    /**
     * Los estados de una lista de alumnos, en una consulta.
     *
     * <p>Para la pantalla "Mis alumnos": pedirlo de a uno son treinta consultas
     * para pintar treinta semáforos.
     *
     * @param idsAlumno no puede venir vacía — un {@code IN ()} es un error de
     *        sintaxis. {@code DocenciaService} corta antes.
     */
    @Query("""
            SELECT s FROM SeguimientoAlumno s
            WHERE s.profesor.id = :idProfesor AND s.alumno.id IN :idsAlumno
            """)
    List<SeguimientoAlumno> delProfesorPara(@Param("idProfesor") Long idProfesor,
            @Param("idsAlumno") Collection<Long> idsAlumno);
}
