package com.lajuanita.backend.alumno;

import org.springframework.data.jpa.repository.JpaRepository;

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
}
