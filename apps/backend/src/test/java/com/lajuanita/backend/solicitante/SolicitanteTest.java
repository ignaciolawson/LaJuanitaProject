package com.lajuanita.backend.solicitante;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * El buzón de solicitantes, de punta a punta (`V20`, hallazgo #7).
 *
 * <p>Lo que esta suite persigue son dos cosas que se rompen distinto:
 *
 * <ul>
 *   <li><b>Que el endpoint público sea exactamente un POST.</b> Es la primera vez
 *       que este sistema deja escribir a alguien sin cuenta, y el error caro no es
 *       que entre basura sino que la misma ruta deje <i>leer</i>: el buzón tiene
 *       teléfonos y mails de gente real. Por eso hay un caso que pide el listado
 *       sin credencial y espera 401.
 *   <li><b>Que una ficha no se pueda atender dos veces.</b> Convertir crea una
 *       cuenta; hacerlo dos veces son dos cuentas para la misma persona. El
 *       servicio lo chequea y la base lo sostiene, y hay un caso por cada uno —el
 *       de la base entra por SQL crudo, porque un chequeo de Java que se borra deja
 *       la suite verde.
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SolicitanteTest {

    /**
     * Los teléfonos tienen que ser únicos entre cuentas (`usuario_telefono_unico`),
     * y esta suite crea cuentas de verdad. Un literal repetido haría fallar el
     * segundo caso que convierta, por una razón que no tiene nada que ver con lo
     * que el caso prueba.
     */
    private static final AtomicInteger SECUENCIA = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    // == El formulario público ===============================================

    @Test
    void un_formulario_de_la_landing_entra_sin_ninguna_credencial() throws Exception {
        mandarFormulario("CURSO", unEmail())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.interes").value("CURSO"))
                // Si esto viene null falta el @Generated: la base puso la fecha y
                // Hibernate no la releyó. Es la sexta vez que aparece la trampa.
                .andExpect(jsonPath("$.fechaCreacion").isNotEmpty())
                .andExpect(jsonPath("$.idUsuario").doesNotExist());
    }

    /**
     * <b>El caso que justifica que el matcher de {@code SeguridadConfig} sea por
     * método y no por ruta.</b> Si algún día alguien "simplifica" ese
     * {@code requestMatchers} a la ruta entera, el buzón —con el teléfono y el mail
     * de todo el que escribió— queda público, y nada más falla.
     */
    @Test
    void el_buzon_no_se_lee_sin_credencial() throws Exception {
        mvc.perform(get("/api/solicitantes")).andExpect(status().isUnauthorized());
    }

    @Test
    void un_usuario_comun_no_lee_el_buzon() throws Exception {
        mvc.perform(get("/api/solicitantes").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    /**
     * El estado no viaja en el cuerpo, y el cuerpo no lo puede imponer. Es el mismo
     * caso que {@code SolicitudReservaTest} escribe para el {@code idUsuario}: un
     * campo de más en un DTO público es una regla de negocio regalada.
     */
    @Test
    void una_ficha_nace_pendiente_diga_lo_que_diga_el_cuerpo() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"ALQUILER_CABINA","estado":"CONVERTIDO"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    /**
     * El teléfono es obligatorio acá y opcional en el alta administrativa. No es
     * una inconsistencia: la contraseña temporal se pasa por WhatsApp, así que una
     * ficha sin teléfono es una ficha que después no se puede convertir.
     */
    @Test
    void una_ficha_sin_telefono_no_entra() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","interes":"CURSO"}
                        """.formatted(unEmail())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void no_se_puede_pedir_cualquier_cosa() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"MIX_MASTERING"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isBadRequest());
    }

    // == El buzón ============================================================

    /**
     * <b>El caso que pinea los {@code LEFT} del repositorio.</b> Una ficha pendiente
     * no tiene ni cuenta ni quién la resolvió; con {@code JOIN FETCH} a secas
     * desaparecerían del listado justo las pendientes, que son las únicas que el
     * buzón abre a mostrar. Es el modo de falla que `V19` encontró en
     * {@code PagoRepository.listar}: la consulta anda y la lista viene vacía.
     */
    @Test
    void las_fichas_pendientes_son_las_que_se_ven() throws Exception {
        mandarUnaFicha("CURSO");

        mvc.perform(get("/api/solicitantes?estado=PENDIENTE")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido.length()").value(Matchers.greaterThan(0)));
    }

    /**
     * DIRECTIVO lee todo y no escribe nada. Si alguien "arregla" el permiso de
     * convertir sumándolo, un socio pasa a crear cuentas.
     */
    @Test
    void el_directivo_mira_el_buzon_y_no_lo_resuelve() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        String directivo = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/solicitantes").header("Authorization", directivo))
                .andExpect(status().isOk());

        mvc.perform(post("/api/solicitantes/" + ficha + "/conversion")
                .header("Authorization", directivo))
                .andExpect(status().isForbidden());
    }

    // == La conversión =======================================================

    @Test
    void convertir_crea_la_cuenta_y_muestra_la_password_una_sola_vez() throws Exception {
        long ficha = mandarUnaFicha("CURSO");

        mvc.perform(post("/api/solicitantes/" + ficha + "/conversion")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(true))
                .andExpect(jsonPath("$.passwordTemporal").isNotEmpty())
                // La cuenta nace obligada a cambiarla, y `V8` le pone vencimiento.
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(true))
                // Un formulario público no otorga roles ni por accidente.
                .andExpect(jsonPath("$.usuario.rol").value("USUARIO"))
                .andExpect(jsonPath("$.solicitante.estado").value("CONVERTIDO"))
                .andExpect(jsonPath("$.solicitante.resueltaPor").isNotEmpty())
                .andExpect(jsonPath("$.solicitante.fechaResolucion").isNotEmpty());
    }

    /**
     * <b>El otro camino, que no es un borde raro:</b> un alumno que cursa hace un
     * año y pide la cabina desde la landing llega exactamente así. Con un solo
     * camino, esa ficha choca contra {@code usuario_email_unico} y queda trabada
     * para siempre.
     *
     * <p>Y el {@code passwordTemporal} tiene que venir <b>null</b>: la persona ya
     * tiene su contraseña y no hay nada que mandarle por WhatsApp. Una pantalla que
     * muestre un campo vacío ahí está contando mal lo que pasó.
     */
    @Test
    void convertir_a_alguien_que_ya_tenia_cuenta_la_vincula_en_vez_de_duplicarla() throws Exception {
        Usuario existente = crear(Rol.USUARIO);
        long ficha = idDe(mandarFormulario("ALQUILER_CABINA", existente.getEmail()));

        mvc.perform(post("/api/solicitantes/" + ficha + "/conversion")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(false))
                .andExpect(jsonPath("$.passwordTemporal").doesNotExist())
                .andExpect(jsonPath("$.usuario.id").value(existente.getId()))
                .andExpect(jsonPath("$.solicitante.idUsuario").value(existente.getId()));
    }

    @Test
    void una_ficha_no_se_convierte_dos_veces() throws Exception {
        long ficha = mandarUnaFicha("GRABACION_SET");

        mvc.perform(post("/api/solicitantes/" + ficha + "/conversion")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        // 403 y no 409: `OperacionNoPermitidaException` mapea a FORBIDDEN en todo el
        // sistema, y es la misma que usa el Módulo 4 para "esa solicitud ya fue
        // resuelta". Lo que importa del caso es que llegue el mensaje redactado y
        // que la segunda conversión no haya creado una cuenta.
        mvc.perform(post("/api/solicitantes/" + ficha + "/conversion")
                .header("Authorization", comoStaff()))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("ya fue atendida")));
    }

    /**
     * Lo mismo, pero contra la base y por SQL crudo.
     *
     * <p>El chequeo del servicio existe para el mensaje y para no llegar a crear la
     * cuenta; <b>quien sostiene la regla es el trigger de `V20` §2</b>, que es la
     * función que `V13` ya tenía. Sin este caso, borrar el {@code if} del servicio
     * deja la suite verde y el esquive abierto: volver la ficha a PENDIENTE y
     * convertirla otra vez, con dos cuentas para la misma persona.
     */
    @Test
    void la_base_impide_reabrir_una_ficha_resuelta() throws Exception {
        long ficha = mandarUnaFicha("OTRO");
        mvc.perform(post("/api/solicitantes/" + ficha + "/conversion")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE solicitante SET estado = 'PENDIENTE' WHERE id_solicitante = ?", ficha))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("ya fue resuelta");
    }

    // == El descarte =========================================================

    @Test
    void descartar_deja_la_ficha_firmada_y_con_su_motivo() throws Exception {
        long ficha = mandarUnaFicha("CURSO");

        mvc.perform(patch("/api/solicitantes/" + ficha + "/descarte")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"Llamé tres veces y no contesta"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("DESCARTADO"))
                .andExpect(jsonPath("$.respuesta").value("Llamé tres veces y no contesta"))
                .andExpect(jsonPath("$.resueltaPor").isNotEmpty())
                .andExpect(jsonPath("$.fechaResolucion").isNotEmpty())
                // Descartar no crea ninguna cuenta.
                .andExpect(jsonPath("$.idUsuario").doesNotExist());
    }

    /**
     * Sin motivo no hay descarte. Lo pide `V20` y lo ataja antes la validación, que
     * es lo que hace que el error diga qué falta en vez de llegar como violación de
     * constraint.
     */
    @Test
    void descartar_sin_motivo_no_va() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");

        mvc.perform(patch("/api/solicitantes/" + ficha + "/descarte")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"   "}
                        """))
                .andExpect(status().isBadRequest());
    }

    /**
     * Una ficha no se borra: se descarta. El que se pierde borrando es el lead real,
     * no el spam — el spam descartado no molesta a nadie porque el buzón filtra por
     * estado.
     */
    @Test
    void una_ficha_no_se_borra() throws Exception {
        long ficha = mandarUnaFicha("CURSO");
        em.flush();

        assertThatThrownBy(() -> jdbc.update("DELETE FROM solicitante WHERE id_solicitante = ?", ficha))
                .isInstanceOf(DataAccessException.class)
                // La enumeración es la mitad útil del mensaje (`V18`): dice cómo se
                // retira ESTA tabla.
                .hasMessageContaining("solicitante -> DESCARTADO");
    }

    // == Helpers =============================================================

    private long mandarUnaFicha(String interes) throws Exception {
        return idDe(mandarFormulario(interes, unEmail()));
    }

    private ResultActions mandarFormulario(String interes, String email) throws Exception {
        return mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"%s","detalle":"Programa DJ · presencial",
                         "mensaje":"Quiero arrancar en marzo"}
                        """.formatted(email, unTelefono(), interes)));
    }

    /**
     * Se lee la respuesta como texto y no con un {@code ObjectMapper}, igual que el
     * resto de las suites: en Boot 4.1 Jackson pasó a ser el 3 y cambió de paquete
     * ({@code tools.jackson.databind}), así que un mapper inyectado acá es una
     * dependencia de más sobre algo que ya se movió una vez.
     */
    private long idDe(ResultActions respuesta) throws Exception {
        String cuerpo = respuesta.andReturn().getResponse().getContentAsString();
        String clave = "\"idSolicitante\":";
        int desde = cuerpo.indexOf(clave) + clave.length();
        return Long.parseLong(cuerpo.substring(desde, cuerpo.indexOf(',', desde)).trim());
    }

    private String unEmail() {
        return "solicitante-" + UUID.randomUUID() + "@ejemplo.com";
    }

    private String unTelefono() {
        return "11-4000-" + String.format("%06d", SECUENCIA.incrementAndGet());
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Buzon" + rol.name());
        usuario.setEmail("buzon-" + UUID.randomUUID() + "@lajuanita.local");
        usuario.setTelefono(unTelefono());
        usuario.setPasswordHash("$2a$10$noSeUsaEnEsteTest000000000000000000000000000000000000");
        usuario.setRol(rol);
        return usuarios.save(usuario);
    }

    private String credencialPara(Usuario usuario) {
        Instant ahora = Instant.now();
        JwtClaimsSet reclamos = JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(3600))
                .subject(String.valueOf(usuario.getId()))
                .claim("rol", usuario.getRol().name())
                .build();

        return "Bearer " + codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamos)).getTokenValue();
    }
}
