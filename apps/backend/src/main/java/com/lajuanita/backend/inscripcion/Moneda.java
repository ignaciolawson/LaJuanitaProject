package com.lajuanita.backend.inscripcion;

/**
 * Moneda de un importe. Coincide con el CHECK {@code inscripcion_moneda_valida}.
 *
 * <p>En {@code USD} la base exige además la cotización del día
 * ({@code inscripcion_usd_con_cotizacion}): un precio en dólares sin el valor al
 * que se tomó no se puede reconstruir después.
 *
 * <p><b>Vive acá porque {@code inscripcion} es hoy el único que la usa.</b> Las
 * mismas dos monedas están en {@code pago}, {@code egreso} y
 * {@code venta_equipo}, que llegan con el Módulo 3 — cuando exista el segundo
 * usuario, este enum se muda a un lugar compartido en vez de copiarse.
 */
public enum Moneda {
    ARS,
    USD
}
