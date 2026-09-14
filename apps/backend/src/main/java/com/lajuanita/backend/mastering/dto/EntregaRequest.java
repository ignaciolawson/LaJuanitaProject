package com.lajuanita.backend.mastering.dto;

import java.time.LocalDate;

/**
 * Registrar la entrega del master (P79 · 2).
 *
 * <p>La fecha es opcional y vacía significa hoy. Puede ser anterior —la carga y
 * el hecho son dos fechas, como {@code fechaPago}— y no puede ser futura; eso lo
 * decide {@code MasteringService.entregar}, que es también quien exige el link
 * del master y el precio.
 */
public record EntregaRequest(LocalDate fecha) {
}
