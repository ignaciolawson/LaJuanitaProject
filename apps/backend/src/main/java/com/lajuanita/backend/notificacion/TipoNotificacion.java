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
 * <p><b>Las dos últimas las escribe una máquina y no una persona</b>, y esa es la
 * única división que importa acá. Un aviso que alguien dispara al resolver algo
 * ocurre una vez porque la acción ocurrió una vez; uno automático lo escribe un
 * cron que puede correr dos veces el mismo día sobre el mismo hecho, así que
 * lleva {@code clave_evento} y la base se encarga de que no se duplique (`V17`).
 *
 * <p>Este comentario decía hasta el 2026-08-20 que el aviso de deuda <i>"no es un
 * tipo que falte, es otra máquina"</i>. Tenía razón, y la máquina ya existe:
 * {@code com.lajuanita.backend.aviso}.
 */
public enum TipoNotificacion {

    /** Tu pedido de sala fue aprobado: ya tenés la reserva. */
    SOLICITUD_APROBADA,

    /** Tu pedido de sala fue rechazado, y la notificación dice por qué. */
    SOLICITUD_RECHAZADA,

    /**
     * Pediste mover una clase y no se pudo, y el aviso dice por qué.
     *
     * <p><b>No existe el aprobado.</b> Cuando el pedido se aprueba la clase se
     * mueve, y mover una clase ya avisa por su cuenta con {@link #RESERVA_MOVIDA},
     * diciendo de dónde a dónde — que es lo que quien pidió quiere saber. Dos
     * avisos por el mismo hecho entrenan a la gente a ignorarlos.
     *
     * <p>Este existe porque del lado del "no" no se mueve nada: sin aviso, la
     * persona se queda esperando.
     */
    REPROGRAMACION_RECHAZADA,

    /**
     * Te movieron una clase de sala o de horario (M5).
     *
     * <p>Es la regla dura *"las notificaciones de cambio de sala llegan solas"* de
     * §8, y la escribe {@code ReservaService.editar} — el segundo escritor que
     * tiene esta tabla. Le llega al profesor <b>y</b> a los alumnos: el que se
     * presenta en la sala equivocada es cualquiera de los dos.
     */
    RESERVA_MOVIDA,

    /**
     * Le apartamos la sala y falta que la abone (`V24`, `mejoras.md` §13 · C1).
     *
     * <p><b>Va a quien pidió, y su texto tiene que decir qué hacer y hasta
     * cuándo.</b> Es la diferencia entera con {@link #SOLICITUD_APROBADA}: un
     * <i>"está confirmado"</i> sobre un horario que se cae en 24hs deja tranquila a
     * la persona equivocada, y el estudio pierde la venta y el horario. Como no hay
     * mail ni WhatsApp, esta notificación <b>es</b> el canal.
     */
    RESERVA_PRECONFIRMADA,

    /**
     * Se cumplió el plazo y el horario se liberó (`V24`).
     *
     * <p><b>Va a las dos partes, y por motivos distintos.</b> A quien pidió, porque
     * creía tener una reserva y ya no la tiene — enterarse al llegar al estudio es
     * el peor final posible. A administración, porque el horario volvió a estar
     * libre y porque es un dato comercial: alguien pidió, se le ofreció un precio y
     * no pagó.
     */
    PRERESERVA_VENCIDA,

    /**
     * Alguien lleva más de {@code PagoService.DIAS_PARA_VENCER} días debiendo.
     *
     * <p>Es la regla dura de §6, y <b>le llega a administración, no a quien
     * debe</b>. La deuda la persigue el estudio: la pantalla de deudores es
     * administrativa y el aviso es su versión que va a buscar a la persona en vez
     * de esperar a que abra la pantalla.
     */
    DEUDA_VENCIDA,

    /**
     * Un trabajo de M&M entregado hace más de 7 días y todavía sin cobrar (§9).
     *
     * <p>También va a administración, y acá <b>no podría ir a otro lado aunque se
     * quisiera</b>: la mitad de los clientes de Mix &amp; Mastering son externos
     * sin cuenta ({@code trabajo_mastering} los guarda con nombre y contacto), y
     * una notificación necesita un {@code usuario} destino. El aviso existe para
     * que Ghezz deje de fiar sin darse cuenta.
     */
    ENTREGA_IMPAGA,

    /**
     * Falta una semana para un lanzamiento del sello (§10).
     *
     * <p><b>El tercero de los tres avisos, y el único que estrenó la máquina en vez
     * de esperarla.</b> Los otros dos venían pedidos por escrito desde los Módulos 4
     * y 6 y no existían; este llegó cuando el disparador ya estaba, y por eso costó
     * una consulta y un bloque — que era exactamente el argumento para construir esa
     * pieza antes del Módulo 7 y no adentro.
     *
     * <p>Va a administración, como los otros dos: los artistas no entran al sistema
     * (P24), así que del otro lado no hay a quién avisarle.
     */
    RELEASE_PROXIMO
}
