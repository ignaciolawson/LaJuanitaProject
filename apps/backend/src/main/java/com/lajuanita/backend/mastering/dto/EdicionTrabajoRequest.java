package com.lajuanita.backend.mastering.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.mastering.TipoTrabajo;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.PositiveOrZero;
import jakarta.validation.constraints.Size;

/**
 * Editar un trabajo: el presupuesto, las fechas y los entregables.
 *
 * <p><b>Esta es la diferencia con `venta_equipo` y con `pago`, donde corregir es
 * anular y volver a cargar.</b> Un trabajo de M&M no es una operación puntual sino
 * un expediente que dura semanas: se confirma el precio, se sube el master, el
 * cliente pide un cambio, se sube otro. Anular y recargar en cada paso perdería el
 * historial, que es justo lo que se quiere tener.
 *
 * <p><b>Lo que este record NO puede tocar, y es a propósito:</b> el estado —tiene
 * su propio endpoint porque solo avanza (`V1` §8.5)—, las revisiones realizadas
 * —se suman de a una, con su propio endpoint, y llevar el número a mano borraría la
 * diferencia entre "hicimos tres" y "alguien escribió tres"— y la liberación del
 * premaster, que es la regla del módulo y necesita motivo y autor.
 */
public record EdicionTrabajoRequest(

        Long idProfesorAsignado,

        @NotNull(message = "Elegí qué tipo de trabajo es.")
        TipoTrabajo tipoTrabajo,

        @NotBlank(message = "Poné el nombre del track.")
        @Size(max = 200)
        String nombreTrack,

        @PositiveOrZero(message = "El precio no puede ser negativo.")
        BigDecimal precioAcordado,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        @NotNull(message = "Decí cuántas revisiones incluye.")
        @PositiveOrZero(message = "Las revisiones incluidas no pueden ser negativas.")
        Short revisionesIncluidas,

        LocalDate fechaEstimada,

        LocalDate fechaEntregaReal,

        @Size(max = 500)
        String urlMaterialCliente,

        @Size(max = 500)
        String urlMaster,

        /** Se puede cargar antes de liberarlo: cargarlo no es entregarlo. */
        @Size(max = 500)
        String urlPremaster,

        String notasInternas) {

    @AssertTrue(message = "Los links tienen que empezar con http:// o https://")
    public boolean isLinksConEsquema() {
        return Links.pareceUnLink(urlMaterialCliente)
                && Links.pareceUnLink(urlMaster)
                && Links.pareceUnLink(urlPremaster);
    }
}
