package com.lajuanita.backend.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Duration;
import java.util.Base64;
import java.util.List;

import org.junit.jupiter.api.Test;

/**
 * El candado que impide arrancar firmando con el secreto que está commiteado.
 *
 * <p>Antes ese candado se disparaba solo si había un perfil {@code prod} activo,
 * y nada en este proyecto activa un perfil: el deploy previsto es un VPS con
 * Docker Compose, sin perfiles. Medido en la auditoría del 2026-08-13, la
 * aplicación arrancaba sin variables de entorno, firmaba tokens con la clave
 * publicada y dejaba una sola línea de WARN. Con esa clave se fabrica un token
 * de ADMIN sin conocer ninguna contraseña.
 *
 * <p>Es un test unitario y no un {@code @SpringBootTest} a propósito: lo que hay
 * que probar es qué pasa cuando el contexto NO arranca, y para eso conviene
 * llamar al bean directamente.
 */
class SecretoDeDesarrolloTest {

    private final SeguridadConfig config = new SeguridadConfig(List.of("http://localhost:5173"));

    @Test
    void con_el_secreto_commiteado_y_sin_permiso_explicito_NO_arranca() {
        assertThatThrownBy(() -> config.claveDeFirma(propiedades(SeguridadConfig.SECRETO_DE_DESARROLLO, false)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("JWT_SECRET");
    }

    /**
     * El permiso vive en el {@code application.properties} del repo, que es lo
     * que un deploy no copia. Acá se prueba que, cuando está, no molesta.
     */
    @Test
    void con_permiso_explicito_arranca_igual_que_siempre() {
        assertThatCode(() -> config.claveDeFirma(propiedades(SeguridadConfig.SECRETO_DE_DESARROLLO, true)))
                .doesNotThrowAnyException();
    }

    /** Un entorno bien configurado no necesita el permiso para nada. */
    @Test
    void con_un_secreto_propio_arranca_sin_pedir_permiso() {
        String secretoPropio = Base64.getEncoder().encodeToString(new byte[48]);

        assertThat(config.claveDeFirma(propiedades(secretoPropio, false))).isNotNull();
    }

    /** El chequeo de longitud que ya existía sigue en pie y va primero. */
    @Test
    void un_secreto_demasiado_corto_no_arranca_aunque_haya_permiso() {
        String corto = Base64.getEncoder().encodeToString(new byte[16]);

        assertThatThrownBy(() -> config.claveDeFirma(propiedades(corto, true)))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("32 bytes");
    }

    private PropiedadesJwt propiedades(String secreto, boolean permitirSecretoDeDesarrollo) {
        return new PropiedadesJwt(secreto, Duration.ofHours(8), "la-juanita", permitirSecretoDeDesarrollo);
    }
}
