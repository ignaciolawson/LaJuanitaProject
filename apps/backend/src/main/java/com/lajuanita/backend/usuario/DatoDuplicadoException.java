package com.lajuanita.backend.usuario;

import lombok.Getter;

/**
 * Ya existe alguien con ese email o ese teléfono.
 *
 * <p>Lleva el nombre del campo para que el formulario pueda marcar el input
 * equivocado en vez de mostrar un cartel general.
 *
 * <p><b>Decisión consciente:</b> este mensaje le confirma a quien pregunta que
 * esa dirección tiene cuenta, y eso deshace en el registro la protección contra
 * enumeración que sí tiene el login. Se eligió igual, porque la alternativa deja
 * trabada a la persona que se registró hace meses y no se acuerda: no puede
 * entrar ni registrarse de nuevo, y no entiende por qué. Lo que se filtra acá es
 * "esta dirección tiene cuenta en un estudio de música de Pilar", que es
 * información de sensibilidad baja. El mensaje empuja a iniciar sesión, no se
 * limita a rechazar.
 */
@Getter
public class DatoDuplicadoException extends RuntimeException {

    /** Lo pide {@code Serializable}; estas excepciones no viajan serializadas. */
    private static final long serialVersionUID = 1L;

    /** `email` o `telefono`: el nombre del campo tal cual lo manda el formulario. */
    private final String campo;

    public DatoDuplicadoException(String campo, String mensaje) {
        super(mensaje);
        this.campo = campo;
    }

    public static DatoDuplicadoException email() {
        return new DatoDuplicadoException("email",
                "Ya existe una cuenta con ese email. Iniciá sesión, o pedile a administración que te resetee la contraseña.");
    }

    public static DatoDuplicadoException telefono() {
        return new DatoDuplicadoException("telefono",
                "Ya existe una cuenta con ese teléfono.");
    }
}
