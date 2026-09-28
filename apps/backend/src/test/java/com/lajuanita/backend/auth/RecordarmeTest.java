package com.lajuanita.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Duration;
import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.jayway.jsonpath.JsonPath;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * "Recordarme" en el login, y la mitad que lo hace aceptable: cambiar la
 * contraseña —o que administración la resetee— cierra las sesiones abiertas.
 *
 * <p>Los casos que cierran sesiones esperan un segundo antes de cambiar la
 * contraseña: el {@code iat} de un JWT va en segundos, y un token firmado en el
 * mismo segundo que el cambio sobrevive a propósito (es el que se emite como
 * respuesta). Sin la espera, el caso pasaría o no según el reloj.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RecordarmeTest {

    private static final String CLAVE = "miClaveDeSiempre";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Test
    void sin_recordarme_la_sesion_dura_8_horas_y_con_recordarme_30_dias() throws Exception {
        String email = cuentaConSuClave();

        assertThat(duracionDe(login(email, CLAVE, false))).isBetween(Duration.ofHours(7), Duration.ofHours(8));
        assertThat(duracionDe(login(email, CLAVE, true))).isBetween(Duration.ofDays(29), Duration.ofDays(30));
    }

    @Test
    void cambiar_la_password_cierra_las_otras_sesiones_y_devuelve_una_credencial_que_sirve() throws Exception {
        String email = cuentaConSuClave();
        String vieja = JsonPath.read(login(email, CLAVE, true), "$.token");
        Thread.sleep(1100);

        String respuesta = mvc.perform(post("/api/me/password")
                        .header("Authorization", "Bearer " + vieja)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"passwordActual":"%s","passwordNueva":"otraClaveLarga"}
                                """.formatted(CLAVE)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
        String nueva = JsonPath.read(respuesta, "$.token");

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + vieja))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", "Bearer " + nueva))
                .andExpect(status().isOk());

        // La reemitida dura lo mismo que la que reemplaza: era "recordarme".
        assertThat(duracionDe(respuesta)).isBetween(Duration.ofDays(29), Duration.ofDays(30));
    }

    @Test
    void el_reseteo_de_administracion_cierra_las_sesiones_de_esa_cuenta() throws Exception {
        String email = cuentaConSuClave();
        String sesion = JsonPath.read(login(email, CLAVE, true), "$.token");
        Thread.sleep(1100);

        Long id = usuarios.findByEmailIgnoreCase(email).orElseThrow().getId();
        mvc.perform(post("/api/usuarios/" + id + "/password-temporal")
                        .header("Authorization", comoAdmin()))
                .andExpect(status().isOk());

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + sesion))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------

    /** Una cuenta que ya eligió su contraseña ({@link #CLAVE}). */
    private String cuentaConSuClave() throws Exception {
        String email = "recordarme-" + UUID.randomUUID() + "@lajuanita.local";
        String temporal = JsonPath.read(mvc.perform(post("/api/usuarios")
                        .header("Authorization", comoAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"nombre":"Prueba","apellido":"Recordarme","email":"%s"}
                                """.formatted(email)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString(), "$.passwordTemporal");

        String token = JsonPath.read(login(email, temporal, false), "$.token");
        mvc.perform(post("/api/me/password")
                        .header("Authorization", "Bearer " + token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"passwordActual":"%s","passwordNueva":"%s"}
                                """.formatted(temporal, CLAVE)))
                .andExpect(status().isOk());
        return email;
    }

    private String login(String email, String password, boolean recordarme) throws Exception {
        return mvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"email":"%s","password":"%s","recordarme":%s}
                                """.formatted(email, password, recordarme)))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();
    }

    private Duration duracionDe(String respuestaDeLogin) {
        String expira = JsonPath.read(respuestaDeLogin, "$.expiraEn");
        return Duration.between(Instant.now(), Instant.parse(expira));
    }

    private String comoAdmin() {
        Instant ahora = Instant.now();
        JwtClaimsSet reclamos = JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(3600))
                .subject("1")
                .claim("rol", "ADMIN")
                .build();
        return "Bearer " + codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamos)).getTokenValue();
    }
}
