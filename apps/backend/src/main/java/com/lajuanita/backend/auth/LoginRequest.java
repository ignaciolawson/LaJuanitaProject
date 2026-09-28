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
        String password,

        /**
         * "Recordarme": la sesión dura {@code lajuanita.jwt.duracion-recordada}
         * en vez de {@code duracion}. En caja, como todo booleano opcional de un
         * pedido: sin tildar el formulario puede no mandarlo.
         */
        Boolean recordarme) {

    public boolean recordar() {
        return Boolean.TRUE.equals(recordarme);
    }
}
