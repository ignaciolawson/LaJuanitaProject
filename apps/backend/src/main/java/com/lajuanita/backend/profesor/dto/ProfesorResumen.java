package com.lajuanita.backend.profesor.dto;

import com.lajuanita.backend.profesor.Profesor;

/**
 * Un profesor, para elegirlo al armar una inscripción y para la fila de
 * {@code /admin/profesores}.
 *
 * <p>{@code nombreCompleto} viene armado del servidor por lo mismo que en
 * {@code InscripcionResumen}: es lo único que la pantalla muestra, y concatenar
 * en cada lugar donde se dibuja un profesor termina en tres formas distintas del
 * mismo nombre.
 *
 * <p>Lleva también lo que la pantalla de Profesores necesita para administrar
 * <b>la cuenta</b> desde la misma fila —teléfono, si está activa, si la
 * contraseña sigue siendo la temporal—, porque Ignacio pidió que Profesores
 * tenga lo mismo que Equipo (2026-09-12). Son dos cosas distintas y las dos van:
 * {@code activo} es la relación (si da clases), {@code cuentaActiva} es la
 * cuenta (si puede entrar). Un profe de baja con cuenta activa sigue viendo su
 * historial; uno con la cuenta desactivada no entra a nada.
 */
public record ProfesorResumen(
        Long idProfesor,
        Long idUsuario,
        String nombre,
        String apellido,
        String nombreCompleto,
        String email,
        String telefono,
        String especialidad,
        boolean activo,
        boolean cuentaActiva,
        boolean debeCambiarPassword) {

    public static ProfesorResumen de(Profesor profesor) {
        var persona = profesor.getUsuario();
        return new ProfesorResumen(
                profesor.getId(),
                persona.getId(),
                persona.getNombre(),
                persona.getApellido(),
                persona.getNombre() + " " + persona.getApellido(),
                persona.getEmail(),
                persona.getTelefono(),
                profesor.getEspecialidad(),
                profesor.isActivo(),
                persona.isActivo(),
                persona.isDebeCambiarPassword());
    }
}
