package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.util.List;

/**
 * Módulo 3, pantalla 2 — qué contrató una persona, qué pagó y qué debe.
 *
 * <p><b>El saldo va por moneda, no unificado</b>, y esa es la decisión que hace
 * útil esta pantalla. §2.3 lo pide explícito: ARS y USD se llevan por separado.
 * Sumarlos exigiría elegir una cotización —¿la del día de cada pago, la de hoy?—
 * y el resultado sería un número que no corresponde a ninguna caja real.
 *
 * <p>Lo mismo con {@code cotizacionDolar}: se guarda por pago, no por persona,
 * justamente porque cada cobro se tomó a un valor distinto.
 *
 * <p><b>Y "el estado de pago de Juan" sigue sin ser un valor único</b> (§3.3):
 * esto es una lista de contratos con su saldo, no un semáforo. Un alumno puede
 * tener el curso de DJ al día y el de producción con deuda.
 */
public record EstadoDeCuenta(
        Long idUsuario,
        String nombre,
        String apellido,
        String email,

        /** Un renglón por moneda con movimientos. Vacío = nunca pagó nada. */
        List<SaldoPorMoneda> saldos,

        /** Lo que contrató, con cuánto lleva pagado de cada cosa. */
        List<ContratoDelAlumno> contratos,

        /** Todos sus pagos, del más nuevo al más viejo. */
        List<PagoResumen> pagos,
        /**
         * Lo que esta persona debe HOY, con la definición de Deudores (§17 · H3):
         * las deudas anotadas cobrables más lo que falta de sus programas —la
         * seña con plazo, el resto sin plazo (P72)—. {@code saldos} es historia
         * por moneda y sigue mostrando lo que ya no se cobra (P46); esto es lo
         * que hay que ir a pagar.
         */
        List<Deudor> pendientes) {

    public record SaldoPorMoneda(
            String moneda,
            /** Lo efectivamente entrado: `SENADO` + `PAGADO`. */
            BigDecimal pagado,
            /** Lo anotado como deuda: `DEBE` + `VENCIDO`. */
            BigDecimal adeudado) {
    }

    /**
     * Una inscripción vista desde la plata.
     *
     * <p>{@code saldo} solo tiene sentido cuando el pago está en la misma moneda
     * que el contrato, así que la resta se hace **por moneda** y lo que quede en
     * otra moneda no se mezcla: aparece en {@code saldos} y no acá.
     */
    public record ContratoDelAlumno(
            Long idInscripcion,
            String disciplina,
            String nivel,
            String estado,
            String moneda,
            BigDecimal precioTotal,
            BigDecimal pagado,
            BigDecimal saldo,
            /** Si ya cubrió el 50% que §13 exige antes de reservar. */
            boolean senado,
            boolean saldado,
            /**
             * Lo cobrado sobre este contrato en la OTRA moneda, si hay (§17 · H4).
             * Desde `V31` no puede nacer un pago así; las filas anteriores a la
             * regla siguen existiendo, y sin decirlo el estado de cuenta muestra
             * un contrato "sin señar" al lado de tres pagos que sí entraron.
             * {@code null} cuando no hay nada.
             */
            BigDecimal cobradoEnOtraMoneda) {
    }
}
