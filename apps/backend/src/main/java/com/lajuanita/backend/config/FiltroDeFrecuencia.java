package com.lajuanita.backend.config;

import java.io.IOException;
import java.util.Set;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.security.autoconfigure.web.servlet.SecurityFilterProperties;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;

/**
 * Límite por IP sobre los tres endpoints que valen la pena atacar: pedir una
 * credencial, crear una cuenta y cambiar una contraseña.
 *
 * <p>El límite <b>por email</b> vive en {@code SesionService} y no acá. No es
 * una omisión: el email viaja en el cuerpo del pedido, y leer el cuerpo desde un
 * filtro obliga a envolver el request para que el controller pueda volver a
 * leerlo — complejidad real a cambio de nada, porque el servicio ya tiene el
 * email en la mano y es el único que sabe si el intento salió mal.
 */
// Antes de la cadena de Spring Security (que va en -100), no después: una
// avalancha de pedidos no tiene por qué llegar a validar tokens ni a resolver
// autoridades contra la base para recién ahí ser rechazada.
//
// La constante vive en `SecurityFilterProperties`, NO en `SecurityProperties`:
// en Boot 4.1 esa clase quedó reducida a la propiedad `user` y ya no expone
// DEFAULT_FILTER_ORDER. Es el mismo reacomodamiento de paquetes que documenta
// CLAUDE.md; verificado con `javap` sobre spring-boot-security-4.1.0.jar.
@Order(SecurityFilterProperties.DEFAULT_FILTER_ORDER - 1)
@Component
public class FiltroDeFrecuencia extends OncePerRequestFilter {

    private static final Set<String> RUTAS_VIGILADAS = Set.of(
            "/api/auth/login",
            "/api/auth/registro",
            "/api/me/password");

    private final LimitadorDeIntentos limitador;
    private final RegistroDeEventos eventos;
    private final LimitadorDeIntentos.Regla porIp;

    /**
     * @param maximoPorIp cuántos pedidos por IP se aceptan en la ventana. El
     *                    default es generoso porque detrás de una IP puede estar
     *                    todo el estudio compartiendo la conexión, y porque el
     *                    control fino es el de por email. Un script de fuerza
     *                    bruta hace miles, no ciento veinte.
     *                    <p>Durante {@code mvn test} lo pisa el pom con un valor
     *                    enorme: la suite entera es una sola máquina haciendo
     *                    cientos de logins contra 127.0.0.1, que es exactamente
     *                    la forma de un ataque.
     */
    public FiltroDeFrecuencia(LimitadorDeIntentos limitador, RegistroDeEventos eventos,
            @Value("${lajuanita.limite.intentos-por-ip:120}") int maximoPorIp) {
        this.limitador = limitador;
        this.eventos = eventos;
        this.porIp = new LimitadorDeIntentos.Regla(maximoPorIp, LimitadorDeIntentos.VENTANA_POR_IP);
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest pedido) {
        return !HttpMethod.POST.matches(pedido.getMethod())
                || !RUTAS_VIGILADAS.contains(pedido.getRequestURI());
    }

    @Override
    protected void doFilterInternal(HttpServletRequest pedido, HttpServletResponse respuesta,
            FilterChain cadena) throws ServletException, IOException {

        String ip = pedido.getRemoteAddr();

        if (!limitador.registrar(porIp, "ip:" + ip)) {
            eventos.limiteExcedido(pedido.getRequestURI(), "ip:" + ip);
            responder429(respuesta);
            return;
        }

        cadena.doFilter(pedido, respuesta);
    }

    /**
     * Se escribe el JSON a mano en vez de inyectar el serializador: es un cuerpo
     * fijo de cuatro campos, sin ningún dato del pedido adentro, y así el filtro
     * no depende de la configuración de Jackson. La forma es la misma
     * {@code ProblemDetail} que devuelve el resto de la API, para que el cliente
     * siga buscando el mensaje en {@code detail} y no tenga un caso especial.
     */
    private void responder429(HttpServletResponse respuesta) throws IOException {
        respuesta.setStatus(HttpStatus.TOO_MANY_REQUESTS.value());
        respuesta.setContentType("application/problem+json");
        respuesta.setCharacterEncoding("UTF-8");
        respuesta.getWriter().write("""
                {"type":"about:blank",\
                "title":"Demasiados intentos",\
                "status":429,\
                "detail":"Demasiados intentos seguidos. Esperá unos minutos y volvé a probar."}""");
    }
}
