package com.lajuanita.backend.auth;

/**
 * La credencial está bien firmada y vigente, pero no sirve para identificar a
 * nadie: el {@code sub} no es un id de usuario, ese usuario ya no existe, o
 * fue dado de baja después de que se emitió el token.
 *
 * <p>Es distinta de {@link CredencialesInvalidasException}, que es para el
 * login. Antes estos casos reusaban aquella y respondían "Email o contraseña
 * incorrectos" a un pedido que no traía ni email ni contraseña.
 */
public class SesionInvalidaException extends RuntimeException {

    /** Lo pide {@code Serializable}; estas excepciones no viajan serializadas. */
    private static final long serialVersionUID = 1L;

    public SesionInvalidaException() {
        super("Tu sesión ya no es válida. Volvé a entrar.");
    }
}
