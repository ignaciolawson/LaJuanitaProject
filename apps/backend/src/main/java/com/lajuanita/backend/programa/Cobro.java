package com.lajuanita.backend.programa;

/**
 * Cómo se vende un programa (`V28` §1, P63).
 *
 * <p>DJ y Producción se venden como paquete cerrado: el precio es del curso
 * entero. La mentoría no tiene estándar de clases (P65), así que <i>"precio
 * del programa"</i> no significa nada y se cobra por sesión — el total sale
 * de sesiones × precio. Coincide con el CHECK {@code programa_cobro_valido}.
 */
public enum Cobro {

    /** El precio es del curso entero. Exige {@code clasesEstandar} (§2). */
    PAQUETE,

    /** El precio es de cada sesión. */
    SESION
}
