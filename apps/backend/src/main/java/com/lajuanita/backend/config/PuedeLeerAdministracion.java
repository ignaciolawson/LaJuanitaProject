package com.lajuanita.backend.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Puede VER las pantallas de administración: alumnos, reservas, pagos.
 *
 * <p>Incluye a {@code DIRECTIVO}, que lee todo el sistema. Para escribir hace
 * falta {@link PuedeOperar}, que es una lista más corta -- la distinción es de
 * {@code docs/requirements/platform.md} §2.1 y es la razón por la que hay
 * cuatro roles y no tres.
 *
 * <p>Existe como anotación propia y no como un {@code @PreAuthorize} suelto en
 * cada método para que la regla viva en UN lugar. Si mañana cambia quién puede
 * mirar, se cambia acá y no en veinte controllers, que es donde se cuelan las
 * omisiones.
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('ADMIN', 'DIRECTIVO', 'STAFF')")
public @interface PuedeLeerAdministracion {
}
