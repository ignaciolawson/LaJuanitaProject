package com.lajuanita.backend.pago;

/**
 * <b>La única definición de "cuánto falta cobrar"</b> (P84, `mejoras.md` §21).
 *
 * <p>Un pago salda exactamente una de cuatro cosas ({@code pago_tiene_destino}):
 * una inscripción, una reserva, un trabajo de Mix & Mastering o una venta. Hasta
 * la novena barrida sólo la inscripción sabía decir cuánto le faltaba —Deudores
 * la calculaba en Java— y las otras tres no eran deuda para nadie: una cabina
 * señada estaba en Pagos y en ningún otro lado. Esta clase escribe la cuenta
 * <b>una vez, en SQL</b>, y la leen todos: Deudores (y con ella el contador de la
 * bandeja, el tablero, el estado de cuenta y las dos reglas del scheduler que
 * la filtran) <b>y el listado de Pagos</b>, que desde P85 muestra sólo lo que
 * ya está cubierto. Si fueran dos definiciones, un pago que Pagos oculta y
 * Deudores no lista sería plata invisible — el patrón `V12`, entre pantallas.
 *
 * <p><b>Cubierta</b> es {@code cobrado en su moneda >= precio}, con
 * {@link EstadoPago#ENTRARON} por su nombre y sin convertir nunca (§2.3). Es la
 * misma cuenta de {@code contratosDe}, de {@code MasteringService.cobradoDe} y
 * de `V34`: lo cobrado en OTRA moneda no cuenta, porque no hay cotización con
 * la que compararlo. Desde `V31`/`V32`/`V33` ese pago no puede nacer, así que
 * la condición sólo descarta filas anteriores.
 *
 * <p><b>Qué cosa entra y desde cuándo</b>, y cada corte es una decisión:
 * <ul>
 *   <li><b>Inscripción</b> — ACTIVA o PREINSCRIPTA ({@code EstadoInscripcion.ABIERTAS}),
 *       con precio mayor a cero (una beca no debe nada). PAUSADA queda afuera
 *       a propósito, como desde P72: cursa y no ocupa, y no se le reclama.
 *   <li><b>Reserva</b> — con precio (`V33`; las de antes no lo tienen y no
 *       reclaman) y que ocupa su franja: la definición canónica de `V1`, por lo
 *       que excluye. Quién debe es <b>quien pagó</b> —la reserva no tiene
 *       titular—, con cuenta o a nombre escrito; y si nadie pagó todavía, el
 *       primer participante (la prereserva, que igual se lista por su deuda
 *       anotada y no por acá).
 *   <li><b>Trabajo de M&M</b> — <b>desde que se entrega</b> (ENTREGADO o DEBE),
 *       con precio acordado. Ignacio, 2026-09-15: antes de entregar Ghezz
 *       decide caso por caso (P8), y un adelanto parcial no es deuda. Coincide
 *       con la regla del scheduler, que marca DEBE a los 7 días de entregado.
 *       El "desde" es la entrega, no la carga.
 *   <li><b>Venta</b> — no anulada. Es la que menos falta hacía: P33 dice que
 *       se cobra al contado, y desde §12 una venta sin cobro se anula y se
 *       recarga; pero si quedó cargada sin su pago, es plata que falta.
 * </ul>
 *
 * <p>Es una constante y no una VIEW de Flyway a propósito: es una definición
 * del negocio que va a cambiar (el corte de M&M ya cambió una vez en esta
 * misma barrida, en la conversación), y cada cambio de una vista es una
 * migración inmutable más. Es el mismo criterio de {@code LineaDeNegocio.EXPRESION}.
 *
 * <p>⚠️ <b>Las fechas vuelven crudas</b>: {@code desde_ts} es un
 * {@code TIMESTAMPTZ} que Java convierte a la zona del estudio antes de sacarle
 * el día (la lección de §17: entre las 21 y las 24 hora local ya es mañana en
 * UTC), y {@code desde_dia} es un {@code DATE} que no necesita conversión.
 * Cada fila trae uno de los dos.
 */
public final class SaldoPendiente {

    private SaldoPendiente() {
    }

    /** Los nombres de los cuatro destinos, tal como vuelven en la columna {@code destino}. */
    public static final String INSCRIPCION = "INSCRIPCION";
    public static final String RESERVA = "RESERVA";
    public static final String TRABAJO = "TRABAJO";
    public static final String VENTA = "VENTA";

    /** {@link EstadoPago#ENTRARON}, escrito para SQL. Una lista por su nombre, no por lo que excluye (`V12`). */
    private static final String ENTRARON = "('SENADO', 'PAGADO')";

    /**
     * Una fila por cosa con precio, con lo cobrado en su moneda y lo que falta.
     *
     * <p>Columnas, en este orden y con estos nombres:
     * {@code destino, id_destino, moneda, precio, cobrado, saldo, anotado,
     * id_usuario, nombre_externo, contacto_externo, desde_ts, desde_dia,
     * detalle, vence, preinscripta, disciplina, numero_grupo}. Se usa como
     * subconsulta: {@code FROM (COSAS) s}.
     *
     * <p>⚠️ <b>Las dos últimas sólo tienen valor en la inscripción</b> y las otras
     * tres ramas las mandan en NULL: un {@code UNION ALL} exige la misma cantidad
     * de columnas, y agregarlas <b>al final</b> es lo que deja intactos los índices
     * con que {@code PagoService} lee las filas.
     *
     * <p>{@code saldo} es {@code precio - cobrado}: lo que falta que ENTRE. Es lo
     * que mira el listado de Pagos. {@code anotado} es lo que de ese saldo ya
     * está escrito como deuda (DEBE/VENCIDO): Deudores lista esas filas por su
     * cuenta y la calculada muestra {@code saldo - anotado}, el resto sin anotar
     * — así la prereserva se lee como "la seña, con su plazo" más "falta el
     * resto", y nada se cuenta dos veces. Antes de P84 el tablero sumaba la
     * cuota anotada ENCIMA del saldo del programa: la misma plata dos veces.
     */
    public static final String COSAS = """
            SELECT 'INSCRIPCION' AS destino, i.id_inscripcion AS id_destino, i.moneda,
                   i.precio_total AS precio,
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_inscripcion = i.id_inscripcion
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = i.moneda), 0) AS cobrado,
                   i.precio_total - COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_inscripcion = i.id_inscripcion
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = i.moneda), 0) AS saldo,
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_inscripcion = i.id_inscripcion
                                AND q.estado_pago IN ('DEBE', 'VENCIDO')
                                AND q.moneda = i.moneda), 0) AS anotado,
                   al.id_usuario, NULL::varchar AS nombre_externo, NULL::varchar AS contacto_externo,
                   i.fecha_creacion AS desde_ts, NULL::date AS desde_dia,
                   -- "DJ" o "DJ · Grupo 8": la deuda del grupo va bajo el referente
                   -- (V35, P88) y la fila tiene que decir que es del grupo.
                   (i.disciplina::varchar
                      || CASE WHEN i.numero_grupo IS NULL THEN ''
                              ELSE ' · Grupo ' || i.numero_grupo END) AS detalle,
                   i.vence_preinscripcion AS vence,
                   (i.estado = 'PREINSCRIPTA') AS preinscripta,
                   -- ⚠️ La disciplina va SUELTA y no adentro de `detalle` (§23 · B2).
                   -- Hasta `V35` el detalle de un programa era la disciplina pelada,
                   -- así que Java la pasaba como las dos cosas y la pantalla la
                   -- traducía a "Programa de DJ". El grupo le agregó " · Grupo 8" al
                   -- detalle y esa traducción empezó a dar **"Programa de undefined"**:
                   -- un dato que servía para dos cosas dejó de servir para una sin que
                   -- nada fallara. Ahora son dos columnas y ninguna deduce a la otra.
                   i.disciplina::varchar AS disciplina,
                   i.numero_grupo AS numero_grupo
              FROM inscripcion i
              JOIN inscripcion_integrante ii ON ii.id_inscripcion = i.id_inscripcion AND ii.referente
              JOIN alumno al ON al.id_alumno = ii.id_alumno
             WHERE i.estado IN ('ACTIVA', 'PREINSCRIPTA')
               AND i.precio_total > 0

            UNION ALL

            SELECT 'RESERVA', r.id_reserva, r.moneda,
                   r.precio_total,
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_reserva = r.id_reserva
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = r.moneda), 0),
                   r.precio_total - COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_reserva = r.id_reserva
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = r.moneda), 0),
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_reserva = r.id_reserva
                                AND q.estado_pago IN ('DEBE', 'VENCIDO')
                                AND q.moneda = r.moneda), 0),
                   CASE WHEN pagador.id_usuario IS NULL AND pagador.nombre_pagador_externo IS NULL
                        THEN (SELECT rp.id_usuario FROM reserva_participante rp
                               WHERE rp.id_reserva = r.id_reserva
                               ORDER BY rp.id_participacion LIMIT 1)
                        ELSE pagador.id_usuario END,
                   pagador.nombre_pagador_externo, pagador.contacto_pagador_externo,
                   r.fecha_creacion, NULL::date,
                   tu.nombre || ' en ' || s.nombre_sala || ', '
                       || to_char(r.fecha, 'DD/MM/YYYY') || ' ' || to_char(r.hora_inicio, 'HH24:MI'),
                   r.vence_preconfirmacion,
                   FALSE,
                   NULL::varchar, NULL::integer
              FROM reserva r
              JOIN tipo_uso tu ON tu.id_tipo_uso = r.id_tipo_uso
              JOIN sala s ON s.id_sala = r.id_sala
              LEFT JOIN LATERAL (SELECT q.id_usuario, q.nombre_pagador_externo, q.contacto_pagador_externo
                                   FROM pago q
                                  WHERE q.id_reserva = r.id_reserva
                                    AND q.estado_pago <> 'ANULADO'
                                  ORDER BY q.id_pago LIMIT 1) pagador ON TRUE
             WHERE r.precio_total IS NOT NULL
               AND r.estado NOT IN ('CANCELADA', 'REPROGRAMADA')

            UNION ALL

            SELECT 'TRABAJO', t.id_trabajo, t.moneda,
                   t.precio_acordado,
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_trabajo_mastering = t.id_trabajo
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = t.moneda), 0),
                   t.precio_acordado - COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_trabajo_mastering = t.id_trabajo
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = t.moneda), 0),
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_trabajo_mastering = t.id_trabajo
                                AND q.estado_pago IN ('DEBE', 'VENCIDO')
                                AND q.moneda = t.moneda), 0),
                   t.id_cliente_usuario, t.nombre_cliente_externo, t.contacto_cliente_externo,
                   CASE WHEN t.fecha_entrega_real IS NULL THEN t.fecha_creacion END,
                   t.fecha_entrega_real,
                   'Mix & Mastering: ' || t.nombre_track,
                   NULL::timestamptz,
                   FALSE,
                   NULL::varchar, NULL::integer
              FROM trabajo_mastering t
             WHERE t.precio_acordado IS NOT NULL
               AND t.estado IN ('ENTREGADO', 'DEBE')

            UNION ALL

            SELECT 'VENTA', v.id_venta, v.moneda,
                   v.precio,
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_venta_equipo = v.id_venta
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = v.moneda), 0),
                   v.precio - COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_venta_equipo = v.id_venta
                                AND q.estado_pago IN """ + ENTRARON + """
                                AND q.moneda = v.moneda), 0),
                   COALESCE((SELECT SUM(q.monto) FROM pago q
                              WHERE q.id_venta_equipo = v.id_venta
                                AND q.estado_pago IN ('DEBE', 'VENCIDO')
                                AND q.moneda = v.moneda), 0),
                   v.id_usuario_comprador, v.nombre_comprador_externo, v.contacto_comprador_externo,
                   NULL::timestamptz, v.fecha_venta,
                   'Equipo: ' || v.modelo_equipo,
                   NULL::timestamptz,
                   FALSE,
                   NULL::varchar, NULL::integer
              FROM venta_equipo v
             WHERE NOT v.anulada""";

    /**
     * El destino de un pago, con los nombres de arriba, para cruzarlo con
     * {@link #COSAS}. Es la forma de {@code LineaDeNegocio.EXPRESION} sin el
     * cruce a {@code tipo_uso}: acá importa <i>qué fila</i>, no qué línea.
     */
    public static final String DESTINO_DEL_PAGO = """
            CASE
                WHEN p.id_inscripcion       IS NOT NULL THEN 'INSCRIPCION'
                WHEN p.id_reserva           IS NOT NULL THEN 'RESERVA'
                WHEN p.id_trabajo_mastering IS NOT NULL THEN 'TRABAJO'
                ELSE 'VENTA'
            END""";

    /** El id de lo que salda el pago: exactamente uno de los cuatro no es nulo. */
    public static final String ID_DEL_DESTINO =
            "COALESCE(p.id_inscripcion, p.id_reserva, p.id_trabajo_mastering, p.id_venta_equipo)";

    /**
     * Verdadero cuando <b>la cosa que salda el pago {@code p} todavía tiene
     * saldo</b> — es decir, cuando ese pago está en Deudores y no en Pagos
     * (P85). Una cosa que no está en {@link #COSAS} (una clase, una reserva
     * sin precio, un trabajo no entregado, una PAUSADA) no debe nada.
     */
    public static final String EL_DESTINO_DEL_PAGO_TIENE_SALDO =
            "EXISTS (SELECT 1 FROM (" + COSAS + ") sp"
                    + " WHERE sp.saldo > 0"
                    + " AND sp.destino = " + DESTINO_DEL_PAGO
                    + " AND sp.id_destino = " + ID_DEL_DESTINO + ")";
}
