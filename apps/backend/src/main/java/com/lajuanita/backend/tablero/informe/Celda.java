package com.lajuanita.backend.tablero.informe;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Una celda del informe, <b>con su tipo</b>.
 *
 * <p>Existe por una sola frase del alcance, y es la que define la calidad de
 * toda la exportación (§15, ratificación 8): <i>"Excel de verdad, no un CSV con
 * otro nombre. Si va a haber una sola exportación buena, tiene que abrirse con
 * los tipos bien —fechas como fechas e importes como números— o el primer
 * {@code SUM} que alguien haga da cualquier cosa."</i>
 *
 * <p>Un informe armado con strings ya formateados —{@code "$ 180.000,00"}— se ve
 * perfecto y es inservible: Excel lo guarda como texto, la columna no se suma, y
 * eso se descubre en la reunión de socios. Así que el armado del informe decide
 * <b>qué es</b> cada valor y cada formato decide <b>cómo se escribe</b>.
 *
 * <p>Es también lo que permite que haya <b>un solo armado y dos salidas</b>: el
 * PDF formatea para leer y el Excel escribe tipos, sobre exactamente las mismas
 * celdas. Sin esto, los dos exportadores se escribirían por separado y
 * divergirían — que es la deuda que este proyecto ya paga dos veces y anota cada
 * vez.
 */
public sealed interface Celda {

    /**
     * Un nombre, un estado, una etiqueta.
     *
     * <p>⚠️ <b>El día que se agregue una exportación a CSV, esto necesita
     * escapado y hoy no lo tiene</b> ({@code CS-11} del informe de ciberseguridad
     * de septiembre de 2026). Hoy no hace falta y por eso no está escrito en
     * código: las dos salidas que existen son xlsx con celdas tipadas —POI escribe
     * un texto como texto— y PDF, que no es ejecutable por nadie.
     *
     * <p>Un CSV es otra cosa: Excel y LibreOffice interpretan como <b>fórmula</b>
     * toda celda que empiece con {@code =}, {@code +}, {@code -} o {@code @}, y
     * los valores de este informe salen de campos que carga gente —un nombre, un
     * concepto de egreso, un título de release—. O sea que el contenido de esa
     * celda lo elige alguien de afuera. Prefijar {@code '} ante esos cuatro
     * caracteres es lo único que hace falta, <b>en el escritor del CSV y no acá</b>:
     * hacerlo en la celda ensuciaría el xlsx y el PDF, donde el problema no
     * existe.
     */
    record Texto(String valor) implements Celda {
    }

    /**
     * Plata. Lleva su moneda porque en este sistema los importes no se suman
     * entre monedas (§2.3), y una columna de números sin moneda invita
     * exactamente a eso.
     */
    record Dinero(BigDecimal valor, String moneda) implements Celda {
    }

    /** Un número con decimales que no es plata: horas, un porcentaje. */
    record Numero(BigDecimal valor, String unidad) implements Celda {
    }

    /** Un conteo. */
    record Cantidad(long valor) implements Celda {
    }

    record Fecha(LocalDate valor) implements Celda {
    }

    /**
     * Un valor que no existe, y <b>no es un cero</b>.
     *
     * <p>Lo estrena la tasa de retención cuando nadie cerró todavía su ventana de
     * 10 meses. En pantalla eso se dice con una frase; en una planilla hay que
     * poder distinguirlo de un cero, porque un cero en esa celda se lee como que
     * se fueron todos. Va vacía con su explicación al lado, nunca como 0.
     */
    record SinDato(String porQue) implements Celda {
    }
}
