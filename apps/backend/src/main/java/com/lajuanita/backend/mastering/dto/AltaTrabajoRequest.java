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
 * Cargar un trabajo de M&M.
 *
 * <p><b>El cliente se identifica por uno de dos caminos</b>, y este record espeja
 * {@code trabajo_cliente_identificado}: o es un {@code usuario} del sistema, o es
 * un nombre suelto con su contacto. La mayoría de los trabajos son del segundo
 * tipo — quien manda un track no se registra por eso.
 *
 * <p><b>El precio puede faltar.</b> Un trabajo entra {@code A_CONFIRMAR} mientras
 * se está presupuestando, y exigirlo obligaría a inventar un número para poder
 * anotar que alguien preguntó. Se completa al confirmar.
 */
public record AltaTrabajoRequest(

        /** El cliente, si tiene cuenta. Si no, los dos de abajo. */
        Long idClienteUsuario,

        @Size(max = 150)
        String nombreClienteExterno,

        @Size(max = 150)
        String contactoClienteExterno,

        Long idProfesorAsignado,

        @NotNull(message = "Elegí qué tipo de trabajo es.")
        TipoTrabajo tipoTrabajo,

        @NotBlank(message = "Poné el nombre del track.")
        @Size(max = 200)
        String nombreTrack,

        @PositiveOrZero(message = "El precio no puede ser negativo.")
        BigDecimal precioAcordado,

        /** Vacío = USD, que es como se cotiza (§14). */
        Moneda moneda,

        BigDecimal cotizacionDolar,

        /** Vacío = 3, el estándar confirmado. */
        @PositiveOrZero(message = "Las revisiones incluidas no pueden ser negativas.")
        Short revisionesIncluidas,

        LocalDate fechaEstimada,

        /** El material que mandó el cliente, como link. */
        @Size(max = 500)
        String urlMaterialCliente,

        String notasInternas) {

    /** Espeja {@code trabajo_cliente_identificado}: sin cliente la fila no dice de quién es. */
    @AssertTrue(message = "Decí de quién es el trabajo: elegí una cuenta o poné el nombre del cliente.")
    public boolean isClienteIdentificado() {
        return idClienteUsuario != null
                || (nombreClienteExterno != null && !nombreClienteExterno.isBlank());
    }

    /**
     * Un link tiene que parecer un link.
     *
     * <p>Misma validación floja que el material de clase del Módulo 5, y por la
     * misma razón: no verifica que exista, ataja pegar el nombre del archivo en vez
     * de su URL — que produce un entregable que no lleva a ningún lado.
     */
    @AssertTrue(message = "El link tiene que empezar con http:// o https://")
    public boolean isMaterialConEsquema() {
        return Links.pareceUnLink(urlMaterialCliente);
    }
}
