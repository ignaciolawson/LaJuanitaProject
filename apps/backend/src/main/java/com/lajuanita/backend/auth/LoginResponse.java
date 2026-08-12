package com.lajuanita.backend.auth;

import java.time.Instant;

/**
 * Respuesta de un login exitoso.
 *
 * <p>Incluye el {@link #usuario} completo y no solo el token para que la
 * pantalla de login no tenga que llamar a {@code /api/me} inmediatamente
 * después: con esta única respuesta ya puede dibujar el menú.
 *
 * @param token    la credencial firmada, a mandar como {@code Authorization: Bearer <token>}
 * @param expiraEn cuándo deja de valer; el front la usa para desloguear solo
 */
public record LoginResponse(
        String token,
        Instant expiraEn,
        UsuarioActual usuario) {
}
