package com.lajuanita.backend.archivo;

/**
 * El archivo que llegó no se puede guardar, o el que se pide no está.
 *
 * <p>Se traduce a 400. <b>No es {@code SolicitudInvalidaException} aunque termine
 * en el mismo código HTTP</b>: esta la tira una pieza de infraestructura que no
 * sabe nada del negocio, y hacerla depender del paquete {@code usuario} pondría a
 * {@code Almacenamiento} —que existe para ser reemplazable— a importar el dominio.
 *
 * <p>El mensaje lo lee una persona que acaba de arrastrar un archivo a una
 * pantalla, así que dice qué pasó con <b>ese</b> archivo: cuánto pesa y cuánto se
 * aceptaba, no <i>"error al subir"</i>.
 */
public class ArchivoInvalidoException extends RuntimeException {

    /** Lo pide {@code Serializable}; estas excepciones no viajan serializadas. */
    private static final long serialVersionUID = 1L;

    public ArchivoInvalidoException(String mensaje) {
        super(mensaje);
    }
}
