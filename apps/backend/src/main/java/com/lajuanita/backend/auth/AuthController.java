package com.lajuanita.backend.auth;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioService;
import com.lajuanita.backend.usuario.dto.RegistroRequest;

import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/auth")
public class AuthController {

    private final SesionService sesiones;
    private final UsuarioService usuarios;

    public AuthController(SesionService sesiones, UsuarioService usuarios) {
        this.sesiones = sesiones;
        this.usuarios = usuarios;
    }

    /** Endpoint público. */
    @PostMapping("/login")
    public LoginResponse login(@Valid @RequestBody LoginRequest solicitud) {
        return sesiones.iniciarSesion(solicitud);
    }

    /**
     * Endpoint público: cualquiera se crea su cuenta.
     *
     * <p>Decidido el 2026-08-12 (cierra P18). Para ver tus reservas necesitás
     * cuenta, seas alumno o no: quien alquila una cabina una vez no es alumno y
     * también tiene que poder entrar. Crear la cuenta y ser alumno son dos
     * cosas separadas -- la relación {@code alumno} la agrega después
     * administración, al inscribirte.
     *
     * <p>Devuelve la credencial ya emitida, así la persona no tiene que
     * escribir dos veces lo mismo para entrar.
     */
    @PostMapping("/registro")
    @ResponseStatus(HttpStatus.CREATED)
    public LoginResponse registro(@Valid @RequestBody RegistroRequest solicitud) {
        Usuario creado = usuarios.registrar(solicitud);
        return sesiones.credencialPara(creado);
    }
}
