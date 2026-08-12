package com.lajuanita.backend.auth;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;

/**
 * Lo que manda la pantalla de login.
 *
 * <p>La contraseña llega en claro (por HTTPS) y no se guarda en ningún lado ni
 * se escribe en los logs: se compara contra el hash y se descarta.
 */
public record LoginRequest(

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        String email,

        @NotBlank(message = "La contraseña es obligatoria")
        String password) {
}
