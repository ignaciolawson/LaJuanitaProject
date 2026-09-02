package com.lajuanita.backend.tablero;

import java.util.ArrayList;
import java.util.List;

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

    /**
     * Cómo se agrupan las líneas en las solapas de {@code /admin/pagos}
     * (`mejoras.md` §13 · B2, P47).
     *
     * <p>Ignacio pidió tres —programas, servicios y venta de equipos— y son
     * <b>cuatro</b>. La cuarta es {@link #SIN_DESTINO} y <b>no se puede
     * esconder</b>: un pago que no apunta a nada es plata que entró, y filtrarlo
     * haría que la suma de las solapas no dé la caja, sin que nadie pueda ver por
     * qué. Es el mismo argumento que ya está escrito en {@link LineaDeNegocio#OTRO}
     * para el tablero. La pantalla la dibuja sólo cuando tiene filas.
     *
     * <p><b>Esto es lo ÚNICO nuevo de §13 · B2 del lado de la deducción.</b> La
     * línea de cada pago la sigue decidiendo {@link #EXPRESION}, que es la misma
     * que usa el tablero; acá sólo se dice qué líneas viajan juntas. Escribir el
     * agrupamiento como una segunda deducción —"programas es inscripción o una
     * reserva que no sea alquiler ni grabación"— sería la copia que §12 · B1 vino
     * a evitar, y la que después se desincroniza sin que nada falle: el mismo pago
     * caería en una solapa en el listado y en otra línea en el tablero.
     */
    public enum Grupo {

        PROGRAMAS(CURSOS),
        SERVICIOS(ALQUILER_CABINA, GRABACION_SET, MIX_MASTERING),
        EQUIPOS(VENTA_EQUIPOS),
        SIN_DESTINO(OTRO);

        private final List<String> lineas;

        Grupo(LineaDeNegocio... lineas) {
            List<String> nombres = new ArrayList<>();
            for (LineaDeNegocio linea : lineas) {
                nombres.add(linea.name());
            }
            this.lineas = List.copyOf(nombres);
        }

        /**
         * Los nombres de las líneas de este grupo, para el {@code IN} de la
         * consulta. Son {@code String} y no el enum porque del otro lado está
         * {@link #EXPRESION}, que devuelve texto.
         */
        public List<String> lineas() {
            return lineas;
        }

        /**
         * En qué solapa cae una línea.
         *
         * <p><b>Existe para que la pantalla no tenga que saber el agrupamiento.</b>
         * La barra de solapas recibe una fila por línea y tiene que sumarlas por
         * grupo; si el mapa viviera también en el front, sería la misma copia que
         * §12 · B1 vino a evitar, con una consecuencia concreta y silenciosa: una
         * solapa mostrando un número que no coincide con lo que lista, porque
         * cuenta con un mapa y filtra con el otro.
         *
         * <p>Una línea que no esté en ningún grupo cae en {@link #SIN_DESTINO}, que
         * es lo mismo que hace {@link #EXPRESION} con un pago que no apunta a nada.
         * Es el default correcto: aparece en algún lado en vez de desaparecer.
         */
        public static Grupo de(String linea) {
            for (Grupo grupo : values()) {
                if (grupo.lineas.contains(linea)) {
                    return grupo;
                }
            }
            return SIN_DESTINO;
        }
    }
}
