package com.lajuanita.backend.pago;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Los comprobantes de un egreso (`V25`, `docs/mejoras.md` §14 · C1).
 *
 * <p>Hasta esta migración el comprobante de un egreso era <b>texto que alguien
 * tipeaba</b> —{@code egreso.comprobante_path}, la misma columna que `V21` le sacó
 * a {@code pago}—, así que la pantalla mostraba respaldo donde no había ningún
 * archivo.
 *
 * <p>⚠️ <b>Del lado del egreso la regla pesa más, y por eso esta suite existe
 * aunque sea el espejo de {@code ComprobanteTest}.</b> Un cobro sin comprobante lo
 * reclama el que pagó; <b>una salida de plata sin comprobante no la reclama
 * nadie</b> — el que la cobró está contento y el que la firmó es el mismo que la
 * cargó. Este archivo es la única prueba de que ese sueldo se pagó.
 *
 * <p><b>Tres casos atacan la base por SQL, salteando el servicio</b>, y es a
 * propósito: la migración se escribió porque una regla de plata no puede depender
 * de que el próximo endpoint se acuerde de llamarla. Si alguien "simplifica"
 * {@code ComprobanteEgresoService}, esos tres siguen rojos.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ComprobanteEgresoTest {

    /** Un PDF de mentira con el encabezado bien: el sistema mira el contenido. */
    private static final byte[] PDF = "%PDF-1.4\nrecibo de sueldo".getBytes(StandardCharsets.UTF_8);

    /** Y una foto: media caja llega como la captura de una transferencia. */
    private static final byte[] JPG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x11, 0x22 };

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private JdbcTemplate jdbc;
    @PersistenceContext private EntityManager em;

    // == Adjuntar =============================================================

    @Test
    void adjuntar_un_comprobante_lo_cuelga_del_egreso() throws Exception {
        long idEgreso = egresoNuevo();

        mvc.perform(adjuntar(idEgreso, "recibo agosto.pdf", "application/pdf", PDF))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idComprobante").isNumber())
                .andExpect(jsonPath("$.invalido").value(false))
                // La firma es el dato: quién lo adjuntó viaja resuelto.
                .andExpect(jsonPath("$.cargadoPor").isNotEmpty())
                .andExpect(jsonPath("$.fechaCreacion").isNotEmpty());

        mvc.perform(get("/api/egresos").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.idEgreso == " + idEgreso + ")].comprobantes.length()")
                        .value(1));
    }

    /**
     * <b>El nombre lo elige el sistema, no quien sube.</b> Lo que llega se sanea
     * —vuelve en la cabecera de la descarga— y no decide dónde se guarda nada.
     *
     * <p>El saneo vive en {@code NombreDeArchivo} y no copiado en cada servicio:
     * dos copias se despegan sin que nada falle, un lado empieza a aceptar un
     * carácter que el otro rechaza y nadie se entera hasta que una descarga sale
     * rota.
     */
    @Test
    void el_nombre_del_archivo_se_sanea() throws Exception {
        mvc.perform(adjuntar(egresoNuevo(), "../Recibo Sueldo (Ghezz).PDF", "application/pdf", PDF))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombreOriginal").value("recibo_sueldo__ghezz_.pdf"));
    }

    @Test
    void un_archivo_que_no_es_lo_que_dice_no_entra() throws Exception {
        mvc.perform(adjuntar(egresoNuevo(), "recibo.pdf", "application/pdf",
                "esto es texto plano".getBytes(StandardCharsets.UTF_8)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void no_se_adjunta_a_un_egreso_que_no_existe() throws Exception {
        mvc.perform(adjuntar(999999L, "recibo.pdf", "application/pdf", PDF))
                .andExpect(status().isNotFound());
    }

    /** Un DIRECTIVO lee la caja entera y no escribe nada, tampoco acá. */
    @Test
    void un_directivo_no_adjunta() throws Exception {
        mvc.perform(multipart("/api/egresos/" + egresoNuevo() + "/comprobantes")
                .file(new MockMultipartFile("archivo", "recibo.pdf", "application/pdf", PDF))
                .header("Authorization", credencialPara(crear(Rol.DIRECTIVO))))
                .andExpect(status().isForbidden());
    }

    // == Bajar ================================================================

    /**
     * El tipo sale del archivo y no de una constante: media caja llega como la foto
     * de una transferencia, y servirla como PDF le da a quien la baja un archivo
     * que no abre nada. Es el error que {@code ContratoController} tenía y que el
     * comprobante corrigió.
     */
    @Test
    void una_foto_se_baja_como_foto_y_con_su_nombre() throws Exception {
        long idEgreso = egresoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idEgreso, "transferencia.jpg", "image/jpeg", JPG)));

        mvc.perform(get("/api/egresos/" + idEgreso + "/comprobantes/" + idComprobante + "/archivo")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(header().string("Content-Disposition",
                        Matchers.containsString("transferencia.jpg")));
    }

    /**
     * ⚠️ <b>El id del egreso en la URL no es decoración.</b> Sin verificarlo,
     * {@code /api/egresos/9/comprobantes/3/archivo} serviría el comprobante 3
     * aunque sea del egreso 4 — o sea el recibo de sueldo de otra persona. Es la
     * razón por la que {@code ComprobanteEgresoRepository} no tiene un "buscar por
     * id" pelado.
     */
    @Test
    void no_se_baja_el_comprobante_de_un_egreso_desde_otro_egreso() throws Exception {
        long idEgreso = egresoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idEgreso, "recibo.pdf", "application/pdf", PDF)));
        long otroEgreso = egresoNuevo();

        mvc.perform(get("/api/egresos/" + otroEgreso + "/comprobantes/" + idComprobante + "/archivo")
                .header("Authorization", comoStaff()))
                .andExpect(status().isNotFound());
    }

    // == Invalidar ============================================================

    @Test
    void invalidar_marca_el_comprobante_y_no_lo_borra() throws Exception {
        long idEgreso = egresoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idEgreso, "malo.pdf", "application/pdf", PDF)));

        mvc.perform(invalidar(idEgreso, idComprobante, "Es el recibo de otro mes"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invalido").value(true))
                .andExpect(jsonPath("$.motivoInvalidacion").value("Es el recibo de otro mes"))
                // La firma entera: sin quién ni cuándo, marcar no deja rastro.
                .andExpect(jsonPath("$.invalidadoPor").isNotEmpty())
                .andExpect(jsonPath("$.fechaInvalidacion").isNotEmpty());
    }

    /**
     * <b>Éste es el caso que explica por qué `V25` hizo una tabla.</b> Con una sola
     * columna el comprobante correcto tenía que pisar al equivocado, o sea borrar la
     * firma de quien lo rechazó. Acá quedan los dos.
     */
    @Test
    void despues_de_invalidar_se_adjunta_el_correcto_y_quedan_los_dos() throws Exception {
        long idEgreso = egresoNuevo();
        long malo = idDe(mvc.perform(adjuntar(idEgreso, "malo.pdf", "application/pdf", PDF)));
        mvc.perform(invalidar(idEgreso, malo, "Es de otro mes")).andExpect(status().isOk());

        mvc.perform(adjuntar(idEgreso, "elqueva.pdf", "application/pdf", PDF))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/egresos").header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.contenido[?(@.idEgreso == " + idEgreso + ")].comprobantes.length()")
                        .value(2));
    }

    @Test
    void no_se_invalida_dos_veces() throws Exception {
        long idEgreso = egresoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idEgreso, "uno.pdf", "application/pdf", PDF)));
        mvc.perform(invalidar(idEgreso, idComprobante, "No sirve")).andExpect(status().isOk());

        mvc.perform(invalidar(idEgreso, idComprobante, "Tampoco sirve"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void invalidar_sin_motivo_no_pasa() throws Exception {
        long idEgreso = egresoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idEgreso, "uno.pdf", "application/pdf", PDF)));

        mvc.perform(invalidar(idEgreso, idComprobante, "   "))
                .andExpect(status().isBadRequest());
    }

    // == Las tres reglas que sostiene la base, atacadas por SQL ===============

    /** `V25` §2: la misma función que protege pagos, clases y fichas del buzón. */
    @Test
    void un_comprobante_de_egreso_no_se_borra() throws Exception {
        long idComprobante = idDe(mvc.perform(
                adjuntar(egresoNuevo(), "uno.pdf", "application/pdf", PDF)));
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "DELETE FROM comprobante_egreso WHERE id_comprobante = ?", idComprobante))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("No se borran filas");
    }

    /**
     * `V25` §3, primera mitad: sin esto la tabla no compra nada — cambiar
     * {@code archivo_path} es la columna pisada de siempre, con más pasos.
     */
    @Test
    void el_archivo_de_un_comprobante_de_egreso_no_se_cambia() throws Exception {
        long idComprobante = idDe(mvc.perform(
                adjuntar(egresoNuevo(), "uno.pdf", "application/pdf", PDF)));
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE comprobante_egreso SET archivo_path = 'otro.pdf' "
                        + "WHERE id_comprobante = ?", idComprobante))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("no se cambia");
    }

    /**
     * `V25` §3, segunda mitad — la que es fácil no escribir. Es la forma exacta de
     * `V18` §1b: desde adentro de <i>"no se borra, se marca"</i> no se ve la otra
     * mitad, que la marca tampoco se borre. Sin este trigger, un UPDATE devuelve a
     * válido un comprobante que alguien firmó como inválido y no queda rastro.
     */
    @Test
    void una_invalidacion_de_egreso_no_se_deshace() throws Exception {
        long idEgreso = egresoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idEgreso, "uno.pdf", "application/pdf", PDF)));
        mvc.perform(invalidar(idEgreso, idComprobante, "No sirve")).andExpect(status().isOk());
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE comprobante_egreso SET invalido = FALSE WHERE id_comprobante = ?",
                idComprobante))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("no vuelve atras");
    }

    // =========================================================================

    private MockMultipartHttpServletRequestBuilder adjuntar(
            long idEgreso, String nombre, String tipo, byte[] contenido) {

        return multipart("/api/egresos/" + idEgreso + "/comprobantes")
                .file(new MockMultipartFile("archivo", nombre, tipo, contenido))
                .header("Authorization", comoStaff());
    }

    private MockHttpServletRequestBuilder invalidar(long idEgreso, long idComprobante, String motivo) {
        return patch("/api/egresos/" + idEgreso + "/comprobantes/" + idComprobante + "/invalidacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"%s"}
                        """.formatted(motivo));
    }

    /** Un egreso cualquiera, para tener de dónde colgar el archivo. */
    private long egresoNuevo() throws Exception {
        String cuerpo = mvc.perform(post("/api/egresos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":150000,"moneda":"ARS","concepto":"Sueldo de agosto",
                         "destinatario":"Ghezz"}
                        """))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return extraer(cuerpo, "\"idEgreso\":");
    }

    private long idDe(ResultActions resultado) throws Exception {
        return extraer(resultado.andReturn().getResponse().getContentAsString(), "\"idComprobante\":");
    }

    private long extraer(String cuerpo, String clave) {
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return Long.parseLong(cuerpo.substring(desde, hasta).trim());
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("CompEgreso" + rol.name());
        usuario.setEmail("comp-egreso-" + UUID.randomUUID() + "@lajuanita.local");
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
