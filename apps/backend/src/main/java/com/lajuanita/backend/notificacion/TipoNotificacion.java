package com.lajuanita.backend.notificacion;

/**
 * Por qué le llegó un aviso a alguien.
 *
 * <p><b>La base no restringe esta columna</b> — {@code notificacion.tipo} es un
 * {@code VARCHAR(50)} sin CHECK, y está bien que lo sea: cada módulo que llegue
 * trae avisos nuevos, y un CHECK acá significaría una migración por cada tipo de
 * notificación que se invente. Lo que evita el enum es lo otro, que es lo que sí
 * duele: que un tipo se escriba mal en un lado y la pantalla que filtra por él
 * deje de encontrarlo, sin error a la vista.
 *
 * <p>Hoy son dos, y las dos las escribe el Módulo 4 al resolver una solicitud del
 * portal. <b>Es la primera vez que alguien escribe en esta tabla</b>: existe
 * desde `V1` y ninguna pantalla la había tocado.
 *
 * <p>Lo que deliberadamente <b>no</b> está: el aviso automático de la deuda a los
 * 7 días. No es un tipo que falte, es otra máquina — corre sin que nadie pida
 * nada, necesita un scheduler y necesita decidir qué pasa cuando corre dos veces
 * el mismo día. Va con el módulo que construya notificaciones automáticas.
 */
public enum TipoNotificacion {

    /** Tu pedido de sala fue aprobado: ya tenés la reserva. */
    SOLICITUD_APROBADA,

    /** Tu pedido de sala fue rechazado, y la notificación dice por qué. */
    SOLICITUD_RECHAZADA
}
