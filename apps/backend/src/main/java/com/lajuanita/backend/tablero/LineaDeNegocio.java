package com.lajuanita.backend.tablero;

/**
 * A qué línea de negocio pertenece una plata que entró.
 *
 * <p>§11 pide los ingresos del período <i>"por línea de negocio"</i>, y esa
 * línea <b>no es una columna de {@code pago}</b>: se deduce de a qué apunta el
 * pago. La tabla tiene cuatro destinos posibles —inscripción, reserva, trabajo
 * de mastering, venta de equipos— y de a uno por vez.
 *
 * <p><b>La deducción está escrita una sola vez, en SQL</b>
 * ({@code TableroRepository#ingresosPorLinea}), y este enum solo nombra el
 * resultado. Escribirla también en Java sería la tercera copia de una
 * definición en este proyecto, y las dos que ya existen están anotadas como
 * deuda: {@code contarClasesConsumidas} contra {@code V9} §5, y
 * {@code queRespaldanAlRelease} contra {@code release_tiene_contrato()}.
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
    OTRO
}
