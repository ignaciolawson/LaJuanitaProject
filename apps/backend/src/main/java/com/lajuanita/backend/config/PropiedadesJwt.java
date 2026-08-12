package com.lajuanita.backend.config;

import java.time.Duration;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

/**
 * Parámetros de la credencial firmada.
 *
 * <p>Lleva {@link Validated} y no solo las anotaciones de Bean Validation: sin
 * él, {@code @NotBlank} y {@code @NotNull} acá son decorativos. Spring solo
 * valida un {@code @ConfigurationProperties} si la clase está marcada, y una
 * propiedad mal puesta arrancaría igual para explotar más tarde.
 *
 * @param secreto  clave de firma HMAC en Base64. Tiene que dar al menos 32
 *                 bytes al decodificar (HS256 lo exige). En producción llega
 *                 por variable de entorno {@code JWT_SECRET}; el valor del
 *                 archivo es solo para desarrollo.
 * @param duracion cuánto vale el token desde que se emite.
 * @param emisor   el claim {@code iss}. Se firma con él y se exige al validar,
 *                 así un token de otro sistema que compartiera la clave por
 *                 accidente igual no entra.
 */
@Validated
@ConfigurationProperties(prefix = "lajuanita.jwt")
public record PropiedadesJwt(

        @NotBlank String secreto,

        @NotNull Duration duracion,

        @NotBlank String emisor) {
}
