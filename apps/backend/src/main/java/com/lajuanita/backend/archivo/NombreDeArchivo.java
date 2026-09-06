package com.lajuanita.backend.archivo;

import java.util.Locale;

/**
 * El nombre original de un archivo subido, saneado para poder devolverlo.
 *
 * <p><b>No decide dónde se guarda nada.</b> Eso lo elige {@link Almacenamiento}, y
 * es la regla que ese servicio tiene escrita: <i>el nombre con el que se guarda lo
 * elige el sistema, nunca quien sube</i> — un nombre del cliente puede escaparse
 * de la carpeta, pisar otro archivo sin que ninguna de las dos filas se entere, y
 * traer caracteres que Linux acepta y Windows no, que es justo el cruce de este
 * proyecto.
 *
 * <p>Lo que sí hace es limpiar el texto que <b>vuelve</b>: el nombre original viaja
 * en la cabecera {@code Content-Disposition} de la descarga y viene del cliente.
 * Se queda con el último tramo (un navegador puede mandar la ruta entera), saca lo
 * que no sea alfanumérico, punto, guion o guion bajo, y recorta al largo de la
 * columna.
 *
 * <p>⚠️ <b>Vive acá porque lo usan dos servicios</b> (§14 · C1). Era un método
 * privado de {@code ComprobanteService}, y cuando el egreso necesitó lo mismo la
 * salida corta era copiarlo — que es exactamente la deuda que este proyecto ya
 * paga dos veces y tiene anotada ({@code contarClasesConsumidas} contra `V9` §5,
 * {@code ContratoRepository} contra {@code release_tiene_contrato}). Dos copias de
 * un saneo se despegan sin que nada falle: un lado empieza a aceptar un carácter
 * que el otro rechaza y nadie se entera hasta que una descarga sale rota.
 */
public final class NombreDeArchivo {

    /** Lo que entra en las columnas {@code nombre_original}. */
    private static final int LARGO_MAXIMO = 255;

    /** La descarga tiene que llamarse de alguna manera. */
    private static final String POR_DEFECTO = "comprobante";

    private NombreDeArchivo() {
    }

    public static String sano(String original) {
        if (original == null || original.isBlank()) {
            return POR_DEFECTO;
        }

        String ultimoTramo = original.replace('\\', '/');
        ultimoTramo = ultimoTramo.substring(ultimoTramo.lastIndexOf('/') + 1);

        String limpio = ultimoTramo.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "_");

        if (limpio.isBlank() || limpio.replace("_", "").replace(".", "").isEmpty()) {
            return POR_DEFECTO;
        }
        return limpio.length() > LARGO_MAXIMO ? limpio.substring(0, LARGO_MAXIMO) : limpio;
    }
}
