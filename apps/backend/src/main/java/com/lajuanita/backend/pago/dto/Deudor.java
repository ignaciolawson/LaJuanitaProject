package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Módulo 3, pantalla 4 — quién debe, cuánto y hace cuántos días.
 *
 * <p><b>{@code diasDeAtraso} se cuenta desde el pago adeudado más viejo</b>, no
 * desde el más reciente: si alguien debe desde hace dos meses y ayer se le anotó
 * otra cuota, sigue debiendo desde hace dos meses. Contarlo al revés haría que la
 * deuda se rejuvenezca sola cada vez que crece, que es lo contrario de lo que
 * esta pantalla tiene que mostrar.
 *
 * <p>{@code vencido} espeja la regla dura de §6 — <i>alerta si alguien lleva más
 * de 7 días en estado 'debe'</i>. Se calcula acá y no en la pantalla para que el
 * umbral viva en un solo lugar cuando se convierta en la notificación automática.
 *
 * <p><b>Desde la §16 · Fase 6 hay dos fuentes</b> (P72), y {@link #motivo} dice
 * cuál: las filas de {@code pago} anotadas, y las inscripciones con plata
 * pendiente — preinscriptas sin señar (con su plazo) y activas con saldo (sin
 * plazo, nunca vencidas). Para las segundas {@code cantidadDePagos} es 0 y
 * {@code desde} es cuándo se creó la inscripción.
 */
public record Deudor(
        Long idUsuario,
        String nombre,
        String apellido,
        String email,
        String telefono,

        String moneda,
        BigDecimal adeudado,
        long cantidadDePagos,

        /** La fecha del pago adeudado más viejo, o de la inscripción. */
        LocalDate desde,
        int diasDeAtraso,
        boolean vencido,

        // == De qué se trata (P72) ===========================================

        MotivoDeDeuda motivo,
        /** Sólo para las dos fuentes de inscripción. */
        Long idInscripcion,
        String disciplina,
        /** Sólo para {@code SIN_SENIAR}: hasta cuándo puede señar. */
        OffsetDateTime vence) {
}
