package com.lajuanita.backend.tablero.informe;

import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.text.DecimalFormatSymbols;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;

import com.lajuanita.backend.tablero.dto.Tablero;
import com.lajuanita.backend.tablero.informe.InformeDelTablero.Hoja;

/**
 * El informe como PDF: el que se imprime y se lleva a la reunión.
 *
 * <p><b>Es el mismo informe que el Excel</b> — las dos salidas leen las hojas de
 * {@link InformeDelTablero} y ninguna decide qué mostrar. Lo único que cambia es
 * para qué sirve cada una: el Excel se abre para rehacer una cuenta, el PDF para
 * mirarlo. Por eso acá los números vienen ya formateados y allá vienen tipados.
 *
 * <p>Apaisado y no vertical: la hoja más ancha tiene siete columnas, y una tabla
 * que se parte al medio en un PDF es una tabla que nadie lee.
 *
 * <p>La cabecera de trazabilidad va una sola vez, arriba de todo — a diferencia
 * del Excel, donde se repite por hoja: un PDF no se desarma en pedazos, se manda
 * entero.
 */
public final class TableroEnPdf {

    private static final DateTimeFormatter MOMENTO = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    /** El mismo formato que la cabecera: un documento no escribe la fecha de dos maneras. */
    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private TableroEnPdf() {
    }

    public static byte[] generar(Tablero tablero, Trazabilidad trazabilidad) {
        ByteArrayOutputStream salida = new ByteArrayOutputStream();
        Document documento = new Document(PageSize.A4.rotate(), 36, 36, 36, 48);

        PdfWriter escritor = PdfWriter.getInstance(documento, salida);
        escritor.setPageEvent(new PieDePagina(trazabilidad));

        documento.open();

        Font tituloGrande = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16);
        Font tenue = FontFactory.getFont(FontFactory.HELVETICA, 8, java.awt.Color.DARK_GRAY);
        Font tituloDeHoja = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 11);

        List<String> cabecera = trazabilidad.lineas();
        documento.add(new Paragraph(cabecera.get(0), tituloGrande));
        for (String linea : cabecera.subList(1, cabecera.size())) {
            documento.add(new Paragraph(linea, tenue));
        }

        for (Hoja hoja : InformeDelTablero.hojas(tablero)) {
            Paragraph titulo = new Paragraph(hoja.titulo() + " — " + hoja.alcance(), tituloDeHoja);
            titulo.setSpacingBefore(16);
            titulo.setSpacingAfter(6);
            documento.add(titulo);
            documento.add(tabla(hoja));
        }

        documento.close();
        return salida.toByteArray();
    }

    private static PdfPTable tabla(Hoja hoja) {
        PdfPTable tabla = new PdfPTable(hoja.columnas().size());
        tabla.setWidthPercentage(100);
        // Que el encabezado se repita si la tabla parte de página. Sin esto, la
        // segunda página de la ocupación son ochenta números sin títulos arriba.
        tabla.setHeaderRows(1);

        Font negrita = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 9);
        Font normal = FontFactory.getFont(FontFactory.HELVETICA, 9);

        for (String columna : hoja.columnas()) {
            PdfPCell celda = new PdfPCell(new Phrase(columna, negrita));
            celda.setBackgroundColor(new java.awt.Color(238, 238, 238));
            celda.setPadding(4);
            tabla.addCell(celda);
        }

        for (List<Celda> fila : hoja.filas()) {
            for (Celda valor : fila) {
                PdfPCell celda = new PdfPCell(new Phrase(texto(valor), normal));
                celda.setPadding(4);
                // Los números a la derecha: una columna de importes alineada a la
                // izquierda es ilegible de un vistazo, que es para lo que existe
                // este formato.
                celda.setHorizontalAlignment(esNumero(valor) ? Element.ALIGN_RIGHT : Element.ALIGN_LEFT);
                tabla.addCell(celda);
            }
        }
        return tabla;
    }

    private static boolean esNumero(Celda celda) {
        return celda instanceof Celda.Dinero || celda instanceof Celda.Numero
                || celda instanceof Celda.Cantidad;
    }

    /**
     * En el PDF los números se escriben, no se tipan: es un documento para leer.
     *
     * <p>Formato argentino —punto para los miles, coma para los decimales— con
     * {@code Locale} explícito y no el del servidor: el mismo informe generado en
     * dos máquinas no puede escribir los importes distinto.
     */
    private static String texto(Celda celda) {
        return switch (celda) {
            case Celda.Texto(String valor) -> valor;
            case Celda.Dinero(BigDecimal valor, String moneda) ->
                ("USD".equals(moneda) ? "US$ " : "$ ") + numero(valor);
            case Celda.Numero(BigDecimal valor, String unidad) -> numero(valor) + " " + unidad;
            case Celda.Cantidad(long valor) -> String.valueOf(valor);
            case Celda.Fecha(var valor) -> valor.format(DateTimeFormatter.ofPattern("dd/MM/yyyy"));
            case Celda.SinDato(String porQue) -> "— " + porQue;
        };
    }

    private static String numero(BigDecimal valor) {
        DecimalFormat formato = new DecimalFormat("#,##0.00",
                DecimalFormatSymbols.getInstance(Locale.of("es", "AR")));
        return formato.format(valor);
    }

    /**
     * El pie de cada página, y no es decorado.
     *
     * <p>Un PDF de varias páginas termina fotocopiado, o alguien imprime la hoja
     * que le interesa y la deja sobre la mesa. <b>Esa hoja suelta tiene que poder
     * decir de dónde salió</b>, que es literalmente lo que pide el requisito de
     * trazabilidad. Es la misma razón por la que el Excel repite la cabecera en
     * cada hoja.
     */
    private static final class PieDePagina extends com.lowagie.text.pdf.PdfPageEventHelper {
        private final Trazabilidad trazabilidad;

        private PieDePagina(Trazabilidad trazabilidad) {
            this.trazabilidad = trazabilidad;
        }

        @Override
        public void onEndPage(PdfWriter escritor, Document documento) {
            Font chica = FontFactory.getFont(FontFactory.HELVETICA, 7, java.awt.Color.GRAY);

            String pie = "La Juanita Studio · %s al %s · generado el %s por %s · página %d".formatted(
                    DIA.format(trazabilidad.desde()), DIA.format(trazabilidad.hasta()),
                    MOMENTO.format(trazabilidad.generado()), trazabilidad.quien(),
                    documento.getPageNumber());

            com.lowagie.text.pdf.ColumnText.showTextAligned(
                    escritor.getDirectContent(), Element.ALIGN_CENTER, new Phrase(pie, chica),
                    (documento.left() + documento.right()) / 2, documento.bottom() - 20, 0);
        }
    }
}
