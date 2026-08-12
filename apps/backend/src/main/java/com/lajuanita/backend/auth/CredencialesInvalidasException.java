package com.lajuanita.backend.auth;

/**
 * Se lanza cuando el login no procede, por CUALQUIERA de sus tres motivos: el
 * email no existe, la contraseña no coincide, o el usuario está dado de baja.
 *
 * <p>Es una sola excepción con un solo mensaje a propósito. Distinguir "ese
 * mail no existe" de "esa contraseña está mal" le regala a cualquiera una
 * forma de averiguar quién tiene cuenta en el sistema probando mails.
 */
public class CredencialesInvalidasException extends RuntimeException {

    public CredencialesInvalidasException() {
        super("Email o contraseña incorrectos.");
    }
}
