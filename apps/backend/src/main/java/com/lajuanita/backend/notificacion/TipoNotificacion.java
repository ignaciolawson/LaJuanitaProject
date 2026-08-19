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
 * <p>Las dos primeras las escribe el Módulo 4 al resolver una solicitud del portal
 * —fue la primera vez que alguien escribió en esta tabla, que existe desde `V1`— y
 * la tercera la escribe el Módulo 5 al mover una reserva.
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
    SOLICITUD_RECHAZADA,

    /**
     * Te movieron una clase de sala o de horario (M5).
     *
     * <p>Es la regla dura *"las notificaciones de cambio de sala llegan solas"* de
     * §8, y la escribe {@code ReservaService.editar} — el segundo escritor que
     * tiene esta tabla. Le llega al profesor <b>y</b> a los alumnos: el que se
     * presenta en la sala equivocada es cualquiera de los dos.
     */
    RESERVA_MOVIDA
}
