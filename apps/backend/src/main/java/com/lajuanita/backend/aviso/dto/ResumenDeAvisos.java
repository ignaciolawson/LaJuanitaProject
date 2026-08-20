package com.lajuanita.backend.aviso.dto;

import java.time.LocalDate;

/**
 * Qué hizo una corrida del disparador automático.
 *
 * <p>Lo devuelve la corrida manual y lo escribe el log de la automática. Existe
 * porque un proceso que corre solo y no cuenta nada es indistinguible de uno que
 * no corrió: el día que la bandeja esté vacía hay que poder saber si es que no
 * hay nada que avisar o si el cron dejó de dispararse.
 *
 * <p><b>{@code avisosEscritos} y {@code avisosOmitidos} se cuentan por separado
 * a propósito.</b> Una corrida normal del segundo día tiene cero escritos y
 * varios omitidos, y eso es exactamente lo que se quiere ver: la máquina corrió,
 * miró los mismos hechos y no repitió la bandeja.
 *
 * @param pagosVencidos    cuántas filas pasaron de {@code DEBE} a {@code VENCIDO}
 * @param deudoresAvisados sobre cuántas deudas se avisó (no cuántos avisos: un
 *                         mismo hecho le llega a cada persona de administración)
 * @param entregasAvisadas sobre cuántos trabajos de M&amp;M entregados e impagos
 * @param lanzamientosAvisados sobre cuántos releases que salen dentro de la semana
 * @param avisosEscritos   filas nuevas en {@code notificacion}
 * @param avisosOmitidos   avisos que ya estaban de una corrida anterior
 */
public record ResumenDeAvisos(
        LocalDate fecha,
        int pagosVencidos,
        int deudoresAvisados,
        int entregasAvisadas,
        int lanzamientosAvisados,
        int avisosEscritos,
        int avisosOmitidos) {
}
