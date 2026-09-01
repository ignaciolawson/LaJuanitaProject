package com.lajuanita.backend.tablero;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.lajuanita.backend.pago.Pago;

/**
 * Las consultas del tablero de dirección (§11).
 *
 * <p><b>Todas agregan en la base y ninguna trae filas para contarlas en Java.</b>
 * Es la misma decisión que el informe de uso de salas dejó comentada: contar en
 * memoria funciona hoy —el estudio tiene cientos de filas— y deja de funcionar
 * sin avisar el día que el período sea un año. Y este es justamente el módulo
 * que iba a pedir el año entero.
 *
 * <p><b>Por qué extiende {@code Repository<Pago, Long>} y no algo más honesto:</b>
 * Spring Data exige un tipo de dominio y estas consultas cruzan siete tablas. Se
 * eligió {@code Pago} porque es la que más aparece; el tipo no se usa —no hay un
 * solo método derivado acá— y ninguna consulta devuelve entidades. La
 * alternativa era repartir estas consultas entre cinco repositorios de otros
 * módulos, y entonces el tablero dejaría de poder leerse de un tirón.
 *
 * <p><b>Lo que este repositorio NO tiene es la caja.</b> El resumen financiero
 * sale de {@code PagoService.caja}, que existe desde el Módulo 3. Reescribir esa
 * suma acá habría sido la tercera copia de una definición del proyecto, y la más
 * cara de las tres: dos pantallas mostrando totales distintos del mismo mes es
 * exactamente lo que este sistema vino a terminar.
 */
public interface TableroRepository extends Repository<Pago, Long> {

    // == 1. Alumnos activos por servicio ======================================

    /**
     * Cuántos alumnos hay hoy en cada disciplina y nivel.
     *
     * <p><b>No mira el período, y eso es una decisión, no un olvido.</b> "Alumnos
     * activos" es una foto de hoy: filtrarla por el período elegido contestaría
     * otra pregunta —cuántos empezaron en marzo— y la contestaría con el mismo
     * título, que es la forma más barata de que un tablero mienta. La pantalla lo
     * dice ("al día de hoy") y la cabecera de trazabilidad de la exportación
     * también.
     *
     * <p>Cuenta {@code DISTINCT} el alumno dentro de cada disciplina porque la
     * misma persona puede tener DJ y producción a la vez, y las dos tienen que
     * sumar en su fila. Lo que no puede es aparecer dos veces en la misma.
     *
     * <p>{@code VIGENTES} es {@code ACTIVA + PAUSADA}, la misma definición con la
     * que el listado de alumnos filtra por disciplina: un curso pausado sigue
     * teniendo clases debidas, y esconder a esa persona la esconde justo de quien
     * tiene que ir a buscarla.
     *
     * @return filas {@code [disciplina, nivel, alumnos, inscripciones]}
     */
    @Query(value = """
            SELECT i.disciplina,
                   coalesce(i.nivel, 'SIN_NIVEL')     AS nivel,
                   count(DISTINCT i.id_alumno)        AS alumnos,
                   count(*)                           AS inscripciones
            FROM inscripcion i
            WHERE i.estado IN (:vigentes)
            GROUP BY i.disciplina, coalesce(i.nivel, 'SIN_NIVEL')
            ORDER BY i.disciplina, 2
            """, nativeQuery = true)
    List<Object[]> alumnosPorServicio(@Param("vigentes") Iterable<String> vigentes);

    // == 2. Ingresos del período por línea de negocio ==========================

    /**
     * Lo que entró en el período, por moneda y por línea de negocio.
     *
     * <p>La única definición de "línea de negocio" del sistema es
     * {@link LineaDeNegocio#EXPRESION}, y esta consulta la pega. Desde
     * `mejoras.md` §12 · B1 tiene un segundo consumidor —el listado de pagos—,
     * así que el {@code CASE} salió de acá en vez de copiarse allá. Sale de a qué apunta el pago, y en el caso de
     * una reserva, del tipo de uso de esa reserva — la seña de una clase es plata
     * del curso, no del alquiler de cabina. Sin ese cruce, todas las señas caerían
     * en la misma bolsa y el tablero diría que el estudio factura por alquiler lo
     * que en realidad cobró por enseñar.
     *
     * <p>El {@code GROUP BY 2} agrupa por la segunda columna del SELECT, que es
     * la expresión: sin el ordinal habría que pegar el {@code CASE} otra vez.
     *
     * <p>{@code ENTRARON} es {@code SENADO + PAGADO}: lo que de verdad está en la
     * caja. Una deuda anotada no es un ingreso, y escribir ese conjunto por lo que
     * excluye ({@code <> ANULADO}) fue exactamente el agujero que {@code V12} tuvo
     * que tapar.
     *
     * @return filas {@code [moneda, linea, monto, cantidad]}
     */
    @Query(value = "SELECT p.moneda, " + LineaDeNegocio.EXPRESION + " AS linea,"
            + " sum(p.monto) AS monto, count(*) AS cantidad"
            + " FROM pago p " + LineaDeNegocio.JOINS + " " + """
            WHERE p.fecha_pago BETWEEN :desde AND :hasta
              AND p.estado_pago IN (:entraron)
            GROUP BY p.moneda, 2
            ORDER BY p.moneda, 2
            """, nativeQuery = true)
    List<Object[]> ingresosPorLinea(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("entraron") Iterable<String> entraron);

    // == 3. Ocupación de salas por día y franja ================================

    /**
     * Cuántas reservas empiezan en cada día de la semana y cada hora.
     *
     * <p><b>Se agrupa por la hora de INICIO, y por eso la pantalla dice "reservas
     * que empiezan en esa franja" y no "horas usadas".</b> Una clase de 10:00 a
     * 11:30 toca dos franjas; repartirla entre las dos exigiría partir el
     * intervalo en la consulta, y el número que la dirección mira acá es cuándo se
     * llena el estudio, no cuántos minutos hay en cada casilla. La columna de
     * horas viaja igual, como duración total de esas reservas, y está nombrada
     * para que no se confunda con la otra lectura.
     *
     * <p>{@code ISODOW} —lunes 1, domingo 7— y no {@code DOW}, que empieza en
     * domingo 0: la grilla se dibuja de lunes a domingo.
     *
     * @return filas {@code [dia_iso, hora, reservas, horas]}
     */
    @Query(value = """
            SELECT EXTRACT(ISODOW FROM r.fecha)::int     AS dia,
                   EXTRACT(HOUR FROM r.hora_inicio)::int AS hora,
                   count(*)                              AS reservas,
                   coalesce(sum(EXTRACT(EPOCH FROM (r.hora_fin - r.hora_inicio)) / 3600), 0) AS horas
            FROM reserva r
            WHERE r.fecha BETWEEN :desde AND :hasta
              AND r.estado IN (:ocupan)
              AND (:idSala IS NULL OR r.id_sala = :idSala)
            GROUP BY 1, 2
            ORDER BY 1, 2
            """, nativeQuery = true)
    List<Object[]> ocupacionPorFranja(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("idSala") Long idSala,
            @Param("ocupan") Iterable<String> ocupan);

    // == 4. Cobros pendientes ==================================================

    /**
     * Lo que se anotó como deuda y todavía no entró, por moneda.
     *
     * <p><b>No mira el período tampoco</b>, y por la misma razón que los alumnos
     * activos: una deuda de febrero sigue siendo una deuda hoy. Si se filtrara por
     * el período elegido, mirar el tablero de agosto haría desaparecer lo que se
     * debe desde marzo — que es precisamente la plata que hay que ir a buscar.
     *
     * <p>{@code VENCIDO} son las que además pasaron los 7 días (§6). Las dos
     * juntas son {@code ADEUDADOS}; se devuelven separadas porque son dos llamadas
     * distintas de la dirección.
     *
     * @return filas {@code [moneda, monto, cantidad, monto_vencido, cantidad_vencida]}
     */
    @Query(value = """
            SELECT p.moneda,
                   sum(p.monto)                                                      AS monto,
                   count(*)                                                          AS cantidad,
                   coalesce(sum(p.monto) FILTER (WHERE p.estado_pago = 'VENCIDO'), 0) AS vencido,
                   count(*) FILTER (WHERE p.estado_pago = 'VENCIDO')                 AS cantidad_vencida
            FROM pago p
            WHERE p.estado_pago IN (:adeudados)
            GROUP BY p.moneda
            ORDER BY p.moneda
            """, nativeQuery = true)
    List<Object[]> cobrosPendientes(@Param("adeudados") Iterable<String> adeudados);

    // == 5. Tasa de retención ==================================================

    /**
     * La tasa de retención, según la definición cerrada en §15 (P26).
     *
     * <p><b>Retenido es quien contrata un segundo servicio dentro de los 10 meses
     * del primero</b>, contados desde la fecha del primero. Cuenta cualquier cosa
     * contratada —curso, mentoría, alquiler de cabina, mix &amp; mastering— menos
     * la venta de equipos, que es una operación de mostrador y no una relación con
     * el estudio.
     *
     * <p>Tres cosas que esta consulta decide, y que si se tocan cambian el número
     * sin que nada falle:
     *
     * <ol>
     *   <li><b>Las clases de un curso NO son servicios.</b> Una inscripción de DJ
     *       son ocho reservas, y contarlas daría que todo alumno queda retenido a
     *       la semana de empezar — la tasa daría casi 100% y sería mentira. Por eso
     *       las participaciones que cuelgan de una inscripción quedan afuera: ya
     *       las representa la inscripción.</li>
     *   <li><b>Pausar y volver no es retención</b>, y sale gratis: retomar una
     *       inscripción pausada es <i>la misma</i> fila, no una segunda.</li>
     *   <li><b>El denominador son los que ya cerraron su ventana</b> — primer
     *       servicio hace más de 10 meses. Quien contrató hace tres meses todavía
     *       puede volver, así que meterlo en el denominador haría bajar la tasa
     *       cada vez que el estudio suma gente: <b>crecer se leería como
     *       empeorar</b>. La trampa está anotada en §15 y esta es su ratificación.</li>
     * </ol>
     *
     * <p>El {@code >= 2} —y no "existe otro con fecha posterior"— es lo que hace
     * que dos servicios contratados el mismo día cuenten: alguien que se anota en
     * DJ y en producción la misma tarde contrató dos veces.
     *
     * <p><b>Devuelve {@code List<Object[]>} y no {@code Object[]} aunque la
     * consulta tenga una sola fila.</b> Declarándola como {@code Object[]},
     * Spring Data entrega la lista de filas igual y la castea a ese tipo: lo que
     * llega es un {@code Object[]} cuyo único elemento es <i>otro</i>
     * {@code Object[]}, y el {@code ClassCastException} aparece recién al leer la
     * primera columna. La lista de una fila es más fea y no miente.
     *
     * @return una única fila {@code [con_ventana_cerrada, retenidos]}
     */
    @Query(value = """
            WITH servicios AS (
                SELECT a.id_usuario                                     AS id_usuario,
                       coalesce(i.fecha_inicio, i.fecha_creacion::date) AS fecha
                  FROM inscripcion i
                  JOIN alumno a ON a.id_alumno = i.id_alumno
                UNION ALL
                SELECT rp.id_usuario, r.fecha
                  FROM reserva_participante rp
                  JOIN reserva r ON r.id_reserva = rp.id_reserva
                 WHERE rp.id_inscripcion IS NULL
                   AND r.estado IN (:ocupan)
                UNION ALL
                SELECT t.id_cliente_usuario, t.fecha_creacion::date
                  FROM trabajo_mastering t
                 WHERE t.id_cliente_usuario IS NOT NULL
                   AND t.estado <> 'CANCELADO'
            ),
            primero AS (
                SELECT id_usuario, min(fecha) AS fecha_primero
                  FROM servicios
                 GROUP BY id_usuario
            ),
            ventana AS (
                SELECT p.id_usuario,
                       (SELECT count(*) FROM servicios s
                         WHERE s.id_usuario = p.id_usuario
                           AND s.fecha <= p.fecha_primero + INTERVAL '10 months') >= 2 AS retenido
                  FROM primero p
                 WHERE p.fecha_primero <= current_date - INTERVAL '10 months'
            )
            SELECT count(*)                         AS cerraron_ventana,
                   count(*) FILTER (WHERE retenido) AS retenidos
            FROM ventana
            """, nativeQuery = true)
    List<Object[]> retencion(@Param("ocupan") Iterable<String> ocupan);

    // == 6. Conversión: de servicio suelto a alumno ============================

    /**
     * De quienes llegaron por un servicio suelto, cuántos se convirtieron
     * después en alumnos.
     *
     * <p><b>"Llegó por un servicio suelto"</b> es tener un primer pago
     * {@code ENTRARON} que NO apunta a una inscripción y sí apunta a uno de los
     * cuatro destinos que no son cursar: alquiler de cabina, grabación de set,
     * mix &amp; mastering o venta de equipos — la misma lectura de
     * {@link LineaDeNegocio} que usa {@code ingresosPorLinea}, filtrada al
     * revés. Es exactamente la razón de ser de que {@code usuario} sea la raíz
     * del sistema y no {@code alumno}: esta persona pudo alquilar la cabina sin
     * anotarse nunca a un curso, y este indicador mide si ese camino de entrada
     * de verdad trae alumnos.
     *
     * <p><b>El {@code NOT EXISTS} es lo que separa "llegó por acá" de "ya era
     * alumno y además alquiló".</b> Sin él, cualquier alumno que alguna vez
     * pagó una cabina contaría como si su primer contacto hubiera sido ese
     * alquiler, y la tasa de conversión mediría lo que ya estaba convertido —
     * la misma clase de trampa que las clases de un curso le habrían hecho a la
     * retención.
     *
     * <p><b>No hay ventana de tiempo, a diferencia de la retención.</b> Ahí la
     * ventana existe porque sin ella "creció el estudio" se leía como "empeoró
     * la retención" (§15). Acá no hace falta: alguien que alquiló la cabina la
     * semana pasada todavía puede convertirse mañana, y no convertirse todavía
     * no es un "no" — es sencillamente parte del denominador, que es
     * exactamente lo que la pregunta necesita contestar.
     *
     * <p>Devuelve {@code List<Object[]>} de una sola fila por la misma razón que
     * {@link #retencion}: declararla {@code Object[]} hace que Spring Data
     * entregue una lista igual y la castee, y el {@code ClassCastException}
     * aparece recién al leer la primera columna.
     *
     * @return una única fila {@code [llegaron, convertidos]}
     */
    @Query(value = """
            WITH primer_servicio_suelto AS (
                SELECT p.id_usuario      AS id_usuario,
                       min(p.fecha_pago) AS fecha
                FROM pago p
                LEFT JOIN reserva  r  ON r.id_reserva   = p.id_reserva
                LEFT JOIN tipo_uso tu ON tu.id_tipo_uso = r.id_tipo_uso
                WHERE p.estado_pago IN (:entraron)
                  AND p.id_inscripcion IS NULL
                  -- Desde `V19` un pago puede no tener cuenta, y acá eso importa
                  -- de dos maneras. La grave: sin este filtro, TODOS los pagos sin
                  -- cuenta caen en el mismo grupo (el del NULL) y se cuentan como
                  -- **una sola persona** que llegó por un servicio suelto.
                  -- Y la de fondo: convertirse es inscribirse, e inscribirse pide
                  -- cuenta, así que quien no la tiene no puede convertir nunca --
                  -- dejarlo en el denominador hunde la tasa para siempre, que es
                  -- la misma trampa que el denominador de la retención (P26).
                  AND p.id_usuario IS NOT NULL
                  AND (p.id_trabajo_mastering IS NOT NULL
                       OR p.id_venta_equipo IS NOT NULL
                       OR tu.codigo IN ('ALQUILER_CABINA', 'GRABACION_SET', 'MIX_MASTERING'))
                GROUP BY p.id_usuario
            ),
            llegaron_sueltos AS (
                SELECT ps.id_usuario
                FROM primer_servicio_suelto ps
                WHERE NOT EXISTS (
                    SELECT 1
                    FROM inscripcion i
                    JOIN alumno a ON a.id_alumno = i.id_alumno
                    WHERE a.id_usuario = ps.id_usuario
                      AND i.fecha_creacion::date <= ps.fecha
                )
            )
            SELECT count(*) AS llegaron,
                   count(*) FILTER (WHERE EXISTS (
                       SELECT 1 FROM inscripcion i
                       JOIN alumno a ON a.id_alumno = i.id_alumno
                       WHERE a.id_usuario = l.id_usuario
                   ))         AS convertidos
            FROM llegaron_sueltos l
            """, nativeQuery = true)
    List<Object[]> conversion(@Param("entraron") Iterable<String> entraron);

    // == 7. Mix & Mastering ====================================================

    /**
     * Los trabajos de mastering por estado, y cuántos se entregaron en el período.
     *
     * <p>El estado es una foto —cuántos hay hoy en cada casilla, que es lo que
     * mira quien pregunta si el tablero de M&amp;M está tapado— y la entrega sí es
     * del período. Van juntos en una consulta porque la pantalla los muestra en el
     * mismo bloque, y separarlos serían dos viajes para dibujar una fila.
     *
     * <p>{@code revisiones_realizadas > revisiones_incluidas} es el hecho que §9
     * pide alertar y que {@code V15} tuvo que <b>permitir</b> que exista:
     * {@code V6} §3 lo había prohibido con un CHECK, y no se puede avisar de algo
     * que la base rechaza.
     *
     * @return filas {@code [estado, cantidad, entregados_en_periodo, con_revisiones_de_mas]}
     */
    @Query(value = """
            SELECT t.estado,
                   count(*)                                                                 AS cantidad,
                   count(*) FILTER (WHERE t.fecha_entrega_real BETWEEN :desde AND :hasta)    AS entregados,
                   count(*) FILTER (WHERE t.revisiones_realizadas > t.revisiones_incluidas)  AS revisiones_de_mas
            FROM trabajo_mastering t
            GROUP BY t.estado
            ORDER BY t.estado
            """, nativeQuery = true)
    List<Object[]> mixMastering(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    // == 8. Actividad del sello ================================================

    /**
     * Los releases por estado, y cuántos se publicaron en el período.
     *
     * <p>Misma forma que M&amp;M: el estado es la foto de hoy, la publicación es
     * del período. {@code fecha_real} es la fecha en que salió; un release
     * publicado sin fecha real no cuenta como publicado <i>en el período</i>, y
     * eso es correcto — no se sabe cuándo fue.
     *
     * <p>{@code publicado_sin_contrato} viaja porque es el único número del
     * tablero que señala una excepción firmada a una regla dura, y la dirección es
     * exactamente a quien le importa que existan.
     *
     * @return filas {@code [estado, cantidad, publicados_en_periodo, sin_contrato]}
     */
    @Query(value = """
            SELECT r.estado,
                   count(*)                                                       AS cantidad,
                   count(*) FILTER (WHERE r.fecha_real BETWEEN :desde AND :hasta) AS publicados,
                   count(*) FILTER (WHERE r.publicado_sin_contrato)               AS sin_contrato
            FROM release r
            GROUP BY r.estado
            ORDER BY r.estado
            """, nativeQuery = true)
    List<Object[]> sello(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);

    /**
     * Las apariciones cargadas en el período — "dónde sonó" (P25).
     *
     * <p>Ordenadas por la jerarquía fija de tipo de aparición —radio, set,
     * playlist, otro— que ya vive en {@code aparicion_release.orden_relevancia},
     * una columna generada. <b>No se reescribe el {@code CASE} acá</b>: esa fue
     * una decisión explícita del Módulo 7, para que el tablero leyera la misma
     * jerarquía y no una segunda copia.
     *
     * <p>La sección puede estar vacía y eso no es una falla: quedó dicho al
     * ratificar P25 (<i>"si en el futuro no lo usan, que no lo usen y fue"</i>).
     * El tablero tiene que leerse bien con cero.
     *
     * @return filas {@code [tipo_aparicion, cantidad]}
     */
    @Query(value = """
            SELECT ap.tipo_aparicion, count(*) AS cantidad
            FROM aparicion_release ap
            WHERE ap.fecha_creacion::date BETWEEN :desde AND :hasta
            GROUP BY ap.tipo_aparicion
            ORDER BY min(ap.orden_relevancia), ap.tipo_aparicion
            """, nativeQuery = true)
    List<Object[]> aparicionesDelSello(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);
}
