package com.lajuanita.backend.profesor;

import org.springframework.data.jpa.repository.JpaRepository;

public interface ProfesorRepository extends JpaRepository<Profesor, Long> {

    /**
     * Responde "¿esta persona da clases?" para armar el menú del portal.
     *
     * <p>Igual que en {@code AlumnoRepository}, se pregunta por la existencia de
     * la fila y no por {@code activo}: un profesor dado de baja tiene que poder
     * seguir viendo el historial de las clases que dictó, aunque ya no se le
     * asignen alumnos nuevos.
     */
    boolean existsByUsuarioId(Long idUsuario);
}
