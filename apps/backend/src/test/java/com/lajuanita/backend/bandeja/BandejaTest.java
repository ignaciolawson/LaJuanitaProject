package com.lajuanita.backend.bandeja;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

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

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Los contadores del menú (`mejoras.md` §13 · B1).
 *
 * <p>Lo que persigue esta suite son dos cosas, y la segunda es la que se rompe
 * sin hacer ruido:
 *
 * <ul>
 *   <li><b>Quién puede pedirlos.</b> Son números de bandejas de administración,
 *       así que un {@code USUARIO} recibe 403 y {@code DIRECTIVO} —que lee todo el
 *       sistema— entra. Esconderle el número de una pantalla que sí puede abrir
 *       sería mentirle sobre lo que hay adentro.
 *   <li><b>Que cuenten lo PENDIENTE y no las filas.</b> Un contador que suma todo
 *       no falla: muestra un número más grande, y nadie que mire el sidebar tiene
 *       cómo saber que está mal. Por eso los casos miden la diferencia —cargan una
 *       ficha, la resuelven— en vez de esperar un valor fijo, que además dependería
 *       de los datos que tenga la base de desarrollo.
 * </ul>
 *
 * <p>Y una tercera que no tiene caso propio porque la cubre el solo hecho de que
 * esta clase levante: <b>{@code countByEstado} es una consulta derivada por
 * nombre</b>, así que la valida Spring al armar el contexto y no el compilador.
 * Un {@code mvn clean compile} verde no prueba nada sobre esos tres métodos.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BandejaTest {

    /** Los teléfonos son únicos entre cuentas y esta suite crea cuentas de verdad. */
    private static final AtomicInteger SECUENCIA = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;

    // == Quién los puede pedir ===============================================

    @Test
    void sin_credencial_no_se_leen() throws Exception {
        mvc.perform(get("/api/pendientes")).andExpect(status().isUnauthorized());
    }

    @Test
    void un_usuario_comun_no_los_lee() throws Exception {
        mvc.perform(get("/api/pendientes").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    /**
     * {@code DIRECTIVO} lee todo el sistema y no escribe nada. Ve estas tres
     * pantallas, así que ve sus números.
     */
    @Test
    void un_directivo_los_lee_aunque_no_pueda_resolver_nada() throws Exception {
        mvc.perform(get("/api/pendientes").header("Authorization", credencialPara(crear(Rol.DIRECTIVO))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pedidosDeSala").isNumber())
                .andExpect(jsonPath("$.pedidosDeCambio").isNumber())
                .andExpect(jsonPath("$.buzon").isNumber());
    }

    // == Qué cuentan =========================================================

    @Test
    void una_ficha_nueva_del_buzon_sube_el_contador() throws Exception {
        String staff = comoStaff();
        long antes = contar(staff, "buzon");

        mandarUnaFicha();

        assertContador(staff, "buzon", antes + 1);
    }

    /**
     * <b>El caso que separa "pendiente" de "existe".</b> Si el contador sumara
     * filas en vez de filas pendientes, no fallaría nada: mostraría un número más
     * grande para siempre, y quien mira el sidebar no tiene forma de saberlo. Es
     * el mismo modo de falla que tenía {@code EgresoRepository.porMoneda} antes de
     * que se pudiera anular.
     */
    @Test
    void una_ficha_descartada_deja_de_contar() throws Exception {
        String staff = comoStaff();
        long antes = contar(staff, "buzon");

        long idFicha = mandarUnaFicha();
        assertContador(staff, "buzon", antes + 1);

        mvc.perform(patch("/api/solicitantes/" + idFicha + "/descarte")
                .header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"motivo\":\"Nunca contesto\"}"))
                .andExpect(status().isOk());

        assertContador(staff, "buzon", antes);
    }

    // == Andamiaje ===========================================================

    /** Manda una ficha por el formulario público y devuelve su id. */
    private long mandarUnaFicha() throws Exception {
        String cuerpo = mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Perez","email":"%s","telefono":"%s",
                         "interes":"ALQUILER_CABINA"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return numeroDe(cuerpo, "idSolicitante");
    }

    private long contar(String credencial, String bandeja) throws Exception {
        String cuerpo = mvc.perform(get("/api/pendientes").header("Authorization", credencial))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString();

        return numeroDe(cuerpo, bandeja);
    }

    private void assertContador(String credencial, String bandeja, long esperado) throws Exception {
        mvc.perform(get("/api/pendientes").header("Authorization", credencial))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$." + bandeja).value(esperado));
    }

    /**
     * Se lee la respuesta como texto y no con un {@code ObjectMapper}, igual que el
     * resto de las suites: en Boot 4.1 Jackson pasó a ser el 3 y cambió de paquete
     * ({@code tools.jackson.databind}), así que un mapper acá es una dependencia de
     * más sobre algo que ya se movió una vez.
     */
    private long numeroDe(String cuerpo, String clave) {
        Matcher encontrado = Pattern.compile("\"" + clave + "\"\\s*:\\s*(\\d+)").matcher(cuerpo);
        if (!encontrado.find()) {
            throw new AssertionError("No vino \"" + clave + "\" en la respuesta: " + cuerpo);
        }
        return Long.parseLong(encontrado.group(1));
    }

    private String unEmail() {
        return "bandeja-" + UUID.randomUUID() + "@ejemplo.com";
    }

    private String unTelefono() {
        return "11-4100-" + String.format("%06d", SECUENCIA.incrementAndGet());
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Bandeja" + rol.name());
        usuario.setEmail("bandeja-" + UUID.randomUUID() + "@lajuanita.local");
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
