package com.lajuanita.backend.solicitante.dto;

import com.lajuanita.backend.solicitante.InteresDelSolicitante;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * Lo que manda un formulario de la landing.
 *
 * <p><b>Es el único DTO del sistema que llega de alguien sin cuenta</b>, y eso
 * cambia dos cosas respecto de cualquier otro alta:
 *
 * <ul>
 *   <li><b>Todos los {@code @Size} tienen techo</b>, incluidos los dos campos que
 *       en la base son {@code TEXT}. En un endpoint autenticado el límite lo pone
 *       de hecho la pantalla; acá del otro lado puede haber un script mandando un
 *       megabyte de texto por fila, y la tabla no se puede vaciar (`V20` §3).
 *   <li><b>El teléfono es obligatorio</b>, a diferencia del registro público. La
 *       contraseña temporal se pasa por WhatsApp —no hay correo y está decidido
 *       que no lo va a haber—, así que sin teléfono la ficha no se puede
 *       convertir, y descubrirlo al querer atenderla es tarde.
 * </ul>
 *
 * <p><b>Lo que NO viaja acá:</b> el estado. Una ficha nace PENDIENTE y punto — si
 * el cuerpo pudiera traerlo, cualquiera mandaría una ya convertida. Es la misma
 * razón por la que {@code RegistroRequest} no acepta el rol.
 */
public record AltaSolicitanteRequest(

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

        @NotBlank(message = "El teléfono es obligatorio: te escribimos por ahí")
        @Size(max = 40)
        String telefono,

        @NotNull(message = "Falta decir qué se está pidiendo")
        InteresDelSolicitante interes,

        /**
         * El resto del formulario, ya armado en texto por quien lo manda
         * ("Programa DJ · presencial · sin experiencia previa"). Opcional: un
         * formulario que solo pide contacto es una ficha válida.
         */
        @Size(max = 2000)
        String detalle,

        /** Lo que la persona escribió con sus palabras. */
        @Size(max = 2000)
        String mensaje) {
}
