package com.lajuanita.backend.auth;

/**
 * La contraseña la generó administración y nadie la usó a tiempo.
 *
 * <p>A diferencia de {@link CredencialesInvalidasException}, este mensaje <b>sí</b>
 * dice qué pasó, y no rompe la protección contra enumeración de usuarios: para
 * llegar hasta acá hay que haber acertado la contraseña, así que quien lo lee ya
 * sabe que la cuenta existe. Callarlo solo lograría que la persona correcta
 * reintentara diez veces la contraseña correcta sin entender por qué no entra.
 */
public class PasswordTemporalVencidaException extends RuntimeException {

    /** Lo pide {@code Serializable}; estas excepciones no viajan serializadas. */
    private static final long serialVersionUID = 1L;

    public PasswordTemporalVencidaException() {
        super("Esa contraseña temporal venció. Pedile a administración que te genere una nueva.");
    }
}
