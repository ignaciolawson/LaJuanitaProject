package com.lajuanita.backend.tablero.informe;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.UncheckedIOException;
import java.util.List;

import org.apache.poi.ss.usermodel.BorderStyle;
import org.apache.poi.ss.usermodel.Cell;
import org.apache.poi.ss.usermodel.CellStyle;
import org.apache.poi.ss.usermodel.FillPatternType;
import org.apache.poi.ss.usermodel.Font;
import org.apache.poi.ss.usermodel.IndexedColors;
import org.apache.poi.ss.usermodel.Row;
import org.apache.poi.ss.usermodel.Sheet;
import org.apache.poi.ss.usermodel.Workbook;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;

import com.lajuanita.backend.tablero.dto.Tablero;
import com.lajuanita.backend.tablero.informe.InformeDelTablero.Hoja;

/**
 * El informe como un {@code .xlsx} de verdad.
 *
 * <p><b>"Excel de verdad, no un CSV con otro nombre"</b> es el requisito textual
 * de §15, y lo que lo cumple no es la extensión sino esto: cada celda se escribe
 * con su tipo. Un importe entra como número con formato de moneda, no como el
 * texto {@code "$ 180.000,00"} — con texto la columna no se suma y eso se
 * descubre cuando alguien intenta sumarla, en la reunión.
 *
 * <p><b>Una hoja por indicador, y la cabecera de trazabilidad repetida en cada
 * una.</b> Repetirla parece redundante hasta que uno piensa qué le pasa a este
 * archivo: alguien copia la hoja "Caja" a otro libro y la manda por mail. Sin la
 * cabecera adentro, esa hoja pierde el período, la fecha y quién la generó — y
 * ahí es donde nace la planilla que nadie puede explicar. Son tres filas.
 *
 * <p>Cada hoja lleva además su <b>alcance</b> al lado del título, porque la
 * distinción entre "del período" y "al día de hoy" no sobrevive fuera de la
 * pantalla que la explicaba.
 */
public final class TableroEnExcel {

    private TableroEnExcel() {
    }

    public static byte[] generar(Tablero tablero, Trazabilidad trazabilidad) {
        try (Workbook libro = new XSSFWorkbook(); ByteArrayOutputStream salida = new ByteArrayOutputStream()) {

            Estilos estilos = new Estilos(libro);

            for (Hoja hoja : InformeDelTablero.hojas(tablero)) {
                escribir(libro, hoja, trazabilidad, estilos);
            }

            libro.write(salida);
            return salida.toByteArray();
        } catch (IOException e) {
            // Se escribe en memoria: un IOException acá no es un archivo que no
            // se pudo abrir, es que no hay memoria o que POI se rompió. No hay
            // nada que reintentar ni nada útil que decirle a la persona.
            throw new UncheckedIOException("No se pudo generar el Excel del tablero.", e);
        }
    }

    private static void escribir(Workbook libro, Hoja hoja, Trazabilidad trazabilidad, Estilos estilos) {
        Sheet planilla = libro.createSheet(nombreValido(hoja.titulo()));
        int fila = 0;

        // -- La cabecera de trazabilidad, en cada hoja ------------------------
        celdaDeTexto(planilla.createRow(fila++), 0, hoja.titulo() + " — " + hoja.alcance(), estilos.titulo);
        for (String linea : trazabilidad.lineas()) {
            celdaDeTexto(planilla.createRow(fila++), 0, linea, estilos.tenue);
        }
        fila++;

        // -- Los encabezados de columna ---------------------------------------
        Row encabezado = planilla.createRow(fila++);
        for (int columna = 0; columna < hoja.columnas().size(); columna++) {
            celdaDeTexto(encabezado, columna, hoja.columnas().get(columna), estilos.encabezado);
        }

        // -- Los datos ---------------------------------------------------------
        for (List<Celda> datos : hoja.filas()) {
            Row renglon = planilla.createRow(fila++);
            for (int columna = 0; columna < datos.size(); columna++) {
                escribirCelda(renglon.createCell(columna), datos.get(columna), estilos);
            }
        }

        for (int columna = 0; columna < hoja.columnas().size(); columna++) {
            planilla.autoSizeColumn(columna);
        }
        // La fila del encabezado queda fija: una planilla de ocupación tiene
        // setenta filas y sin esto se scrollea a ciegas.
        planilla.createFreezePane(0, fila - hoja.filas().size());
    }

    private static void escribirCelda(Cell celda, Celda valor, Estilos estilos) {
        switch (valor) {
            case Celda.Texto(String texto) -> celda.setCellValue(texto);

            case Celda.Dinero(var monto, var moneda) -> {
                celda.setCellValue(monto.doubleValue());
                celda.setCellStyle("USD".equals(moneda) ? estilos.dolares : estilos.pesos);
            }
            case Celda.Numero(var numero, var unidad) -> {
                celda.setCellValue(numero.doubleValue());
                celda.setCellStyle("%".equals(unidad) ? estilos.porcentaje : estilos.decimal);
            }
            case Celda.Cantidad(long cantidad) -> celda.setCellValue(cantidad);

            case Celda.Fecha(var fecha) -> {
                celda.setCellValue(fecha);
                celda.setCellStyle(estilos.fecha);
            }
            // Vacía, con el motivo al lado. Un cero acá mentiría: ver Celda.SinDato.
            case Celda.SinDato(String porQue) -> {
                celda.setCellValue("— " + porQue);
                celda.setCellStyle(estilos.tenue);
            }
        }
    }

    private static void celdaDeTexto(Row fila, int columna, String texto, CellStyle estilo) {
        Cell celda = fila.createCell(columna);
        celda.setCellValue(texto);
        celda.setCellStyle(estilo);
    }

    /**
     * Excel rechaza nombres de hoja de más de 31 caracteres y con
     * {@code : \ / ? * [ ]}.
     *
     * <p>Los títulos de acá son cortos y ninguno los tiene, así que esto no
     * arregla nada hoy: existe para que agregar un indicador con dos puntos en el
     * nombre no reviente la exportación entera con un error que no habla del
     * título.
     */
    private static String nombreValido(String titulo) {
        String limpio = titulo.replaceAll("[:\\\\/?*\\[\\]]", " ");
        return limpio.length() > 31 ? limpio.substring(0, 31) : limpio;
    }

    /**
     * Los estilos se crean UNA vez por libro.
     *
     * <p>No es microoptimización: un {@code CellStyle} por celda hace que Excel
     * abra el archivo con miles de estilos y, pasado el límite de 64.000, POI
     * directamente falla. Con setenta filas de ocupación por hoja se llega antes
     * de lo que parece.
     */
    private static final class Estilos {
        private final CellStyle titulo;
        private final CellStyle tenue;
        private final CellStyle encabezado;
        private final CellStyle pesos;
        private final CellStyle dolares;
        private final CellStyle decimal;
        private final CellStyle porcentaje;
        private final CellStyle fecha;

        private Estilos(Workbook libro) {
            Font negrita = libro.createFont();
            negrita.setBold(true);

            titulo = libro.createCellStyle();
            titulo.setFont(negrita);

            Font chica = libro.createFont();
            chica.setItalic(true);
            chica.setColor(IndexedColors.GREY_50_PERCENT.getIndex());
            tenue = libro.createCellStyle();
            tenue.setFont(chica);

            encabezado = libro.createCellStyle();
            encabezado.setFont(negrita);
            encabezado.setBorderBottom(BorderStyle.THIN);
            encabezado.setFillForegroundColor(IndexedColors.GREY_25_PERCENT.getIndex());
            encabezado.setFillPattern(FillPatternType.SOLID_FOREGROUND);

            // Los formatos numéricos son de Excel, no strings ya formateados: la
            // columna se suma y el separador lo pone el Excel de quien la abre.
            pesos = conFormato(libro, "\"$\" #,##0.00");
            dolares = conFormato(libro, "\"US$\" #,##0.00");
            decimal = conFormato(libro, "#,##0.00");
            porcentaje = conFormato(libro, "0.0\"%\"");
            fecha = conFormato(libro, "dd/mm/yyyy");
        }

        private static CellStyle conFormato(Workbook libro, String formato) {
            CellStyle estilo = libro.createCellStyle();
            estilo.setDataFormat(libro.createDataFormat().getFormat(formato));
            return estilo;
        }
    }
}
