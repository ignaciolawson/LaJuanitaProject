package com.lajuanita.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

/**
 * "¿Quién soy?" y lo que puedo cambiar de mí mismo.
 *
 * <p>El front llama {@code /api/me} al arrancar (o al recuperar un token de
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

    /**
     * Cambiar la propia contraseña.
     *
     * <p>No exige ningún rol: es de todos sobre sí mismos. Y no puede tocar la
     * de otro -- el id sale del token, nunca de la URL ni del cuerpo.
     *
     * <p>Es además la única salida del estado {@code debeCambiarPassword}, en el
     * que quedan las cuentas que creó administración.
     */
    /**
     * Cambiar los propios datos: nombre, apellido y teléfono.
     *
     * <p>Como {@link #cambiarPassword}, no exige rol y no puede tocar a otro —
     * el id sale del token. Devuelve el {@link UsuarioActual} completo para que
     * el front actualice el encabezado sin volver a pedir {@code /api/me}.
     */
    @PutMapping("/api/me/perfil")
    public UsuarioActual editarPerfil(@AuthenticationPrincipal Jwt token,
            @Valid @RequestBody EdicionPerfilRequest solicitud) {
        return sesiones.editarPerfil(token.getSubject(), solicitud);
    }

    @PostMapping("/api/me/password")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void cambiarPassword(@AuthenticationPrincipal Jwt token,
            @Valid @RequestBody CambioPasswordRequest solicitud) {
        sesiones.cambiarPassword(token.getSubject(), solicitud);
    }
}
