package com.lajuanita.backend.archivo;

import java.util.Arrays;

/**
 * Los tipos que el sistema acepta, reconocidos <b>por su contenido</b>.
 *
 * <p><b>La extensión y el {@code Content-Type} los elige quien sube y no prueban
 * nada.</b> Renombrar un ejecutable a {@code contrato.pdf} cuesta un segundo, y el
 * {@code Content-Type} del multipart lo escribe el cliente HTTP. Estos archivos se
 * vuelven a servir después —un contrato se abre en el navegador de otra persona—
 * así que lo que se guarda tiene que ser lo que dice ser. Los primeros bytes sí
 * los pone el programa que generó el archivo.
 *
 * <p>No es un antivirus y no pretende serlo: un PDF puede ser un PDF y aun así
 * traer algo adentro. Lo que cierra es el escalón de abajo, que es el que se cruza
 * sin querer y también a propósito.
 *
 * <p><b>La extensión guardada sale de acá, no del nombre original</b>, que es lo
 * que hace que un {@code .pdf.exe} no pueda llegar al disco con ese nombre.
 */
public enum TipoDeArchivo {

    /** {@code %PDF}. Contratos y comprobantes. */
    PDF("pdf", "application/pdf", new byte[] { 0x25, 0x50, 0x44, 0x46 }),

    /** El encabezado PNG completo, incluidos los bytes que detectan transferencias corruptas. */
    PNG("png", "image/png",
            new byte[] { (byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A }),

    /** JPEG: {@code FF D8 FF}. Portadas y comprobantes fotografiados. */
    JPEG("jpg", "image/jpeg", new byte[] { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF });

    private final String extension;
    private final String contentType;
    private final byte[] firma;

    TipoDeArchivo(String extension, String contentType, byte[] firma) {
        this.extension = extension;
        this.contentType = contentType;
        this.firma = firma;
    }

    public String extension() {
        return extension;
    }

    public String contentType() {
        return contentType;
    }

    /**
     * Qué tipo es este contenido, o {@code null} si no es ninguno de los tres.
     *
     * <p>Recibe solo los primeros bytes: no hace falta —ni conviene— tener el
     * archivo entero en memoria para mirarle el encabezado.
     */
    public static TipoDeArchivo reconocer(byte[] encabezado) {
        for (TipoDeArchivo tipo : values()) {
            if (encabezado.length >= tipo.firma.length
                    && Arrays.equals(encabezado, 0, tipo.firma.length, tipo.firma, 0, tipo.firma.length)) {
                return tipo;
            }
        }
        return null;
    }

    /** Cuántos bytes hay que leer para poder reconocer cualquiera de los tres. */
    public static int bytesNecesarios() {
        return Arrays.stream(values()).mapToInt(t -> t.firma.length).max().orElseThrow();
    }

    /** Para el mensaje de error, que lo lee una persona. */
    public static String aceptados() {
        return "PDF, PNG o JPG";
    }
}
