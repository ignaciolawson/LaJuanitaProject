package com.lajuanita.backend.bandeja.dto;

/**
 * Lo que está esperando que alguien de administración lo mire.
 *
 * <p>Son las tres bandejas del sistema —del otro lado hay una persona
 * esperando una respuesta— más los deudores, que es lo contrario: gente a la
 * que administración le tiene que ir a cobrar (pedido de Ignacio, 2026-09-12:
 * <i>"ponele también como notificación un (1) o (2) para que Mica vea"</i>). El
 * sidebar los dibuja como un número al lado de su ítem del menú.
 *
 * <p><b>Son números y no listas.</b> El menú solo necesita saber cuántos hay; la
 * lista ya la dibuja cada pantalla, y traerla de nuevo para contarla sería traer
 * tres listados enteros en cada navegación para mostrar tres dígitos.
 *
 * <p><b>Las notificaciones NO están acá</b>, y no es un olvido: son de cada
 * persona, no de administración, y ya tienen su endpoint en
 * {@code GET /api/me/notificaciones/sin-leer}. Meterlas en este record obligaría
 * a que un {@code USUARIO} —que no puede ver ninguna de estas tres— llame a un
 * endpoint de administración para saber cuántos avisos tiene.
 */
public record Pendientes(
        /** Pedidos de sala del portal sin resolver. */
        long pedidosDeSala,
        /** Pedidos de cambio de horario sin resolver. */
        long pedidosDeCambio,
        /** Fichas del buzón de la web que nadie atendió todavía. */
        long buzon,
        /**
         * Cuántas personas figuran en Deudores. <b>Es la misma lista que la
         * pantalla</b> ({@code PagoService.deudores()}), contada — no una segunda
         * consulta de "quién debe" — así que el día que Deudores sume las
         * preinscripciones sin señar (P72), este número las trae solo.
         */
        long deudores) {
}
