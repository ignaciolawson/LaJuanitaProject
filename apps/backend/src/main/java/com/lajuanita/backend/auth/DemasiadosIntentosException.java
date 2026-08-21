package com.lajuanita.backend.auth;

/**
 * Se superó el límite de intentos para ese email.
 *
 * <p>No distingue si el email existe: se cuenta y se rechaza igual para una
 * dirección registrada que para una inventada, así el 429 no se convierte en la
 * forma de averiguar quién tiene cuenta — que es justo lo que
 * {@link CredencialesInvalidasException} se esfuerza por evitar.
 */
public class DemasiadosIntentosException extends RuntimeException {

    /** Lo pide {@code Serializable}; estas excepciones no viajan serializadas. */
    private static final long serialVersionUID = 1L;

    public DemasiadosIntentosException() {
        super("Demasiados intentos seguidos. Esperá unos minutos y volvé a probar.");
    }
}
