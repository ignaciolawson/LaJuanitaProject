package com.lajuanita.backend.solicitante;

/**
 * Qué pidió quien completó el formulario.
 *
 * <p><b>Es lo único que la ficha necesita decir</b>, porque decide a qué pantalla
 * va quien la atiende: un curso termina en {@code /admin/inscripciones}, una
 * cabina o una grabación en {@code /admin/reservas}, una consulta de equipos en
 * {@code /admin/ventas}. El resto del formulario viaja como texto en
 * {@code detalle} — ver la cabecera de `V20`.
 *
 * <p>Los valores son los del CHECK de `V20`, y <b>dos de ellos coinciden con
 * {@code tipo_uso.codigo} a propósito</b>, para que la ficha se lea igual que el
 * calendario. No hay FK: {@link #CURSO} y {@link #EQUIPOS} no son usos de una
 * sala.
 *
 * <p><b>Mix &amp; Mastering no está y no es un olvido</b>: llega por WhatsApp a
 * Ghezz y se carga a mano después, que es la decisión vigente del Módulo 6
 * (§14, P23).
 */
public enum InteresDelSolicitante {

    /** Anotarse a un programa — DJ o Producción. */
    CURSO,

    /** Alquilar la cabina. */
    ALQUILER_CABINA,

    /** Grabar un set. */
    GRABACION_SET,

    /**
     * Consulta por venta de equipos.
     *
     * <p>No estaba en los tres flujos que §9.4 enumeraba, y entra por lo mismo
     * que los otros: el formulario existe en la landing y hoy tampoco le llega a
     * nadie. El circuito es idéntico hasta el final, que es la pantalla de ventas.
     */
    EQUIPOS,

    /**
     * Cualquier otra cosa.
     *
     * <p>Existe para que un formulario nuevo de la landing no quede sin poder
     * mandar nada mientras se decide si merece su propio valor. Lo que <b>no</b>
     * es: el default. El servidor exige el campo, porque una ficha que no dice qué
     * pidió obliga a leer el mensaje entero para saber a qué pantalla ir.
     */
    OTRO
}
