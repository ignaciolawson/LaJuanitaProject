package com.lajuanita.backend.dinero;

/**
 * Moneda de un importe. Coincide con el CHECK {@code inscripcion_moneda_valida}.
 *
 * <p>En {@code USD} la base exige además la cotización del día
 * ({@code inscripcion_usd_con_cotizacion}): un precio en dólares sin el valor al
 * que se tomó no se puede reconstruir después.
 *
 * <p><b>Vivía en {@code inscripcion}, con la nota de mudarse cuando apareciera
 * el segundo usuario. Apareció el 2026-08-16 con el Módulo 3</b>, así que está
 * acá: {@code pago} y {@code egreso} la usan, y {@code venta_equipo} la va a
 * usar. Copiarla habría sido dos CHECK idénticos en la base y dos enums que se
 * separan el día que alguien agregue una tercera moneda.
 *
 * <p>{@code dinero} es el paquete de lo que comparten las tablas de plata. No
 * tiene entidades: son las piezas que ninguna de ellas puede reclamar como
 * propia.
 */
public enum Moneda {
    ARS,
    USD
}
