package com.lajuanita.backend.auth;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final SesionService sesiones;

    public AuthController(SesionService sesiones) {
        this.sesiones = sesiones;
    }

    /** Único endpoint público del sistema. Todo lo demás exige credencial. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest solicitud) {
        return sesiones.iniciarSesion(solicitud);
    }
}
