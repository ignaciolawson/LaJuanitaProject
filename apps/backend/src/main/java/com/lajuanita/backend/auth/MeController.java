package com.lajuanita.backend.auth;

import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * "¿Quién soy?". El front llama esto al arrancar (o al recuperar un token de
 * {@code localStorage}) y con la respuesta arma el menú del portal. Nada del
 * menú está hardcodeado del lado del cliente.
 */
@RestController
public class MeController {

    private final SesionService sesiones;

    public MeController(SesionService sesiones) {
        this.sesiones = sesiones;
    }

    @GetMapping("/api/me")
    public UsuarioActual me(@AuthenticationPrincipal Jwt token) {
        // El `sub` lo escribió TokenService con el id del usuario, y la firma ya
        // fue verificada por Spring antes de llegar acá. Aun así se pasa como
        // texto: convertirlo con Long.valueOf() en esta línea hacía que un token
        // con un `sub` no numérico reventara con un 500.
        return sesiones.describirPorSubject(token.getSubject());
    }
}
