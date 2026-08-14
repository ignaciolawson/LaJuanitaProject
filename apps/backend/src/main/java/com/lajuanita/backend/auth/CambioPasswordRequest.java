package com.lajuanita.backend.auth;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Cambio de la propia contraseña.
 *
 * <p>Exige la contraseña actual aunque la persona ya esté autenticada: si
 * alguien deja la sesión abierta en la computadora del estudio, no debería
 * alcanzar con eso para quedarse con la cuenta.
 */
public record CambioPasswordRequest(

        @NotBlank(message = "Tenés que ingresar tu contraseña actual")
        String passwordActual,

        @NotBlank(message = "La contraseña nueva es obligatoria")
        @Size(min = 8, max = 100, message = "La contraseña tiene que tener al menos 8 caracteres")
        String passwordNueva) {
}
