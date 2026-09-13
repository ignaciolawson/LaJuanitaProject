package com.lajuanita.backend.usuario.dto;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;

/**
 * Una fila del listado de usuarios. Nunca lleva {@code passwordHash}: por eso
 * las pantallas devuelven este record y no la entidad.
 *
 * <p>Lleva los <b>dos ejes</b> de la persona: el rol (permisos) y las
 * relaciones (si es alumno, si es profesor). Desde P77 el Directorio es la
 * pantalla donde una persona se ve entera, y para eso las relaciones tienen
 * que viajar con la fila. En un listado se resuelven en bloque —dos consultas
 * {@code IN (:ids)} por página, ver {@code UsuarioService.listar}— y nunca por
 * fila: el comentario que las dejaba fuera del DTO hablaba de un N+1, y era
 * cierto sólo si se resolvían de a una.
 */
public record UsuarioResumen(
        Long id,
        String nombre,
        String apellido,
        String email,
        String telefono,
        Rol rol,
        boolean activo,
        boolean debeCambiarPassword,
        boolean esAlumno,
        boolean esProfesor) {

    public static UsuarioResumen de(Usuario usuario, boolean esAlumno, boolean esProfesor) {
        return new UsuarioResumen(
                usuario.getId(),
                usuario.getNombre(),
                usuario.getApellido(),
                usuario.getEmail(),
                usuario.getTelefono(),
                usuario.getRol(),
                usuario.isActivo(),
                usuario.isDebeCambiarPassword(),
                esAlumno,
                esProfesor);
    }
}
