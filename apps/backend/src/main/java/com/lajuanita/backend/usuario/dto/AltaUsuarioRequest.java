package com.lajuanita.backend.usuario.dto;

import com.lajuanita.backend.usuario.Rol;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

/**
 * Alta hecha por administración (Micaela dando de alta a alguien que se anotó
 * por WhatsApp, o migrando el Notion en diciembre).
 *
 * <p>A diferencia de {@link RegistroRequest} no trae contraseña: la genera el
 * sistema y se devuelve una sola vez para que Micaela se la pase. La persona
 * está obligada a cambiarla en el primer ingreso.
 *
 * <p>Sí acepta {@code rol}, porque acá lo elige alguien que ya tiene permiso
 * para hacerlo -- pero solo ADMIN puede otorgar roles administrativos, y eso se
 * verifica en el servicio, no acá.
 */
public record AltaUsuarioRequest(

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

        /* Opcional acá: Micaela puede no tenerlo al momento de cargar la ficha. */
        @Size(max = 40)
        String telefono,

        /** Si viene null, se asume {@code USUARIO}. */
        Rol rol) {
}
