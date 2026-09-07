package com.lajuanita.backend.solicitante;

/**
 * Qué ficha del buzón todavía le debe algo a alguien (`V27`, P55 y P56).
 *
 * <p><b>El buzón existe para garantizar una sola cosa: la lista de gente que nadie
 * contestó.</b> Lo dice `V20` en su propia cabecera. Y hasta `V27` esa lista
 * dejaba de mirar demasiado temprano — crear la cuenta sacaba la ficha de la
 * lista, con la persona todavía sin su reserva.
 *
 * <p>Ahora una ficha está abierta si:
 *
 * <ul>
 *   <li>nadie la atendió ({@code PENDIENTE}), <b>tenga o no cuenta</b>; o
 *   <li>se le apartó una sala y <b>todavía falta la seña</b>
 *       ({@code PRECONFIRMADA}); o
 *   <li>esa prereserva <b>se venció sin pagar</b> ({@code CANCELADA}), que es una
 *       ficha que necesita una decisión: apartar de nuevo, o descartar.
 * </ul>
 *
 * <p>Una inscripción o una venta cierran la ficha en el acto: no queda nada
 * esperando detrás. Una reserva confirmada, también.
 *
 * <h2>Por qué es una constante y no un {@code WHERE} suelto</h2>
 *
 * <p>La necesitan <b>dos</b> consultas —el listado del buzón y el contador del
 * sidebar— y el bug que `V27` cerró fue exactamente que las dos definían "lo que
 * falta" por su cuenta y las dos se quedaban cortas en el mismo lugar. Si se
 * separan otra vez, el contador dice cero mientras la lista muestra tres.
 *
 * <p>Es el mismo recurso que {@code DeudaCobrable} y que {@code LineaDeNegocio}:
 * no impide que alguien cambie una y se olvide de la otra, pero hace que las vea
 * juntas cuando vaya a cambiarla.
 */
public final class FichaAbierta {

    private FichaAbierta() {
    }

    /**
     * En JPQL, para pegar en un {@code WHERE}. Exige el alias {@code s} sobre
     * {@code Solicitante}.
     *
     * <p>⚠️ <b>Va como subconsulta y NO como {@code s.reserva.estado}</b>, que es lo
     * que uno escribe primero. Navegar esa ruta en JPQL genera un <b>INNER JOIN
     * implícito</b>, y entonces se caen del resultado <i>todas</i> las fichas sin
     * reserva — que son la enorme mayoría, incluidas todas las pendientes. Es el
     * modo de falla que {@code DeudaCobrable} documenta y que ya costó siete casos
     * en rojo cuando la prereserva lo estrenó: la consulta anda y la lista viene
     * corta.
     */
    public static final String JPQL =
            "(s.estado = com.lajuanita.backend.solicitante.EstadoSolicitante.PENDIENTE"
                    + " OR EXISTS (SELECT 1 FROM Reserva r"
                    + " WHERE r = s.reserva"
                    + " AND r.estado IN (com.lajuanita.backend.reserva.EstadoReserva.PRECONFIRMADA,"
                    + " com.lajuanita.backend.reserva.EstadoReserva.CANCELADA)))";
}
