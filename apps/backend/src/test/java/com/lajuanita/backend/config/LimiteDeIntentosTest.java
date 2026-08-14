package com.lajuanita.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

/**
 * El límite de intentos que no existía.
 *
 * <p>Antes de esto, un script probaba contraseñas contra {@code /api/auth/login}
 * a la velocidad que aguantara el servidor —BCrypt pone el techo en unos pocos
 * intentos por segundo, no en cero— y creaba cuentas contra
 * {@code /api/auth/registro} hasta llenar el disco. En diciembre la contraseña
 * más débil de las ~80 cuentas migradas del Notion es la puerta de entrada.
 *
 * <p>No lleva {@code @Transactional}: el contador vive en memoria, no en la
 * base, así que un rollback no lo desharía. Cada caso usa un email propio para
 * no pisarle el contador a los demás.
 */
@SpringBootTest
@AutoConfigureMockMvc
class LimiteDeIntentosTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private LimitadorDeIntentos limitador;

    @Test
    void despues_de_varios_fallos_seguidos_el_mismo_email_deja_de_ser_atendido() throws Exception {
        String email = emailNuevo();

        for (int i = 0; i < LimitadorDeIntentos.POR_EMAIL.maximo(); i++) {
            mvc.perform(login(email, "loQueSea" + i)).andExpect(status().isUnauthorized());
        }

        mvc.perform(login(email, "otraMas"))
                .andExpect(status().isTooManyRequests())
                .andExpect(jsonPath("$.detail")
                        .value("Demasiados intentos seguidos. Esperá unos minutos y volvé a probar."))
                .andExpect(jsonPath("$.title").value("Demasiados intentos"));
    }

    /**
     * Y cuenta igual para un email que no existe. Si el límite se aplicara solo
     * a las cuentas reales, el 429 se convertiría en la forma de averiguar quién
     * tiene cuenta — justo lo que el 401 único se esfuerza por evitar.
     */
    @Test
    void un_email_inexistente_tambien_se_frena() throws Exception {
        String email = "no-existe-" + UUID.randomUUID() + "@lajuanita.local";

        for (int i = 0; i < LimitadorDeIntentos.POR_EMAIL.maximo(); i++) {
            mvc.perform(login(email, "x")).andExpect(status().isUnauthorized());
        }

        mvc.perform(login(email, "x")).andExpect(status().isTooManyRequests());
    }

    /**
     * El límite no puede castigar a quien sabe su contraseña: sin esto, unos
     * cuantos errores de tipeo a lo largo de la mañana dejarían a Micaela afuera
     * después de haber entrado bien.
     */
    @Test
    void un_login_exitoso_borra_los_fallos_previos() throws Exception {
        String email = "admin@lajuanita.local";
        limitador.limpiar("email:" + email);

        for (int i = 0; i < LimitadorDeIntentos.POR_EMAIL.maximo() - 1; i++) {
            mvc.perform(login(email, "malMalMal")).andExpect(status().isUnauthorized());
        }

        mvc.perform(login(email, "lajuanita2026")).andExpect(status().isOk());

        // Con el contador limpio, vuelve a haber margen completo.
        mvc.perform(login(email, "malMalMal")).andExpect(status().isUnauthorized());
        limitador.limpiar("email:" + email);
    }

    // -- La ventana deslizante, sin pasar por HTTP -----------------------------

    @Test
    void el_limitador_permite_exactamente_el_maximo_configurado() {
        LimitadorDeIntentos.Regla regla =
                new LimitadorDeIntentos.Regla(3, LimitadorDeIntentos.VENTANA_POR_IP);
        String clave = "prueba:" + UUID.randomUUID();

        for (int i = 0; i < regla.maximo(); i++) {
            assertThat(limitador.registrar(regla, clave)).as("intento %d", i + 1).isTrue();
        }

        assertThat(limitador.registrar(regla, clave)).isFalse();
    }

    @Test
    void cada_clave_cuenta_por_separado() {
        String una = "prueba:" + UUID.randomUUID();
        String otra = "prueba:" + UUID.randomUUID();

        for (int i = 0; i < LimitadorDeIntentos.POR_EMAIL.maximo(); i++) {
            limitador.registrar(LimitadorDeIntentos.POR_EMAIL, una);
        }

        assertThat(limitador.registrar(LimitadorDeIntentos.POR_EMAIL, una)).isFalse();
        assertThat(limitador.registrar(LimitadorDeIntentos.POR_EMAIL, otra)).isTrue();
    }

    // -------------------------------------------------------------------------

    private RequestBuilder login(String email, String password) {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}
                        """.formatted(email, password));
    }

    private String emailNuevo() {
        return "limite-" + UUID.randomUUID() + "@lajuanita.local";
    }
}
