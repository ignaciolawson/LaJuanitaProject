package com.lajuanita.backend.solicitante.dto;

import com.lajuanita.backend.usuario.dto.UsuarioResumen;

/**
 * Lo que devuelve convertir una ficha en una cuenta.
 *
 * <p>Trae las tres cosas que la pantalla necesita para cerrar el trámite de una
 * sola vez: la ficha ya resuelta, la cuenta, y —cuando la cuenta se acaba de
 * crear— <b>la contraseña temporal</b>.
 *
 * <p>{@link #passwordTemporal} es {@code null} cuando la persona <b>ya tenía
 * cuenta</b>, que es el otro camino de la conversión. No es un dato que falte:
 * es la diferencia entre "copiá esto y mandáselo por WhatsApp" y "ya tiene su
 * contraseña, no le mandes nada". Una pantalla que muestre un campo vacío ahí
 * está contando mal lo que pasó.
 *
 * <p>Cuando no es null, vale lo mismo que en {@code UsuarioCreado}: es la única
 * vez que esa contraseña existe en texto plano en todo el sistema, no se guarda
 * en ningún lado y no se puede volver a consultar. Si se pierde, se emite otra
 * desde la pantalla de personas.
 */
public record ConversionRealizada(
        SolicitanteResumen solicitante,
        UsuarioResumen usuario,
        String passwordTemporal,
        /**
         * Si la cuenta se creó recién. Se manda explícito y no se deduce de que
         * {@code passwordTemporal} no sea null: son dos hechos distintos, y el día
         * que exista un tercer camino —vincular a mano una cuenta elegida— el que
         * deduce se equivoca en silencio.
         */
        boolean cuentaNueva) {
}
