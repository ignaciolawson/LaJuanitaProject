package com.lajuanita.backend.venta.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.MedioPago;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

/**
 * Registrar una venta de equipamiento (§6, pantalla 6).
 *
 * <p>Las tres reglas que este record repite de la base <b>no son redundancia</b>:
 * un CHECK rechaza con un 409 que no nombra ningún campo, y el formulario pinta de
 * rojo el input que está mal. La base sigue siendo la que manda.
 */
public record AltaVentaRequest(

        // -- El comprador: con cuenta o sin ella, pero identificado -----------

        /** Cuando el comprador tiene cuenta. Casi siempre un alumno del curso. */
        Long idUsuarioComprador,

        @Size(max = 150, message = "El nombre no puede pasar de 150 caracteres.")
        String nombreCompradorExterno,

        @Size(max = 150, message = "El contacto no puede pasar de 150 caracteres.")
        String contactoCompradorExterno,

        // -- Quién vendió -----------------------------------------------------

        /**
         * <b>No sale del token, y es a propósito.</b> Quien carga la venta no es
         * necesariamente quien la hizo: el proceso es ad hoc y Micaela carga lo que
         * vendió Ghezz. Es un dato del negocio, no una firma de auditoría — la
         * firma de quién cargó es {@code fecha_registro} más el historial.
         */
        @NotNull(message = "Decí quién hizo la venta.")
        Long idUsuarioVendedor,

        // -- Qué se vendió ----------------------------------------------------

        @Size(max = 50, message = "La categoría no puede pasar de 50 caracteres.")
        String categoria,

        @Size(max = 100, message = "La marca no puede pasar de 100 caracteres.")
        String marca,

        @NotBlank(message = "Poné el modelo del equipo.")
        @Size(max = 150, message = "El modelo no puede pasar de 150 caracteres.")
        String modeloEquipo,

        // -- Por cuánto -------------------------------------------------------

        @NotNull(message = "Poné el precio.")
        @Positive(message = "El precio tiene que ser mayor a cero.")
        BigDecimal precio,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        /** Vacío = hoy. Puede ser anterior: la venta y su carga son dos fechas. */
        LocalDate fechaVenta,

        String notas,

        // -- Y la plata, si ya entró ------------------------------------------

        /**
         * Cómo se cobró, cuando se cobró en el acto.
         *
         * <p><b>Opcional</b>, y esa es una decisión y no un descuido: el esquema
         * tiene {@code pago.id_venta_equipo} justamente porque la venta y su cobro
         * son dos hechos, y nada dice que una venta se pague entera al firmarse.
         * Presente, se registra un {@code pago} por el precio total en la misma
         * transacción — que es el caso normal de un proceso ad hoc: se vendió y se
         * cobró.
         *
         * <p><b>Y desde `V19` el comprador puede no tener cuenta.</b> Hasta entonces
         * había acá un {@code @AssertTrue} —<i>"para registrar el cobro, el
         * comprador tiene que tener cuenta"</i>— porque {@code pago.id_usuario} era
         * NOT NULL: una venta a alguien que compra por el acuerdo con Pioneer y no
         * se registra en un estudio de música <b>no se podía cobrar nunca</b>. Era
         * el hallazgo #1 de `docs/mejoras.md`. El cobro ahora viaja con el nombre
         * del comprador externo, el mismo que la venta ya guardaba.
         *
         * <p>Lo que sigue en pie: hoy este es el único camino para cobrar una venta.
         * Una cargada sin cobro se corrige anulándola y volviéndola a cargar.
         */
        MedioPago medioPago) {

    /**
     * Espeja {@code venta_comprador_identificado}. <b>Una venta sin comprador
     * identificable es una fila que después no se puede reclamar</b>: el equipo
     * salió y no hay a quién asociarlo.
     */
    @AssertTrue(message = "Decí quién compró: elegí una cuenta o escribí el nombre.")
    public boolean isCompradorIdentificado() {
        return idUsuarioComprador != null
                || (nombreCompradorExterno != null && !nombreCompradorExterno.isBlank());
    }

    /** Espeja {@code venta_usd_con_cotizacion}: sin ella el importe no se reconstruye. */
    @AssertTrue(message = "Una venta en dólares necesita la cotización del día.")
    public boolean isCotizacionPresenteSiEsUsd() {
        return moneda != Moneda.USD || cotizacionDolar != null;
    }

}
