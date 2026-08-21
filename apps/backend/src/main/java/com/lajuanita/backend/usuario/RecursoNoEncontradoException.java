package com.lajuanita.backend.usuario;

/** No existe la fila pedida. Se traduce a 404. */
public class RecursoNoEncontradoException extends RuntimeException {

    /** Lo pide {@code Serializable}; estas excepciones no viajan serializadas. */
    private static final long serialVersionUID = 1L;

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
