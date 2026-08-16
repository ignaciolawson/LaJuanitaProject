package com.lajuanita.backend.profesor.dto;

import com.lajuanita.backend.profesor.Profesor;

/**
 * Un profesor, para elegirlo al armar una inscripción.
 *
 * <p>{@code nombreCompleto} viene armado del servidor por lo mismo que en
 * {@code InscripcionResumen}: es lo único que la pantalla muestra, y concatenar
 * en cada lugar donde se dibuja un profesor termina en tres formas distintas del
 * mismo nombre.
 */
public record ProfesorResumen(
        Long idProfesor,
        Long idUsuario,
        String nombre,
        String apellido,
        String nombreCompleto,
        String email,
        String especialidad,
        boolean activo) {

    public static ProfesorResumen de(Profesor profesor) {
        var persona = profesor.getUsuario();
        return new ProfesorResumen(
                profesor.getId(),
                persona.getId(),
                persona.getNombre(),
                persona.getApellido(),
                persona.getNombre() + " " + persona.getApellido(),
                persona.getEmail(),
                profesor.getEspecialidad(),
                profesor.isActivo());
    }
}
