package com.lajuanita.backend.config;

import java.lang.annotation.ElementType;
import java.lang.annotation.Retention;
import java.lang.annotation.RetentionPolicy;
import java.lang.annotation.Target;

import org.springframework.security.access.prepost.PreAuthorize;

/**
 * Ve el tablero de dirección <b>entero</b>: {@code ADMIN} y {@code DIRECTIVO}.
 *
 * <p>Es la tercera anotación de rol del sistema y la única que deja afuera a
 * {@code STAFF}. Sale de {@code docs/requirements/platform.md} §11 —
 * <i>"acceso completo solo DIRECTIVO y ADMIN; STAFF ve el resumen financiero
 * básico"</i>— y es <b>la razón concreta por la que este proyecto tiene cuatro
 * roles y no tres</b>: es el único lugar del sistema donde la línea no se traza
 * entre leer y escribir, sino entre dos clases de administrador.
 *
 * <p><b>Que STAFF vea menos NO se implementa devolviendo menos.</b> El resumen
 * básico es <i>otro endpoint</i> ({@code GET /api/tablero/resumen}), no el mismo
 * contestando distinto según quién pregunte. Es la misma propiedad que el
 * Módulo 4 se impuso al construir el portal: <b>ningún endpoint cambia de
 * significado según quién lo llame</b>. Un endpoint que devuelve más o menos
 * campos según el rol es imposible de leer en un test —hay que montar dos
 * usuarios para saber qué contesta— y el día que alguien agregue un indicador
 * nuevo, el filtro por rol es exactamente lo que se olvida.
 *
 * <p>{@code DIRECTIVO} entra acá y sigue sin poder escribir nada: el tablero es
 * de solo lectura, así que no hay tensión con {@link PuedeOperar}.
 */
@Target({ ElementType.METHOD, ElementType.TYPE })
@Retention(RetentionPolicy.RUNTIME)
@PreAuthorize("hasAnyRole('ADMIN', 'DIRECTIVO')")
public @interface PuedeVerElTableroCompleto {
}
