package com.lajuanita.backend.programa.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.programa.Cobro;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Editar una fila del catálogo (`V28`, P63: <i>"intentemos que sea todo
 * modificable"</i>).
 *
 * <p><b>La disciplina no se edita</b>: es la identidad de la fila y la unión
 * con {@code inscripcion}. Cambiarla convertiría el precio de DJ en el de
 * Producción con las inscripciones de DJ mirando para otro lado.
 *
 * <p>{@code precio} puede venir {@code null} y eso es un dato —"todavía no hay
 * precio"—, no una omisión: por eso el DTO se manda entero cada vez (es un PUT,
 * no un PATCH) y {@code null} escribe {@code null}. Cero es un precio (§13 ·
 * P34: una beca).
 *
 * <p>{@code activo} es {@code Boolean} y no {@code boolean} por lo de siempre:
 * Jackson no completa el constructor de un record cuando la propiedad falta.
 * Acá además es obligatorio, porque el PUT manda la fila entera.
 */
public record EdicionProgramaRequest(

        @NotBlank(message = "Poné el nombre del programa.")
        @Size(max = 100)
        String nombre,

        String descripcion,

        @PositiveOrZero(message = "El precio no puede ser negativo.")
        BigDecimal precio,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        @NotNull(message = "Decí cómo se cobra: por paquete o por sesión.")
        Cobro cobro,

        @Positive(message = "La cantidad de clases tiene que ser mayor a cero.")
        Short clasesEstandar,

        @NotNull(message = "Poné cuánto dura cada clase.")
        @Positive(message = "La duración tiene que ser mayor a cero.")
        Short duracionMinutos,

        @NotNull(message = "Decí si el programa está activo.")
        Boolean activo) {
}
