package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

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

        /** La fecha del pago adeudado más viejo. */
        LocalDate desde,
        int diasDeAtraso,
        boolean vencido) {
}
