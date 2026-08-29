package com.lajuanita.backend.solicitud.dto;

import java.time.LocalDate;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/**
 * "No puedo ese día": el pedido de mover una clase.
 *
 * <p><b>Quién pide no viaja acá</b>, igual que en {@link AltaSolicitudRequest}:
 * sale del token. Un {@code idUsuario} en el cuerpo dejaría pedir en nombre de
 * otro, y acá eso es mover la clase de un tercero.
 *
 * <p><b>{@code fechaAlternativa} es opcional y es una preferencia, no una
 * reserva.</b> Sin hora ni sala no alcanza para crear nada, y por eso el horario
 * nuevo lo pone administración al aprobar. Es la diferencia con el pedido de sala,
 * que se aprueba tal como se pidió: allá la persona elige una franja libre que el
 * portal le muestra; acá no puede saber qué sala queda libre ni de qué profesor
 * depende su clase.
 */
public record AltaReprogramacionRequest(

        @NotNull(message = "Falta decir qué clase querés mover.")
        Long idReserva,

        @NotBlank(message = "Contanos por qué no podés, así podemos buscarte otro horario.")
        @Size(max = 1000)
        String motivo,

        /** El día que te vendría bien. Opcional. */
        LocalDate fechaAlternativa) {
}
