package com.lajuanita.backend.usuario.dto;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;

/**
 * Una fila del listado de usuarios. Nunca lleva {@code passwordHash}: por eso
 * las pantallas devuelven este record y no la entidad.
 */
public record UsuarioResumen(
        Long id,
        String nombre,
        String apellido,
        String email,
        String telefono,
        Rol rol,
        boolean activo,
        boolean debeCambiarPassword) {

    public static UsuarioResumen de(Usuario usuario) {
        return new UsuarioResumen(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getTelefono(),
                usuario.getRol(),
                usuario.isActivo(),
                usuario.isDebeCambiarPassword());
    }
}
