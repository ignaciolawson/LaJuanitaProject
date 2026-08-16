package com.lajuanita.backend.pago.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * El único dato que el cliente aporta en las dos excepciones de un pago —
 * anularlo, o marcar su comprobante como inválido.
 *
 * <p><b>El autor y la fecha no están acá, y es el punto.</b> `V7` exige los tres
 * juntos; el autor sale del token y la fecha del reloj del servidor. Si el
 * cliente pudiera mandarlos, cualquiera firmaría una anulación con el nombre de
 * otro — y en un negocio que cobra buena parte en efectivo, esa firma es lo que
 * separa un error de carga de un faltante de caja.
 */
public record MotivoRequest(
        @NotBlank(message = "Escribí el motivo.")
        String motivo) {
}
