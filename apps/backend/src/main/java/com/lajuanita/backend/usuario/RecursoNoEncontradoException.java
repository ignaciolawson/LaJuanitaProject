package com.lajuanita.backend.usuario;

/** No existe la fila pedida. Se traduce a 404. */
public class RecursoNoEncontradoException extends RuntimeException {

    public RecursoNoEncontradoException(String mensaje) {
        super(mensaje);
    }
}
