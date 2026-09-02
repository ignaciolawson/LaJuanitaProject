package com.lajuanita.backend.pago;

/**
 * Qué deuda se le puede ir a cobrar a alguien (`mejoras.md` §13 · C1, P46).
 *
 * <p><b>Una deuda cuya reserva se canceló no es una deuda.</b> Lo trajo la
 * prereserva: cuando el plazo se vence, la reserva se cancela y el {@code pago} en
 * {@code DEBE} <b>queda anotado</b> — es historia, y además es información
 * comercial: <i>se le ofreció este monto y no pagó</i>. Lo que no puede es seguir
 * apareciendo en la lista de a quién llamar, porque no hay nada que reclamar: el
 * horario ya no existe.
 *
 * <p>Es el espejo exacto de una regla que este esquema ya tenía: <b>`V11` decidió
 * que una reserva cancelada no debe seña</b>. Si no debe, no se le cobra.
 *
 * <p><b>Por qué la fila no se anula, que es la pregunta obvia:</b> anular exige
 * autor, fecha y motivo firmados (`V7`), y acá el autor sería un reloj. Las dos
 * salidas eran firmar con el nombre del admin que preconfirmó —una mentira sobre
 * quién hizo qué, en la única tabla que existe para que eso no pase— o inventar un
 * usuario "sistema", que es una identidad de login falsa. Ninguna vale lo que
 * ahorra.
 *
 * <p>⚠️ <b>El estado de cuenta SÍ la sigue mostrando.</b> Ahí la fila es historia
 * de esa persona y esconderla sería perder el dato; lo que se filtra es la lista
 * de cobranza y el número de deuda viva, que son los que mandan a alguien a
 * llamar.
 *
 * <h2>Por qué está escrita dos veces, y por qué eso es aceptable acá</h2>
 *
 * <p>Las tres consultas que la necesitan no están en el mismo dialecto: la de
 * deudores es JPQL y la del tablero es SQL nativo. En vez de dejar el predicado
 * suelto en cada una, las dos redacciones viven <b>acá, a cinco líneas de
 * distancia</b>, que es el mismo recurso que usa {@code LineaDeNegocio} con su
 * {@code EXPRESION} y sus {@code JOINS}: no evita que alguien cambie una y se
 * olvide de la otra, pero hace que las vea juntas cuando vaya a cambiarla.
 */
public final class DeudaCobrable {

    private DeudaCobrable() {
    }

    /**
     * En JPQL, para pegar en un {@code WHERE}. Exige que la consulta tenga el
     * alias {@code p} sobre {@code Pago}.
     *
     * <p>El {@code IS NULL} es la mitad que no se puede olvidar: <b>la enorme
     * mayoría de las deudas no apunta a ninguna reserva</b> —son de inscripciones—
     * y sin él desaparecerían todas.
     *
     * <p>⚠️ <b>Va como subconsulta y NO como {@code p.reserva.estado}</b>, que es lo
     * que uno escribe primero. Navegar esa ruta en JPQL genera un <b>INNER JOIN
     * implícito</b>, y entonces la condición no se evalúa nunca para los pagos sin
     * reserva: el join ya los descartó, y desaparecen <i>todas</i> las deudas de
     * inscripción. Se escribió así, y siete casos de {@code CajaTest} y
     * {@code AvisosTest} lo dijeron enseguida. <b>Es el mismo modo de falla que
     * `V19` documentó</b> —la consulta anda y la lista viene corta— con la
     * diferencia de que ahí el INNER estaba escrito y acá lo pone Hibernate solo.
     */
    public static final String JPQL =
            "(p.reserva IS NULL OR EXISTS (SELECT 1 FROM Reserva r2"
                    + " WHERE r2 = p.reserva"
                    + " AND r2.estado <> com.lajuanita.backend.reserva.EstadoReserva.CANCELADA))";

    /**
     * En SQL, para pegar en un {@code WHERE} nativo. Exige el alias {@code p}
     * sobre {@code pago} y hace su propio {@code LEFT JOIN} por subconsulta, para
     * no obligar a cada consulta a agregar un join que después hay que recordar.
     */
    public static final String SQL =
            "(p.id_reserva IS NULL OR EXISTS (SELECT 1 FROM reserva r2"
                    + " WHERE r2.id_reserva = p.id_reserva AND r2.estado <> 'CANCELADA'))";
}
