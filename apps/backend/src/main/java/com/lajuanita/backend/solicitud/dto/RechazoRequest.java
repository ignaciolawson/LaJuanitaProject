package com.lajuanita.backend.solicitud.dto;

import jakarta.validation.constraints.NotBlank;

/**
 * El único dato que aporta quien rechaza una solicitud: por qué.
 *
 * <p>Lo exige la base (`V13`, {@code solicitud_reserva_rechazo_explicado}) y no
 * es formalismo: del otro lado hay una persona que pidió una sala y que, sin
 * esto, recibe un "no" sin nada que hacer con él. Con el motivo puede pedir otro
 * horario, que es lo que el estudio quiere que pase.
 *
 * <p>El autor y la fecha no viajan acá, igual que en {@code MotivoRequest}: salen
 * del token y del reloj del servidor.
 */
public record RechazoRequest(
        @NotBlank(message = "Escribí por qué no se puede, para que la persona sepa qué hacer.")
        String respuesta) {
}
