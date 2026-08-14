package com.lajuanita.backend.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.context.request.RequestContextHolder;
import org.springframework.web.context.request.ServletRequestAttributes;

import jakarta.servlet.http.HttpServletRequest;

/**
 * El rastro de lo que pasa con las cuentas.
 *
 * <p>Antes de esto, <b>toda la aplicación tenía una sola línea de log</b> —la
 * advertencia del secreto de desarrollo— y un login fallido no dejaba nada. Si
 * alguien preguntaba <i>"¿entraron a la cuenta de Micaela?"</i>, la única
 * respuesta honesta era "no hay forma de saberlo". Acá se van a administrar los
 * datos personales de ~80 alumnos, con teléfono y después historial de pagos: la
 * Ley 25.326 le impone a quien los administra un deber de seguridad (arts. 9 y
 * 10), y no poder responder esa pregunta es incumplirlo.
 *
 * <p><b>Lo que nunca se escribe:</b> contraseñas, contraseñas temporales, tokens
 * ni hashes. El email sí, porque sin él el registro no sirve para nada; es un
 * dato personal, así que estos logs son tan confidenciales como la base.
 *
 * <p>Va a un logger y no a una tabla a propósito, por ahora: una tabla obliga a
 * decidir retención y purga, y lo urgente era dejar de no registrar nada. Cuando
 * haga falta que sobreviva a un reinicio del contenedor —o consultarlo desde el
 * dashboard del Módulo 8— la tabla `evento_seguridad` es el paso siguiente, y
 * este componente es el único lugar que habría que tocar.
 */
@Component
public class RegistroDeEventos {

    private static final Logger log = LoggerFactory.getLogger("seguridad");

    public void loginExitoso(Long idUsuario, String email) {
        log.info("login OK · usuario={} · email={} · ip={}", idUsuario, email, ip());
    }

    public void loginFallido(String email, String motivo) {
        log.warn("login RECHAZADO · email={} · motivo={} · ip={}", email, motivo, ip());
    }

    public void limiteExcedido(String recurso, String clave) {
        log.warn("limite de intentos EXCEDIDO · recurso={} · clave={} · ip={}", recurso, clave, ip());
    }

    public void cuentaCreada(Long idUsuario, String email, String origen) {
        log.info("cuenta creada · usuario={} · email={} · origen={} · ip={}",
                idUsuario, email, origen, ip());
    }

    public void passwordCambiada(Long idUsuario) {
        log.info("password cambiada por su dueño · usuario={} · ip={}", idUsuario, ip());
    }

    public void passwordReseteada(Long idQuienPide, Long idObjetivo) {
        log.warn("password RESETEADA por administración · actor={} · usuario={} · ip={}",
                idQuienPide, idObjetivo, ip());
    }

    public void rolCambiado(Long idQuienPide, Long idObjetivo, String rolAnterior, String rolNuevo) {
        log.warn("ROL cambiado · actor={} · usuario={} · {} -> {} · ip={}",
                idQuienPide, idObjetivo, rolAnterior, rolNuevo, ip());
    }

    public void cuentaActivada(Long idQuienPide, Long idObjetivo, boolean activo) {
        log.warn("cuenta {} · actor={} · usuario={} · ip={}",
                activo ? "REACTIVADA" : "DESACTIVADA", idQuienPide, idObjetivo, ip());
    }

    /**
     * La IP del pedido en curso.
     *
     * <p>Se resuelve acá, y no como parámetro de cada método, para no arrastrar
     * el {@code HttpServletRequest} por seis servicios que no lo necesitan para
     * nada más. Es el único lugar del backend que lee el contexto del pedido de
     * forma implícita, y por eso está concentrado en un método.
     *
     * <p>Detrás del proxy con HTTPS del deploy previsto, esto va a devolver la IP
     * del proxy salvo que el proxy mande {@code X-Forwarded-For} y Spring esté
     * configurado para creerle ({@code server.forward-headers-strategy}).
     * <b>Configurarlo es parte de poner el proxy</b>, no de este archivo, y hasta
     * que eso pase el campo dice la verdad: la IP que ve la aplicación.
     */
    private String ip() {
        if (RequestContextHolder.getRequestAttributes() instanceof ServletRequestAttributes atributos) {
            HttpServletRequest pedido = atributos.getRequest();
            return pedido.getRemoteAddr();
        }
        return "-";
    }
}
