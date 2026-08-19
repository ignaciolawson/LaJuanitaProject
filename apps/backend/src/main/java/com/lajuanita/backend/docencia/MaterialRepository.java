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
            LEFT JOIN FETCH m.alumno a
            LEFT JOIN FETCH a.usuario
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
     * <p>Trae lo suyo <b>y lo grupal</b>, que es la otra mitad de la decisión: un
     * material grupal no tiene destinatario, así que si la consulta pidiera
     * {@code id_alumno = :id} no lo vería nadie nunca.
     *
     * <p><b>Lo grupal no se filtra por profesor</b>, y es deliberado: es material
     * del estudio para quien curse. Filtrarlo por los profesores del alumno haría
     * que un apunte general desaparezca al terminar un curso.
     */
    @Query("""
            SELECT m FROM Material m
            JOIN FETCH m.profesor p
            JOIN FETCH p.usuario
            WHERE m.visibleAlumno = TRUE
              AND (m.esGrupal = TRUE OR m.alumno.id = :idAlumno)
            ORDER BY m.fechaSubida DESC, m.id DESC
            """)
    List<Material> paraElAlumno(@Param("idAlumno") Long idAlumno);

    /** Uno, solo si lo subió quien lo pide. */
    @Query("""
            SELECT m FROM Material m
            WHERE m.id = :id AND m.profesor.id = :idProfesor
            """)
    Optional<Material> suyo(@Param("id") Long id, @Param("idProfesor") Long idProfesor);
}
