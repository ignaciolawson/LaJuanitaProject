package com.lajuanita.backend.usuario;

/**
 * El rol alcanza para llegar al endpoint, pero esta operación puntual sobre
 * este objetivo concreto no está permitida.
 *
 * <p>Se distingue de lo que resuelve un {@code @PreAuthorize}: aquello depende
 * solo de quién sos, esto depende de <em>sobre quién</em> estás operando (un
 * STAFF editando a un ADMIN, alguien desactivándose a sí mismo). Se traduce a
 * 403, igual que un permiso insuficiente, porque para el cliente es lo mismo:
 * no podés hacerlo.
 */
public class OperacionNoPermitidaException extends RuntimeException {

    public OperacionNoPermitidaException(String mensaje) {
        super(mensaje);
    }
}
