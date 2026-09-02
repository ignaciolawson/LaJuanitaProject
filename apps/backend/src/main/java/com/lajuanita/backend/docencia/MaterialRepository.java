package com.lajuanita.backend.docencia;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MaterialRepository extends JpaRepository<Material, Long> {

    /** Lo que subió un profesor, lo último primero. Ve lo suyo, oculto incluido. */
    @Query("""
            SELECT m FROM Material m
            JOIN FETCH m.inscripcion i
            JOIN FETCH i.alumno a
            JOIN FETCH a.usuario
            LEFT JOIN FETCH m.reserva
            WHERE m.profesor.id = :idProfesor
              AND (:idAlumno IS NULL OR a.id = :idAlumno)
            ORDER BY m.fechaSubida DESC, m.id DESC
            """)
    List<Material> delProfesor(@Param("idProfesor") Long idProfesor,
            @Param("idAlumno") Long idAlumno);

    /**
     * Lo que un alumno puede ver. <b>Es la regla dura de §8 escrita como consulta:
     * el material se ve solo si el profesor lo habilitó.</b>
     *
     * <p>⚠️ <b>Acá vivía el agujero que `V23` cerró</b>, y conviene saber cómo se
     * veía: la condición era {@code esGrupal = TRUE OR alumno.id = :idAlumno}, y
     * lo grupal no se filtraba por nada — <b>un material "para todos" le llegaba a
     * todos los alumnos del estudio</b>, incluidos los que nunca tuvieron a ese
     * profesor. El comentario que estaba acá lo decía con todas las letras y lo
     * defendía ("es material del estudio para quien curse"), mientras las tres
     * pantallas decían otra cosa cada una. Nadie mintió: nadie lo había decidido.
     *
     * <p>Ahora es una sola condición y no tiene rama suelta: el material es del
     * alumno de su inscripción.
     */
    @Query("""
            SELECT m FROM Material m
            JOIN FETCH m.profesor p
            JOIN FETCH p.usuario
            JOIN FETCH m.inscripcion i
            JOIN FETCH i.alumno a
            JOIN FETCH a.usuario
            LEFT JOIN FETCH m.reserva
            WHERE m.visibleAlumno = TRUE
              AND a.id = :idAlumno
            ORDER BY m.fechaSubida DESC, m.id DESC
            """)
    List<Material> paraElAlumno(@Param("idAlumno") Long idAlumno);

    /**
     * <b>Todo lo que le llegó a un alumno, para administración.</b>
     *
     * <p>Es {@link #paraElAlumno} sin el filtro de visibilidad: la ficha de
     * administración muestra también lo que el profesor todavía no publicó, y lo
     * dice. Que el alumno no lo vea es una decisión del profesor sobre cuándo
     * entregarlo, no un secreto contra el estudio.
     *
     * <p>Desde `V23` la condición es una sola —el alumno de la inscripción— y ya
     * no incluye una rama de "grupal" que en realidad traía material de cualquier
     * profesor para cualquiera.
     */
    @Query("""
            SELECT m FROM Material m
            JOIN FETCH m.profesor p
            JOIN FETCH p.usuario
            JOIN FETCH m.inscripcion i
            JOIN FETCH i.alumno a
            JOIN FETCH a.usuario
            LEFT JOIN FETCH m.reserva
            WHERE a.id = :idAlumno
            ORDER BY m.fechaSubida DESC, m.id DESC
            """)
    List<Material> todoLoDelAlumno(@Param("idAlumno") Long idAlumno);

    /** Uno, solo si lo subió quien lo pide. */
    @Query("""
            SELECT m FROM Material m
            WHERE m.id = :id AND m.profesor.id = :idProfesor
            """)
    Optional<Material> suyo(@Param("id") Long id, @Param("idProfesor") Long idProfesor);
}
