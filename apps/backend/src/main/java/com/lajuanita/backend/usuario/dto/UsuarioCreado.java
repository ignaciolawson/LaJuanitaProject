package com.lajuanita.backend.usuario.dto;

/**
 * Respuesta del alta hecha por administración.
 *
 * <p>{@link #passwordTemporal} es <b>la única vez</b> que esa contraseña existe
 * en texto plano en todo el sistema: se genera, se hashea para guardarla y se
 * devuelve acá para que Micaela la copie al WhatsApp. No se guarda en ningún
 * lado ni se puede volver a consultar. Si se pierde, se genera otra.
 *
 * <p>Por eso mismo esta respuesta no debería quedar en logs.
 */
public record UsuarioCreado(
        UsuarioResumen usuario,
        String passwordTemporal) {
}
