package com.lajuanita.backend.config;

import java.io.IOException;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.stereotype.Component;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import tools.jackson.databind.json.JsonMapper;

/**
 * Qué se responde cuando la credencial falta, venció, está manipulada o ya no
 * identifica a nadie.
 *
 * <p>Spring Security devuelve por defecto un 401 con el <b>cuerpo vacío</b>. Eso
 * deja al front sin nada que mostrar y rompe el contrato de errores del resto de
 * la API, que siempre trae el mensaje en {@code detail} (RFC 7807). Acá se
 * emite el mismo formato que todo lo demás.
 *
 * <p>El mensaje es deliberadamente genérico: no distingue entre "no mandaste
 * credencial", "venció", "la firma no cierra" y "ese usuario ya no existe".
 * Para quien pregunta desde afuera, las cuatro cosas significan lo mismo --
 * volvé a entrar-- y diferenciarlas solo le sirve a quien está probando tokens.
 */
@Component
public class RespuestaDeNoAutenticado implements AuthenticationEntryPoint {

    private final JsonMapper json;

    public RespuestaDeNoAutenticado(JsonMapper json) {
        this.json = json;
    }

    @Override
    public void commence(HttpServletRequest pedido,
            HttpServletResponse respuesta,
            AuthenticationException excepcion) throws IOException {

        ProblemDetail problema = ProblemDetail.forStatusAndDetail(
                HttpStatus.UNAUTHORIZED, "Tu sesión no es válida. Volvé a entrar.");
        problema.setTitle("No autenticado");
        problema.setInstance(java.net.URI.create(pedido.getRequestURI()));

        respuesta.setStatus(HttpStatus.UNAUTHORIZED.value());
        respuesta.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);
        respuesta.setCharacterEncoding("UTF-8");
        json.writeValue(respuesta.getWriter(), problema);
    }
}
