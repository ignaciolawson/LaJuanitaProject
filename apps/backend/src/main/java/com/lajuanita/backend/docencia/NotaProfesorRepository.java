package com.lajuanita.backend.docencia;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotaProfesorRepository extends JpaRepository<NotaProfesor, Long> {

    /**
     * Las notas que UN profesor escribió sobre UN alumno.
     *
     * <p><b>Los dos filtros van siempre juntos, y por eso no hay una consulta que
     * pida solo por alumno.</b> La regla dura de §8 es que las notas privadas no
     * las ve otro profesor; una consulta "todas las notas de este alumno"
     * existiría para ser llamada sin el profesor algún día, y ese día la regla se
     * rompe sin que nada falle. Administración, que sí puede verlas todas, todavía
     * no tiene pantalla — cuando la tenga, va a ser una consulta nueva y explícita,
     * no ésta con un parámetro en null.
     */
    @Query("""
            SELECT n FROM NotaProfesor n
            LEFT JOIN FETCH n.participacion p
            LEFT JOIN FETCH p.reserva
            WHERE n.profesor.id = :idProfesor AND n.alumno.id = :idAlumno
            ORDER BY n.fechaCreacion DESC, n.id DESC
            """)
    List<NotaProfesor> delProfesorSobreElAlumno(@Param("idProfesor") Long idProfesor,
            @Param("idAlumno") Long idAlumno);

    /** Una nota, solo si es de quien la pide. Ver la nota de arriba. */
    @Query("""
            SELECT n FROM NotaProfesor n
            WHERE n.id = :id AND n.profesor.id = :idProfesor
            """)
    Optional<NotaProfesor> suya(@Param("id") Long id, @Param("idProfesor") Long idProfesor);
}
