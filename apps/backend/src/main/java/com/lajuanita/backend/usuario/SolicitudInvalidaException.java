package com.lajuanita.backend.usuario;

/**
 * El cuerpo del pedido es sintácticamente válido pero no tiene sentido: por
 * ejemplo, un alta de alumno que manda a la vez un usuario existente y uno
 * nuevo, o una inscripción de mentoría sin decir cuántas clases son. Se traduce
 * a 400.
 *
 * <p>Es lo que Bean Validation no puede expresar: reglas que cruzan varios
 * campos entre sí.
 *
 * <p><b>Vive acá y no en {@code alumno}, que es donde nació</b>, por lo mismo que
 * {@link RecursoNoEncontradoException} y {@link DatoDuplicadoException}: no es
 * de ningún módulo en particular. Se mudó al aparecer el segundo módulo que la
 * necesita ({@code inscripcion}) — dejarla en {@code alumno} obligaba a cada
 * módulo nuevo a importar el paquete de otro para tirar un 400.
 */
public class SolicitudInvalidaException extends RuntimeException {

    /** Lo pide {@code Serializable}; estas excepciones no viajan serializadas. */
    private static final long serialVersionUID = 1L;

    public SolicitudInvalidaException(String mensaje) {
        super(mensaje);
    }
}
