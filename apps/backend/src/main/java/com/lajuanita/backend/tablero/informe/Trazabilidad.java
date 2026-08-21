package com.lajuanita.backend.tablero.informe;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;

/**
 * De dónde salió este archivo: qué filtros, cuándo y quién.
 *
 * <p><b>Es el requisito central de la exportación</b>, y el que —dice el propio
 * alcance— casi siempre se olvida (§15, ratificación 8): <i>"cada archivo
 * exportado dice qué filtros lo generaron, cuándo y quién lo pidió. Sin eso, dos
 * exportaciones del mismo tablero con un mes de diferencia son dos planillas que
 * no se pueden comparar ni explicar — y ese archivo va a terminar en una reunión
 * de socios, que es el único lugar donde importa poder decir de dónde salió cada
 * número."</i>
 *
 * <p><b>La cabecera se arma acá una sola vez y la usan los dos formatos.</b> Si
 * cada exportador escribiera la suya, en algún momento el PDF diría el período y
 * el Excel no, y nadie se enteraría hasta que alguien comparara los dos archivos
 * en una reunión.
 *
 * <p>Y una línea que parece de más y no lo es: <b>la aclaración de que no todos
 * los indicadores son del período</b>. En pantalla eso se dice al lado de cada
 * bloque; en un archivo, quien lo abre tres meses después no tiene esa pantalla
 * — vería "cobros pendientes" bajo un título que dice "agosto" y concluiría que
 * esa deuda se generó en agosto.
 */
public record Trazabilidad(
        LocalDate desde,
        LocalDate hasta,
        /** El nombre de la sala si se filtró por una, o {@code null}. */
        String sala,
        LocalDateTime generado,
        String quien) {

    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter MOMENTO = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    /** Las líneas de la cabecera, en orden, para escribirlas donde sea. */
    public List<String> lineas() {
        return List.of(
                "Tablero de dirección — La Juanita Studio",
                "Período: " + DIA.format(desde) + " al " + DIA.format(hasta),
                "Sala: " + (sala == null ? "todas" : sala),
                "Generado: " + MOMENTO.format(generado) + " por " + quien,
                "Los indicadores marcados «al día de hoy» no dependen del período: "
                        + "son la foto del " + DIA.format(generado.toLocalDate()) + ".");
    }

    /**
     * El nombre del archivo, con el período adentro.
     *
     * <p>Es estático porque el nombre depende solo del período, y el controller
     * lo necesita sin haber armado la cabecera —que además requiere ir a la base
     * a buscar quién pide y cómo se llama la sala.
     *
     * <p>Dos exportaciones distintas no pueden llamarse igual: al segundo archivo
     * el navegador le agrega "(1)" y en la carpeta de alguien quedan dos planillas
     * indistinguibles. El período en el nombre es lo que las diferencia sin tener
     * que abrirlas.
     */
    public static String nombreDeArchivo(LocalDate desde, LocalDate hasta, String extension) {
        return "tablero-%s-a-%s.%s".formatted(desde, hasta, extension);
    }
}
