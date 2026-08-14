package com.lajuanita.backend.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.OffsetDateTime;
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

/**
 * El circuito completo de la contraseña temporal, que es la respuesta a P18
 * ("¿cómo obtiene el alumno su contraseña la primera vez?").
 *
 * <p>Micaela da de alta → el sistema genera una contraseña → se la pasa por
 * WhatsApp → la persona entra con ella → el sistema la obliga a cambiarla →
 * desde ahí entra con la suya y la temporal no sirve más.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PasswordTemporalTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Test
    void el_alta_por_administracion_devuelve_la_password_una_sola_vez_y_marca_la_cuenta() throws Exception {
        String email = emailNuevo();

        String respuesta = mvc.perform(altaDeUsuario(email))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.passwordTemporal").isNotEmpty())
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(true))
                .andReturn().getResponse().getContentAsString();

        String passwordTemporal = JsonPath.read(respuesta, "$.passwordTemporal");

        // Es una credencial: se guarda hasheada, nunca en claro.
        Usuario creado = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(creado.getPasswordHash()).startsWith("$2a$");
        assertThat(creado.getPasswordHash()).doesNotContain(passwordTemporal);
        assertThat(creado.isDebeCambiarPassword()).isTrue();

        // Sin caracteres que se confundan al leerlos de un WhatsApp.
        assertThat(passwordTemporal).hasSize(10);
        assertThat(passwordTemporal).doesNotContain("0", "O", "l", "I", "1");
    }

    @Test
    void la_persona_entra_con_la_password_temporal_y_el_sistema_le_avisa_que_debe_cambiarla() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);

        mvc.perform(login(email, passwordTemporal))
                .andExpect(status().isOk())
                // Esta bandera es la que hace que el front le tape todo hasta
                // que la cambie.
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(true));
    }

    @Test
    void al_cambiarla_se_apaga_la_marca_y_la_temporal_deja_de_servir() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);

        String token = JsonPath.read(
                mvc.perform(login(email, passwordTemporal)).andReturn().getResponse().getContentAsString(),
                "$.token");

        mvc.perform(post("/api/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"passwordActual":"%s","passwordNueva":"miPropiaClaveLarga"}
                        """.formatted(passwordTemporal)))
                .andExpect(status().isNoContent());

        // La temporal, que pasó por un chat, ya no entra.
        mvc.perform(login(email, passwordTemporal)).andExpect(status().isUnauthorized());

        // La nueva sí, y sin la marca.
        mvc.perform(login(email, "miPropiaClaveLarga"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(false));
    }

    /**
     * Aunque la sesión esté abierta, cambiar la contraseña exige la actual. Si
     * no, alguien que encuentra la sesión abierta en la computadora del estudio
     * se queda con la cuenta.
     */
    @Test
    void no_se_puede_cambiar_la_password_sin_saber_la_actual() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);
        String token = JsonPath.read(
                mvc.perform(login(email, passwordTemporal)).andReturn().getResponse().getContentAsString(),
                "$.token");

        mvc.perform(post("/api/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"passwordActual":"loQueSea","passwordNueva":"miPropiaClaveLarga"}
                        """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void cambiar_la_password_exige_estar_autenticado() throws Exception {
        mvc.perform(post("/api/me/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"passwordActual":"x","passwordNueva":"miPropiaClaveLarga"}
                        """))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void la_password_nueva_tambien_tiene_que_ser_larga() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);
        String token = JsonPath.read(
                mvc.perform(login(email, passwordTemporal)).andReturn().getResponse().getContentAsString(),
                "$.token");

        mvc.perform(post("/api/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"passwordActual":"%s","passwordNueva":"corta"}
                        """.formatted(passwordTemporal)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.passwordNueva").isNotEmpty());
    }

    // -- Reseteo por administración (SEC-03) ----------------------------------

    /**
     * El caso que el sistema no sabía resolver: la persona perdió su contraseña.
     *
     * <p>No hay mail y no lo va a haber, así que no puede existir un "olvidé mi
     * contraseña". Sin este camino, quien la olvida queda afuera para siempre y
     * las dos salidas son un UPDATE a mano en producción o compartir la cuenta
     * de otro. En diciembre entran ~80 alumnos con contraseña temporal.
     */
    @Test
    void administracion_le_da_una_password_nueva_a_quien_perdio_la_suya() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);
        String token = tokenDe(email, passwordTemporal);

        mvc.perform(post("/api/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"passwordActual":"%s","passwordNueva":"laQueMeOlvide12"}
                        """.formatted(passwordTemporal)))
                .andExpect(status().isNoContent());

        Long id = usuarios.findByEmailIgnoreCase(email).orElseThrow().getId();

        String nueva = JsonPath.read(mvc.perform(post("/api/usuarios/" + id + "/password-temporal")
                .header("Authorization", comoRol("STAFF")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(true))
                .andReturn().getResponse().getContentAsString(), "$.passwordTemporal");

        // La que la persona había elegido deja de servir: si siguiera sirviendo,
        // resetear no sería resetear.
        mvc.perform(login(email, "laQueMeOlvide12")).andExpect(status().isUnauthorized());

        mvc.perform(login(email, nueva))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(true));
    }

    // -- Vencimiento de la temporal (SEC-08) ----------------------------------

    /**
     * Una contraseña que viajó por WhatsApp y nadie usó no vale para siempre:
     * quien lea ese chat entra y la cambia, que es lo único que ese estado
     * habilita, y se queda con la cuenta.
     */
    @Test
    void una_password_temporal_sin_usar_vence() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);

        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        usuario.setPasswordTemporalDesde(OffsetDateTime.now().minusDays(8));
        usuarios.saveAndFlush(usuario);

        mvc.perform(login(email, passwordTemporal))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.detail")
                        .value("Esa contraseña temporal venció. Pedile a administración que te genere una nueva."));
    }

    /** Dentro de la ventana entra normalmente: la regla no es "vence enseguida". */
    @Test
    void una_password_temporal_reciente_sigue_entrando() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);

        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        usuario.setPasswordTemporalDesde(OffsetDateTime.now().minusDays(6));
        usuarios.saveAndFlush(usuario);

        mvc.perform(login(email, passwordTemporal)).andExpect(status().isOk());
    }

    /**
     * Y el reseteo es la salida: después de pedir una nueva, se vuelve a entrar.
     * Sin esto, vencer la contraseña sería encerrar a la persona en vez de
     * protegerla.
     */
    @Test
    void resetear_destraba_una_temporal_vencida() throws Exception {
        String email = emailNuevo();
        crearYObtenerPassword(email);

        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        usuario.setPasswordTemporalDesde(OffsetDateTime.now().minusDays(30));
        usuarios.saveAndFlush(usuario);

        String nueva = JsonPath.read(mvc.perform(
                post("/api/usuarios/" + usuario.getId() + "/password-temporal")
                        .header("Authorization", comoRol("STAFF")))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(), "$.passwordTemporal");

        mvc.perform(login(email, nueva)).andExpect(status().isOk());
    }

    /** Quien eligió su propia contraseña no tiene nada que pueda vencer. */
    @Test
    void una_password_elegida_por_la_persona_no_vence() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);
        String token = tokenDe(email, passwordTemporal);

        mvc.perform(post("/api/me/password")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"passwordActual":"%s","passwordNueva":"laMiaParaSiempre"}
                        """.formatted(passwordTemporal)))
                .andExpect(status().isNoContent());

        Usuario usuario = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(usuario.getPasswordTemporalDesde()).isNull();

        mvc.perform(login(email, "laMiaParaSiempre")).andExpect(status().isOk());
    }

    /** Alguien dado de alta por Micaela no es alumno hasta que se lo inscriba. */
    @Test
    void el_alta_de_una_cuenta_no_crea_un_alumno() throws Exception {
        String email = emailNuevo();
        String passwordTemporal = crearYObtenerPassword(email);
        String token = JsonPath.read(
                mvc.perform(login(email, passwordTemporal)).andReturn().getResponse().getContentAsString(),
                "$.token");

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.esAlumno").value(false))
                .andExpect(jsonPath("$.esProfesor").value(false));
    }

    // -------------------------------------------------------------------------

    private String tokenDe(String email, String password) throws Exception {
        return JsonPath.read(
                mvc.perform(login(email, password)).andReturn().getResponse().getContentAsString(),
                "$.token");
    }

    private String crearYObtenerPassword(String email) throws Exception {
        String respuesta = mvc.perform(altaDeUsuario(email))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return JsonPath.read(respuesta, "$.passwordTemporal");
    }

    private org.springframework.test.web.servlet.RequestBuilder altaDeUsuario(String email) {
        return post("/api/usuarios")
                .header("Authorization", comoRol("STAFF"))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Alumno","apellido":"DelNotion","email":"%s"}
                        """.formatted(email));
    }

    private org.springframework.test.web.servlet.RequestBuilder login(String email, String password) {
        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"email":"%s","password":"%s"}
                        """.formatted(email, password));
    }

    private String comoRol(String rol) {
        Instant ahora = Instant.now();
        JwtClaimsSet reclamos = JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(3600))
                .subject("1")
                .claim("rol", rol)
                .build();

        return "Bearer " + codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamos)).getTokenValue();
    }

    private String emailNuevo() {
        return "temporal-" + UUID.randomUUID() + "@lajuanita.local";
    }
}
