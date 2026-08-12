package com.lajuanita.backend.usuario;

/**
 * Estado de presencia que muestra el portal. No tiene nada que ver con el
 * acceso: quien no puede entrar es el usuario con {@code activo = false}.
 *
 * <p>Coincide con el CHECK {@code usuario_presencia_valida} de
 * {@code V1__baseline.sql}.
 */
public enum EstadoPresencia {
    ACTIVO,
    AUSENTE,
    OCUPADO,
    EN_CLASE
}
