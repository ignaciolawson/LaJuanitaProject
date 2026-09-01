package com.lajuanita.backend.tablero;

/**
 * A qué línea de negocio pertenece una plata que entró.
 *
 * <p>§11 pide los ingresos del período <i>"por línea de negocio"</i>, y esa
 * línea <b>no es una columna de {@code pago}</b>: se deduce de a qué apunta el
 * pago. La tabla tiene cuatro destinos posibles —inscripción, reserva, trabajo
 * de mastering, venta de equipos— y de a uno por vez.
 *
 * <p><b>La deducción está escrita una sola vez</b> —{@link #EXPRESION}, acá
 * abajo— y este enum solo nombra el resultado. Escribirla de nuevo sería la
 * tercera copia de una definición en este proyecto, y las dos que ya existen
 * están anotadas como deuda: {@code contarClasesConsumidas} contra {@code V9}
 * §5, y {@code queRespaldanAlRelease} contra {@code release_tiene_contrato()}.
 *
 * <p>⚠️ <b>Tiene un segundo consumidor desde `mejoras.md` §12 · B1</b>: el
 * listado de pagos, que se divide por línea. §12 lo pidió con todas las letras
 * —<i>"hay que reusarla, no escribir una segunda"</i>— así que el {@code CASE}
 * salió de la consulta del tablero y quedó acá, y las dos consultas lo pegan.
 *
 * <p><b>Se intentó primero pasarlas a JPQL y no se puede</b>: Hibernate 7 no
 * acepta un {@code CASE} dentro de un {@code GROUP BY} —<i>"mismatched input
 * 'WHEN'"</i>—, que es justo lo que el tablero necesita para agrupar por línea.
 * Queda en SQL nativo, que es donde ya estaba, y las dos consultas que la usan
 * son nativas.
 *
 * <p>El caso que hay que entender es el de la reserva, porque una reserva puede
 * ser dos negocios distintos: <b>la línea sale de su tipo de uso</b>. La seña de
 * una clase es plata del curso, y el alquiler de la cabina es otra cosa. Sin ese
 * cruce, todas las señas caerían en la misma bolsa y el tablero diría que el
 * estudio factura por alquiler lo que en realidad cobró por enseñar.
 */
public enum LineaDeNegocio {

    /** Inscripciones y las señas de sus clases. */
    CURSOS,

    /** Alquiler de cabina. */
    ALQUILER_CABINA,

    /** Grabación de set. */
    GRABACION_SET,

    /** Mix &amp; mastering, sea por trabajo o por reserva de sala. */
    MIX_MASTERING,

    /** Venta de equipos: la operación de mostrador, contra el stock de Pioneer. */
    VENTA_EQUIPOS,

    /**
     * Un pago que no apunta a nada.
     *
     * <p>La tabla lo permite —los cuatro destinos son nullable— y el tablero
     * <b>no lo puede esconder</b>: un ingreso sin línea es plata que entró y hay
     * que verla en algún lado, aunque sea para ir a corregir el pago. Si se
     * filtrara, la suma de las líneas no daría la caja y nadie sabría por qué.
     */
    OTRO;

    /**
     * La definición, en JPQL, para pegar dentro de una {@code @Query}.
     *
     * <p><b>Exige tres alias en la consulta que la use</b>, y no puede
     * verificarlos: {@code p} el pago, {@code r} su reserva y {@code tu} el tipo
     * de uso de esa reserva, los dos últimos por {@code LEFT JOIN}. Un pago que
     * no apunta a ninguna reserva tiene que seguir cayendo en su línea; con un
     * INNER desaparecería del listado sin ningún error, que es el modo de falla
     * exacto que {@code mejoras.md} §9.1 documenta para {@code V19}.
     *
     * <p><b>El orden del CASE no es alfabético y importa</b>: los destinos
     * explícitos van antes que la reserva, porque un pago de mastering puede
     * apuntar al trabajo <i>y</i> a la sala donde se hizo. Manda el destino más
     * específico.
     *
     * <p>Es un {@code static final} de un literal, o sea constante en tiempo de
     * compilación: por eso se la puede concatenar dentro de una anotación.
     */
    /**
     * La definición, en SQL, para pegar dentro de una {@code @Query} nativa.
     *
     * <p><b>Exige tres alias en la consulta que la use</b>, y no puede
     * verificarlos: {@code p} el pago, {@code r} su reserva y {@code tu} el tipo
     * de uso de esa reserva, los dos últimos por {@code LEFT JOIN}. Un pago que
     * no apunta a ninguna reserva tiene que seguir cayendo en su línea; con un
     * INNER desaparecería del resultado sin ningún error, que es el modo de falla
     * exacto que {@code mejoras.md} §9.1 documenta para {@code V19}.
     *
     * <p><b>El orden del CASE no es alfabético y importa</b>: los destinos
     * explícitos van antes que la reserva, porque un pago de mastering puede
     * apuntar al trabajo <i>y</i> a la sala donde se hizo. Manda el destino más
     * específico.
     *
     * <p>Es un {@code static final} de un literal, o sea constante en tiempo de
     * compilación: por eso se la puede concatenar dentro de una anotación.
     */
    public static final String EXPRESION = """
            CASE
                WHEN p.id_inscripcion       IS NOT NULL THEN 'CURSOS'
                WHEN p.id_trabajo_mastering IS NOT NULL THEN 'MIX_MASTERING'
                WHEN p.id_venta_equipo      IS NOT NULL THEN 'VENTA_EQUIPOS'
                WHEN tu.codigo = 'ALQUILER_CABINA'      THEN 'ALQUILER_CABINA'
                WHEN tu.codigo = 'GRABACION_SET'        THEN 'GRABACION_SET'
                WHEN tu.codigo = 'MIX_MASTERING'        THEN 'MIX_MASTERING'
                WHEN tu.codigo IS NOT NULL              THEN 'CURSOS'
                ELSE 'OTRO'
            END""";

    /**
     * Los dos {@code LEFT JOIN} que {@link #EXPRESION} necesita para existir.
     *
     * <p>Van juntos con ella y no sueltos en cada consulta por lo mismo que la
     * expresión: si una consulta pega el CASE y se olvida de los joins, no falla
     * —{@code tu.codigo} sería un alias inexistente y ahí sí falla—, pero si los
     * escribe como INNER anda perfecto y <b>pierde filas en silencio</b>.
     */
    public static final String JOINS = """
            LEFT JOIN reserva  r  ON r.id_reserva   = p.id_reserva
            LEFT JOIN tipo_uso tu ON tu.id_tipo_uso = r.id_tipo_uso""";
}
