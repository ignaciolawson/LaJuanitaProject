package com.lajuanita.backend.auth;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.OffsetDateTime;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.context.bean.override.mockito.MockitoSpyBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.RequestBuilder;

import com.jayway.jsonpath.JsonPath;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Login de punta a punta contra la base real: Postgres → JPA → REST →
 * credencial firmada → ruta protegida.
 *
 * <p>Es el vertical slice de la Fase 0. Cuando toque el módulo de alumnos, el
 * patrón de acá (DTO + servicio transaccional + ProblemDetail + test de
 * endpoint) es el que se copia.
 *
 * <p>⚠️ Corre contra la base de desarrollo, no contra una descartable. Hoy es
 * inofensivo porque solo lee y toca {@code ultimo_acceso}. El día que un test
 * necesite INSERT o DELETE de datos de negocio, hay que meter Testcontainers
 * antes -- no después.
 */
@SpringBootTest
@AutoConfigureMockMvc
class AutenticacionTest {

    /** Sembrado por {@code V3__usuario_admin_inicial.sql}. */
    private static final String EMAIL_ADMIN = "admin@lajuanita.local";
    private static final String PASSWORD_ADMIN = "lajuanita2026";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository usuarios;

    /**
     * Espiado, no simulado: sigue siendo el BCrypt de verdad (los tests de hash
     * y de login dependen de que funcione), pero además se puede verificar que
     * se lo llamó. Hace falta para el test del oráculo de tiempo.
     */
    @MockitoSpyBean
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtEncoder codificador;

    /**
     * El motivo por el que el admin inicial se siembra en su propia migración y
     * no en V2: el hash tiene que ser verificable por el mismo encoder que usa
     * el login. Si alguien cambia el algoritmo o el costo, este test falla acá y
     * no un lunes en producción.
     */
    @Test
    void el_hash_sembrado_en_V3_lo_valida_el_encoder_de_la_aplicacion() {
        Usuario admin = usuarios.findByEmailIgnoreCase(EMAIL_ADMIN).orElseThrow();

        assertThat(admin.getRol()).isEqualTo(Rol.ADMIN);
        assertThat(admin.isActivo()).isTrue();
        assertThat(passwordEncoder.matches(PASSWORD_ADMIN, admin.getPasswordHash())).isTrue();
        assertThat(admin.getPasswordHash()).startsWith("$2a$");
    }

    @Test
    void login_correcto_devuelve_credencial_y_usuario() throws Exception {
        mvc.perform(login(EMAIL_ADMIN, PASSWORD_ADMIN))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.expiraEn").isNotEmpty())
                .andExpect(jsonPath("$.usuario.email").value(EMAIL_ADMIN))
                .andExpect(jsonPath("$.usuario.rol").value("ADMIN"))
                // El admin inicial no es alumno ni profesor: los dos ejes son
                // independientes y esto lo demuestra.
                .andExpect(jsonPath("$.usuario.esAlumno").value(false))
                .andExpect(jsonPath("$.usuario.esProfesor").value(false))
                // Lo más importante de este test: la respuesta NO filtra el hash.
                .andExpect(jsonPath("$.usuario.passwordHash").doesNotExist());
    }

    /**
     * Los dos rechazos tienen que ser indistinguibles. Si "no existe ese mail"
     * se leyera distinto de "esa contraseña está mal", cualquiera podría
     * averiguar quién tiene cuenta en el sistema probando direcciones.
     */
    @Test
    void password_incorrecta_y_mail_inexistente_dan_exactamente_el_mismo_401() throws Exception {
        String porPassword = mvc.perform(login(EMAIL_ADMIN, "no-es-la-contraseña"))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        String porMail = mvc.perform(login("nadie@lajuanita.local", PASSWORD_ADMIN))
                .andExpect(status().isUnauthorized())
                .andReturn().getResponse().getContentAsString();

        assertThat(porPassword).isEqualTo(porMail);
    }

    @Test
    void el_email_no_distingue_mayusculas_porque_el_indice_unico_es_sobre_lower() throws Exception {
        mvc.perform(login(EMAIL_ADMIN.toUpperCase(), PASSWORD_ADMIN))
                .andExpect(status().isOk());
    }

    @Test
    void un_login_sin_datos_da_400_y_dice_que_campo_falta() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.email").isNotEmpty())
                .andExpect(jsonPath("$.errores.password").isNotEmpty());
    }

    @Test
    void me_sin_credencial_da_401() throws Exception {
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void me_con_credencial_inventada_da_401() throws Exception {
        mvc.perform(get("/api/me").header("Authorization", "Bearer esto.no.es-un-token"))
                .andExpect(status().isUnauthorized());
    }

    /**
     * Un token bien firmado y vigente cuyo `sub` no es un número devolvía **500**
     * y, peor, con un cuerpo de error con otra forma (el de Spring, no
     * ProblemDetail). Ahora es un 401 con el mismo contrato que el resto.
     */
    @Test
    void un_token_con_sub_no_numerico_da_401_y_no_500() throws Exception {
        String token = firmar(JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("administrador")
                .claim("rol", "ADMIN")
                .build());

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.title").value("No autenticado"));
    }

    /** Token válido de un usuario que ya no está en la base. */
    @Test
    void un_token_de_un_usuario_inexistente_da_401() throws Exception {
        String token = firmar(JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("999999")
                .claim("rol", "ADMIN")
                .build());

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isUnauthorized())
                // Ya no contesta "Email o contraseña incorrectos" a un pedido
                // que no trae ni email ni contraseña. Y el rechazo lo da ahora
                // la capa de seguridad, antes de llegar al controller: el token
                // se resuelve contra la base en cada pedido.
                .andExpect(jsonPath("$.detail").value("Tu sesión no es válida. Volvé a entrar."));
    }

    /**
     * Un JSON mal formado tiene que dar 400, no 401.
     *
     * <p>Daba 401 con el cuerpo vacío porque el reenvío interno a {@code /error}
     * caía bajo {@code anyRequest().authenticated()}: el error real quedaba
     * tapado por un rechazo de autenticación que no tenía nada que ver.
     */
    @Test
    void un_json_mal_formado_da_400_y_no_un_401_enmascarado() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":"))
                .andExpect(status().isBadRequest());
    }

    /**
     * En cambio un GET al login sí da 401, y está bien que así sea: lo público
     * es el POST y nada más, así que cualquier otro método cae en
     * {@code anyRequest().authenticated()} y lo rechaza seguridad antes de que
     * llegue a existir un 405. Se deja fijado para que nadie lo "arregle"
     * abriendo la ruta entera.
     */
    @Test
    void un_metodo_distinto_de_post_en_login_lo_rechaza_seguridad() throws Exception {
        mvc.perform(get("/api/auth/login"))
                .andExpect(status().isUnauthorized());
    }

    /**
     * La contracara temporal del test de arriba: que los dos rechazos tengan el
     * mismo cuerpo no sirve de nada si tardan distinto.
     *
     * <p>Medir milisegundos en un test es inestable, así que se verifica lo que
     * de verdad importa y es determinista: que con un email inexistente el
     * sistema **igual haga el trabajo de BCrypt**. Si alguien "optimiza" esa
     * comparación aparentemente inútil, este test falla.
     *
     * <p>Medido a mano antes de la corrección: ~10 ms el email inexistente
     * contra ~88 ms la contraseña incorrecta. Un solo pedido bastaba para saber
     * si una dirección tenía cuenta.
     */
    @Test
    void con_un_email_inexistente_igual_se_compara_una_contrasena_para_no_filtrar_por_tiempo()
            throws Exception {
        mvc.perform(login("nadie-en-absoluto@lajuanita.local", "loquesea"))
                .andExpect(status().isUnauthorized());

        verify(passwordEncoder).matches(eq("loquesea"), anyString());
    }

    @Test
    void me_con_la_credencial_del_login_devuelve_al_mismo_usuario() throws Exception {
        String token = tokenDeLoginComoAdmin();

        mvc.perform(get("/api/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value(EMAIL_ADMIN))
                .andExpect(jsonPath("$.rol").value("ADMIN"))
                .andExpect(jsonPath("$.nombre").value("Administrador"))
                .andExpect(jsonPath("$.apellido").value("Sistema"))
                .andExpect(jsonPath("$.passwordHash").doesNotExist());
    }

    @Test
    void el_login_deja_registrado_el_ultimo_acceso() throws Exception {
        OffsetDateTime antes = OffsetDateTime.now();

        mvc.perform(login(EMAIL_ADMIN, PASSWORD_ADMIN)).andExpect(status().isOk());

        OffsetDateTime registrado = usuarios.findByEmailIgnoreCase(EMAIL_ADMIN)
                .orElseThrow()
                .getUltimoAcceso();

        assertThat(registrado).isNotNull();
        assertThat(registrado).isAfterOrEqualTo(antes);
    }

    // -------------------------------------------------------------------------

    private RequestBuilder login(String email, String password) {
        String cuerpo = """
                {"email": "%s", "password": "%s"}
                """.formatted(email, password);

        return post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private String firmar(JwtClaimsSet reclamos) {
        return codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamos)).getTokenValue();
    }

    private String tokenDeLoginComoAdmin() throws Exception {
        String cuerpo = mvc.perform(login(EMAIL_ADMIN, PASSWORD_ADMIN))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return JsonPath.read(cuerpo, "$.token");
    }
}
