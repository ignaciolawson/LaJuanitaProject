package com.lajuanita.backend.mastering;

/**
 * El estado de un trabajo. Espeja {@code trabajo_estado_valido} de `V1`.
 *
 * <p><b>Los estados solo avanzan</b>, y eso no lo sostiene este enum sino el
 * trigger {@code trabajo_estado_solo_avanza} (`V1` §8.5): un trabajo ya cobrado
 * no puede volver a "en proceso" y descuadrar los ingresos.
 *
 * <p><b>{@link #ENTREGADO} y {@link #DEBE} están en el mismo escalón</b> —el
 * tercero— y por eso se puede pasar de uno al otro en cualquier dirección. Son la
 * misma etapa del trabajo vista desde la plata: entregado y cobrado después, o
 * entregado y todavía debiendo. Es el único servicio del estudio que puede quedar
 * en debe (§3).
 *
 * <p><b>{@link #CANCELADO} está fuera de la escalera</b>: se cancela desde donde
 * sea. Y no se borra — `V6` §7 prohíbe el DELETE, así que cancelar es la única
 * forma de dar de baja un trabajo.
 */
public enum EstadoTrabajo {
    A_CONFIRMAR,
    EN_PROCESO,
    ENTREGADO,
    PAGADO,
    DEBE,
    CANCELADO
}
