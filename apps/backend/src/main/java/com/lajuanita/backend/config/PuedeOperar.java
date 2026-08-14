package com.lajuanita.backend.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Puede MODIFICAR datos de administración: crear y editar alumnos, cargar
 * pagos, mover reservas.
 *
 * <p><b>{@code DIRECTIVO} queda deliberadamente afuera.</b> Los socios ven todo
 * el sistema y no escriben nada; es una regla del negocio, no un descuido
 * (`docs/requirements/platform.md` §2.1). Si alguien la "arregla" agregando
 * DIRECTIVO acá, los tests de la matriz de permisos fallan.
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('ADMIN', 'STAFF')")
public @interface PuedeOperar {
}
