package com.lajuanita.backend.usuario.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Lo que manda el formulario público de crear cuenta.
 *
 * <p>Fijate lo que NO tiene: {@code rol}. Es un endpoint abierto a internet, así
 * que el rol no se acepta del cliente ni aunque venga -- siempre se fuerza a
 * {@code USUARIO} del lado del servidor. Aceptarlo sería regalar una forma de
 * darse ADMIN a uno mismo.
 *
 * <p>Tampoco tiene nada de alumno (disciplina, nivel): crear una cuenta y ser
 * alumno son dos cosas distintas. Quien alquila una cabina y nunca cursa
 * también necesita cuenta para ver sus reservas.
 */
public record RegistroRequest(

        @NotBlank(message = "El nombre es obligatorio")
        @Size(max = 80, message = "El nombre no puede superar los 80 caracteres")
        String nombre,

        @NotBlank(message = "El apellido es obligatorio")
        @Size(max = 80, message = "El apellido no puede superar los 80 caracteres")
        String apellido,

        @NotBlank(message = "El email es obligatorio")
        @Email(message = "El email no tiene un formato válido")
        @Size(max = 150, message = "El email no puede superar los 150 caracteres")
        String email,

        @NotBlank(message = "El teléfono es obligatorio")
        @Size(max = 40, message = "El teléfono no puede superar los 40 caracteres")
        String telefono,

        /*
         * Mínimo 8 y nada más. Nada de "una mayúscula, un número y un símbolo":
         * esas reglas empujan a la gente a "Password1!" y a anotar la contraseña
         * en un papel. El largo es lo que realmente cuesta romper.
         */
        @NotBlank(message = "La contraseña es obligatoria")
        @Size(min = 8, max = 100, message = "La contraseña tiene que tener al menos 8 caracteres")
        String password) {
}
