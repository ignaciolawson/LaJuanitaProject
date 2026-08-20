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

    /**
     * <b>Todas las notas sobre un alumno, sin importar quién las escribió.</b>
     *
     * <p>Es la consulta que la nota de arriba anunciaba: administración sí puede
     * verlas todas (§8), y esto es <b>una consulta nueva y explícita</b> y no
     * {@link #delProfesorSobreElAlumno} con el profesor en null. La diferencia no
     * es de estilo: una consulta que se salta el filtro cuando le pasan null se
     * puede llamar sin querer desde el portal del profesor y nadie se entera —la
     * pantalla anda igual y muestra las notas de otro—. Ésta no tiene forma de
     * usarse por accidente porque no acepta un profesor.
     *
     * <p>Trae al autor porque en esta lectura el autor <i>es</i> el dato: tres
     * notas de tres profesores sin firma no se pueden leer.
     */
    @Query("""
            SELECT n FROM NotaProfesor n
            JOIN FETCH n.profesor pr
            JOIN FETCH pr.usuario
            LEFT JOIN FETCH n.participacion p
            LEFT JOIN FETCH p.reserva
            WHERE n.alumno.id = :idAlumno
            ORDER BY n.fechaCreacion DESC, n.id DESC
            """)
    List<NotaProfesor> todasSobreElAlumno(@Param("idAlumno") Long idAlumno);

    /** Una nota, solo si es de quien la pide. Ver la nota de arriba. */
    @Query("""
            SELECT n FROM NotaProfesor n
            WHERE n.id = :id AND n.profesor.id = :idProfesor
            """)
    Optional<NotaProfesor> suya(@Param("id") Long id, @Param("idProfesor") Long idProfesor);
}
