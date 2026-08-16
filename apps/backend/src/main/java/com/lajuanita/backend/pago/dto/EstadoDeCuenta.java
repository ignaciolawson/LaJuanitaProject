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
        List<PagoResumen> pagos) {

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
            boolean saldado) {
    }
}
