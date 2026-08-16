package com.lajuanita.backend.reserva.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Módulo 2, pantalla 4 — cuánto se usó cada sala en un período.
 *
 * <p><b>Una sala sin uso aparece igual, en cero.</b> Es la misma decisión que
 * toma el perfil del alumno con los bloques que todavía no existen: una fila
 * ausente se lee como que el sistema perdió el dato, y una en cero dice lo que
 * de verdad pasó — que esa sala no se usó. Y es justo el número que interesa
 * cuando la pregunta es si conviene alquilarla.
 *
 * <p>Las canceladas y las reprogramadas se cuentan <b>aparte y no suman horas</b>.
 * No es un detalle contable: una sala con veinte clases dictadas y una con veinte
 * canceladas no se usaron igual, y meterlas en el mismo total borraría exactamente
 * el dato por el que se mira este informe. Es la misma definición canónica del
 * esquema, contada del otro lado.
 */
public record UsoDeSala(
        Long idSala,
        String sala,
        boolean activa,
        /** Las que ocuparon la sala de verdad. */
        long reservas,
        BigDecimal horas,
        long canceladas,
        long reprogramadas,
        List<UsoPorTipo> porTipo) {

    /** El desglose de esa sala: cuánto fue clase, cuánto alquiler, cuánto grabación. */
    public record UsoPorTipo(
            Long idTipoUso,
            String tipoUso,
            String color,
            long reservas,
            BigDecimal horas) {
    }
}
