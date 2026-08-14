package com.lajuanita.backend.auth;

import com.lajuanita.backend.usuario.Rol;

/**
 * Respuesta de {@code GET /api/me}: quién sos, qué podés administrar y qué sos
 * para el negocio. Con esto y nada más el front arma el menú del portal.
 *
 * <p>Los dos ejes están separados a propósito ({@code docs/requirements/platform.md}
 * §2.1): {@link #rol} son permisos, {@link #esAlumno} / {@link #esProfesor} son
 * relaciones. Ghezz vuelve {@code rol=STAFF, esProfesor=true} y las dos cosas
 * valen a la vez.
 *
 * <p>Nunca incluye {@code passwordHash}. Por eso el endpoint devuelve este
 * record y no la entidad.
 *
 * @param debeCambiarPassword si es {@code true}, la contraseña la generó
 *                            administración y el front tiene que exigir que la
 *                            cambie antes de dejar usar el resto del sistema.
 */
public record UsuarioActual(
        Long id,
        String nombre,
        String apellido,
        String email,
        String telefono,
        Rol rol,
        String fotoPerfil,
        boolean esAlumno,
        boolean esProfesor,
        boolean debeCambiarPassword) {
}
