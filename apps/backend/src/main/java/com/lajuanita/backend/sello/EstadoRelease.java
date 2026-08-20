package com.lajuanita.backend.sello;

/**
 * El estado de un release. Espeja {@code release_estado_valido}.
 *
 * <p><b>Los estados solo avanzan</b>, y eso no lo sostiene este enum sino el
 * trigger {@code release_estado_solo_avanza} (`V1` §8.5, cuerpo reemplazado por
 * `V18`).
 *
 * <p><b>{@link #CANCELADO} está fuera de la escalera y es una sola dirección.</b>
 * Se cancela desde cualquier estado —un lanzamiento se puede caer, ratificado el
 * 2026-08-20— y no se vuelve: un release retomado es un release nuevo. La segunda
 * mitad de esa frase no existía hasta `V18` §1b, y su ausencia era el retroceso en
 * dos pasos que `V6` había cerrado en las demás tablas.
 *
 * <p>Y no se borra: `V18` §4 prohíbe el DELETE, así que cancelar es la única forma
 * de dar de baja un release. Acá hay una razón de más que en las otras tablas — el
 * código es correlativo, y borrar el LJ021 deja un hueco permanente en un catálogo
 * que se lee como una lista continua.
 */
public enum EstadoRelease {
    A_CONFIRMAR,
    CONFIRMADO,
    EN_DISTRIBUCION,
    PUBLICADO,
    CANCELADO;

    /** ¿Este release ya salió? Lo que la regla dura del módulo protege. */
    public boolean estaPublicado() {
        return this == PUBLICADO;
    }
}
