package com.lajuanita.backend.usuario.dto;

import com.lajuanita.backend.usuario.Rol;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Edición de los datos de una cuenta desde administración.
 *
 * <p>No incluye contraseña a propósito: nadie cambia la contraseña de otro. Si
 * alguien la pierde, administración le da una nueva temporal, que es un camino
 * distinto y deja registro en {@code debe_cambiar_password}.
 */
public record EdicionUsuarioRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 80)
        String nombre,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 80)
        String apellido,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150)
        String email,

        @Size(max = 40)
        String telefono,

        /** Solo lo aplica un ADMIN; para el resto se ignora. */
        Rol rol) {
}
