package com.lajuanita.backend.solicitante.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import com.lajuanita.backend.solicitante.InteresDelSolicitante;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
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
        String mensaje,

        // == Cuándo le vendría bien (P58, `V27`) =============================
        //
        // ⚠️ Los tres son OPCIONALES por separado, y esa es la mitad no obvia de
        // la decisión. Estos formularios existen para captar a alguien con el
        // mínimo esfuerzo posible —publicar la landing sin ellos era perder
        // clientes reales, que es lo que `V20` dice de sí misma—, así que exigir
        // día y hora pierde a quien sólo quería preguntar cuánto sale. El que
        // sabe lo que quiere los llena y el buzón precarga el alta; el que no,
        // los deja vacíos y la ficha se lee como antes. Degrada sola.
        //
        // ⚠️ Y son una PREFERENCIA, nunca una reserva. La landing no puede ver
        // disponibilidad —decidido al dar de baja el retoque §6f.5, con el
        // argumento de que quien pide no puede saber si está ocupado—, así que
        // nada de lo que llegue acá toma una franja. Es lo mismo que ya vale para
        // el resto del record: nada de lo que llega decide nada.
        //
        // Reabre a propósito una decisión escrita de `V20` —"ninguno de esos datos
        // se usa para crear nada"—: con "apartarle la cabina" (Fase 3) pasan a
        // usarse, así que la premisa cambió. Pero acotado: TRES columnas, no doce.
        // Todo lo demás sigue en `detalle`.

        /**
         * Qué día le vendría bien.
         *
         * <p><b>Sin {@code @Future}, a propósito.</b> Una fecha pasada acá es
         * alguien que se equivocó de año en un selector, y rechazarle el
         * formulario con un 400 es perder ese cliente por un tipeo — que es
         * exactamente lo que estos formularios existen para no hacer. No decide
         * nada: quien atiende la ve, y el buzón la precarga para que la corrija
         * mirando la agenda.
         */
        LocalDate fechaPreferida,

        LocalTime horaPreferida,

        /**
         * Cuánto la necesita, en minutos.
         *
         * <p><b>Duración y no hora de fin</b> (Ignacio, P58): <i>"2 horas"</i> es lo
         * que la persona piensa; la hora de fin la calcula el sistema. El techo no
         * es una regla del negocio sino de este endpoint —es público— y espeja al
         * CHECK {@code solicitante_duracion_positiva} por el lado de abajo.
         */
        @Positive(message = "La duración tiene que ser mayor a cero.")
        @Max(value = 1440, message = "La duración no puede pasar de un día.")
        Integer duracionMinutos) {
}
