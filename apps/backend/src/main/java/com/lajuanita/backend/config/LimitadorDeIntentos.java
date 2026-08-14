package com.lajuanita.backend.config;

import java.time.Duration;
import java.util.ArrayDeque;
import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

import org.springframework.stereotype.Component;

/**
 * Límite de intentos con ventana deslizante, en memoria.
 *
 * <p>Sin esto, un script prueba contraseñas contra {@code /api/auth/login} a la
 * velocidad que aguante el servidor —BCrypt pone el techo en unos pocos intentos
 * por segundo y por núcleo, no en cero— y contra {@code /api/auth/registro} crea
 * cuentas hasta llenar el disco. En diciembre la contraseña más débil de las ~80
 * cuentas migradas del Notion es la puerta de entrada.
 *
 * <p><b>Por qué un ConcurrentHashMap y no Bucket4j ni Redis:</b> a esta escala
 * —un estudio con una decena de logins por día— el problema no es el algoritmo,
 * es que no haya ninguno. Una dependencia más, o peor, un servicio más que
 * mantener en el VPS, compra precisión que nadie va a usar. Si algún día hay más
 * de una instancia del backend, esto deja de alcanzar: el contador es por
 * proceso, y ahí sí corresponde Redis.
 *
 * <p><b>Lo que se pierde al reiniciar</b> es el contador, no datos: quien estaba
 * bloqueado vuelve a tener sus intentos. Es aceptable — reiniciar el backend no
 * es algo que un atacante pueda provocar.
 */
@Component
public class LimitadorDeIntentos {

    /**
     * Ventana del límite por IP. El máximo es configurable
     * ({@code lajuanita.limite.intentos-por-ip}) y lo resuelve
     * {@code FiltroDeFrecuencia}: detrás de una sola IP puede estar todo el
     * estudio con la misma conexión, así que el número correcto depende del
     * entorno. El objetivo es cortar un script, no molestar a Micaela porque se
     * equivocó dos veces.
     */
    public static final Duration VENTANA_POR_IP = Duration.ofMinutes(5);

    /**
     * Por email, y contando <b>solo los fallos</b>. Un login exitoso limpia el
     * contador, así que quien sabe su contraseña nunca ve esto.
     *
     * <p>Solo por IP no alcanzaría —un ataque distribuido lo esquiva— y solo por
     * email tampoco —permite barrer direcciones a una por vez—.
     *
     * <p><b>Contracara conocida:</b> quien conoce el email de otro puede dejarlo
     * bloqueado 15 minutos fallando a propósito. Es el precio de la regla, y a
     * esta escala es preferible a no tener ninguna. La alternativa sin ese
     * efecto —exigir un captcha— agrega un tercero y no está en el alcance.
     */
    public static final Regla POR_EMAIL = new Regla(8, Duration.ofMinutes(15));

    /**
     * Techo de claves distintas. Un ataque desde muchas IPs no puede hacer
     * crecer el mapa sin límite: al llegar acá se purga lo vencido y, si aun así
     * no alcanza, se deja de contar antes que quedarse sin memoria. Perder el
     * límite es peor que perderlo <i>y además</i> caerse.
     */
    private static final int CLAVES_MAXIMAS = 50_000;

    private final Map<String, Deque<Long>> intentos = new ConcurrentHashMap<>();

    /** Cuántos intentos se permiten en cuánto tiempo. */
    public record Regla(int maximo, Duration ventana) {
    }

    /**
     * Registra un intento y dice si estaba permitido.
     *
     * @return {@code true} si el intento entra dentro del límite.
     */
    public boolean registrar(Regla regla, String clave) {
        if (clave == null || clave.isBlank()) {
            return true;
        }

        if (intentos.size() >= CLAVES_MAXIMAS) {
            purgar();
            if (intentos.size() >= CLAVES_MAXIMAS) {
                return true;
            }
        }

        long ahora = System.currentTimeMillis();
        long desde = ahora - regla.ventana().toMillis();

        Deque<Long> marcas = intentos.computeIfAbsent(clave, k -> new ArrayDeque<>());
        synchronized (marcas) {
            while (!marcas.isEmpty() && marcas.peekFirst() < desde) {
                marcas.pollFirst();
            }
            marcas.addLast(ahora);
            return marcas.size() <= regla.maximo();
        }
    }

    /** Un login exitoso borra el historial de fallos de ese email. */
    public void limpiar(String clave) {
        if (clave != null) {
            intentos.remove(clave);
        }
    }

    private void purgar() {
        long limite = System.currentTimeMillis() - POR_EMAIL.ventana().toMillis();
        intentos.values().removeIf(marcas -> {
            synchronized (marcas) {
                return marcas.isEmpty() || marcas.peekLast() < limite;
            }
        });
    }
}
