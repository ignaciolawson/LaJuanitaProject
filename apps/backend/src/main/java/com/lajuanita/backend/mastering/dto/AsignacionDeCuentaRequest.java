package com.lajuanita.backend.mastering.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Asignarle una cuenta a un trabajo que se cargó a nombre escrito (P82).
 *
 * <p>El caso: se le hace el trabajo a alguien sin cuenta y la cuenta se le crea
 * <i>después</i>. El trabajo —y sus cobros, que entraron a su nombre escrito—
 * pasan a esa cuenta, y aparecen en su portal. Es una elección de una persona,
 * nunca un cruce por nombre (`V27`).
 */
public record AsignacionDeCuentaRequest(
        @NotNull(message = "Elegí la cuenta.")
        Long idUsuario) {
}
