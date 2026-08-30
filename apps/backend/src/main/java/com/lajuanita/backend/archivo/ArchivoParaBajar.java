package com.lajuanita.backend.archivo;

import org.springframework.core.io.Resource;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;

/**
 * Un archivo listo para contestar un {@code GET}: el contenido, cómo se llama y
 * qué es.
 *
 * <p><b>Existe para que el controller no tenga que deducir el tipo.</b>
 * {@code ContratoController} —el primero que sirvió un archivo— responde siempre
 * {@code application/pdf} y siempre {@code .pdf}, y eso alcanzaba mientras el
 * único archivo del sistema fuera un contrato escaneado. Los comprobantes rompen
 * el supuesto: la mitad son fotos de una transferencia sacadas con el teléfono, y
 * contestarlas como PDF hace que el navegador baje un archivo que después no abre
 * nada. Quién sabe de qué tipo es el archivo es la capa que tiene la clave, no el
 * controller.
 *
 * @param contenido   lo que devolvió {@link Almacenamiento#leer}
 * @param nombre      con el que se baja, ya saneado
 * @param contentType el real, deducido de la clave que escribió el sistema
 */
public record ArchivoParaBajar(Resource contenido, String nombre, String contentType) {

    /** El genérico, para una clave sin extensión conocida. Ver {@code TipoDeArchivo.porClave}. */
    public static final String TIPO_DESCONOCIDO = "application/octet-stream";

    public static ArchivoParaBajar de(Resource contenido, String nombre, String clave) {
        TipoDeArchivo tipo = TipoDeArchivo.porClave(clave);
        return new ArchivoParaBajar(contenido, nombre,
                tipo == null ? TIPO_DESCONOCIDO : tipo.contentType());
    }

    /**
     * La respuesta HTTP, armada una sola vez para los dos lados que la contestan
     * —administración y el portal—, que bajan el mismo archivo con distinto
     * permiso.
     *
     * <p>{@code inline} y no {@code attachment}: se abre en el visor del navegador,
     * que es lo que uno quiere al chequear si el comprobante adjunto es el correcto.
     * El nombre viaja igual, para cuando lo bajen.
     */
    public ResponseEntity<Resource> comoRespuesta() {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.inline().filename(nombre).build().toString())
                .body(contenido);
    }
}
