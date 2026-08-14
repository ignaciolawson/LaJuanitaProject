package com.lajuanita.backend.alumno;

/**
 * El cuerpo del pedido es sintácticamente válido pero no tiene sentido: por
 * ejemplo, un alta de alumno que manda a la vez un usuario existente y uno
 * nuevo. Se traduce a 400.
 *
 * <p>Es lo que Bean Validation no puede expresar: reglas que cruzan varios
 * campos entre sí.
 */
public class SolicitudInvalidaException extends RuntimeException {

    public SolicitudInvalidaException(String mensaje) {
        super(mensaje);
    }
}
