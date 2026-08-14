package com.lajuanita.backend.usuario;

import java.security.SecureRandom;

import org.springframework.stereotype.Component;

/**
 * Genera las contraseñas temporales del alta por administración.
 *
 * <p>El alfabeto excluye a propósito los caracteres que se confunden al leerlos:
 * {@code O} y {@code 0}, {@code l}, {@code I} y {@code 1}. Esta contraseña la va
 * a copiar Micaela a un WhatsApp y la va a tipear alguien mirando la pantalla
 * del celular; una {@code l} confundida con un {@code 1} es un llamado a
 * administración.
 *
 * <p>Se usa {@link SecureRandom} y no {@code Math.random()}: es una credencial,
 * aunque dure poco.
 */
@Component
public class GeneradorDePassword {

    private static final String ALFABETO = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
    private static final int LARGO = 10;

    private final SecureRandom azar = new SecureRandom();

    public String generar() {
        StringBuilder password = new StringBuilder(LARGO);
        for (int i = 0; i < LARGO; i++) {
            password.append(ALFABETO.charAt(azar.nextInt(ALFABETO.length())));
        }
        return password.toString();
    }
}
