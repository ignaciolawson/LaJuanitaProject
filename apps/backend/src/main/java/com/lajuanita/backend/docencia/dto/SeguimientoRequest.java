package com.lajuanita.backend.docencia.dto;

import com.lajuanita.backend.docencia.EstadoSeguimiento;

import jakarta.validation.constraints.NotNull;

/**
 * Mover el semáforo de un alumno.
 *
 * <p>No lleva fecha: la pone la base (`V14` §2). Que el cliente pudiera mandarla
 * convertiría *"desde cuándo requiere atención"* en un dato editable, y ese dato
 * se lee para decidir a quién llamar.
 */
public record SeguimientoRequest(

        @NotNull(message = "Elegí cómo viene el alumno.")
        EstadoSeguimiento estado,

        /** Por qué. Opcional, pero es lo que hace útil un REQUIERE_ATENCION. */
        String observaciones) {
}
