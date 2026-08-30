package com.lajuanita.backend.pago;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.LocalDate;
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
import org.springframework.test.web.servlet.request.MockMultipartHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

/**
 * Los comprobantes de un pago (`V21`) — la deuda más vieja del Módulo 3.
 *
 * <p>Hasta esta tanda el comprobante era <b>texto que alguien tipeaba</b>: el campo
 * decía "transferencia.pdf" y no había ningún archivo en ninguna parte. Lo que se
 * prueba acá, entonces, no es un campo más sino que exista el archivo y que las
 * reglas que lo protegen lleguen a la pantalla.
 *
 * <p><b>Tres de los casos atacan la base por SQL, salteando el servicio</b>, y es a
 * propósito: la migración se escribió porque una regla de plata no puede depender
 * de que el próximo endpoint se acuerde de llamarla. Si alguien "simplifica"
 * {@code ComprobanteService}, esos tres siguen rojos.
 *
 * <p>Y los dos del portal van de a pares —el propio y el del vecino, por el mismo
 * endpoint—, que es el molde que el Módulo 4 dejó: <b>un filtro de identidad que
 * falta es invisible</b>, porque la pantalla anda igual y muestra de más.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ComprobanteTest {

    private static final LocalDate HOY = LocalDate.of(2030, 6, 10);

    /** Un PDF de mentira con el encabezado bien: el sistema mira el contenido. */
    private static final byte[] PDF = "%PDF-1.4\ncomprobante de prueba".getBytes(StandardCharsets.UTF_8);

    /** Y una foto: media caja llega como la captura de una transferencia. */
    private static final byte[] JPG = { (byte) 0xFF, (byte) 0xD8, (byte) 0xFF, 0x00, 0x11, 0x22 };

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private AlumnoRepository alumnos;
    @Autowired private InscripcionRepository inscripciones;
    @Autowired private JdbcTemplate jdbc;
    @PersistenceContext private EntityManager em;

    // == Adjuntar =============================================================

    @Test
    void adjuntar_un_comprobante_lo_cuelga_del_pago() throws Exception {
        long idPago = pagoNuevo();

        mvc.perform(adjuntar(idPago, "transferencia agosto.pdf", "application/pdf", PDF))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idComprobante").isNumber())
                .andExpect(jsonPath("$.invalido").value(false))
                // La firma es el dato: quién lo adjuntó viaja resuelto.
                .andExpect(jsonPath("$.cargadoPor").isNotEmpty())
                .andExpect(jsonPath("$.fechaCreacion").isNotEmpty());

        mvc.perform(get("/api/pagos/" + idPago).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.comprobantes.length()").value(1));
    }

    /**
     * <b>El nombre lo elige el sistema, no quien sube.</b> Lo que se guarda en disco
     * es un UUID; el nombre original queda en la base para que la descarga llegue
     * llamándose parecido a lo que la persona espera, ya saneado.
     */
    @Test
    void el_nombre_del_archivo_se_sanea_y_no_decide_donde_se_guarda() throws Exception {
        long idPago = pagoNuevo();

        mvc.perform(adjuntar(idPago, "../../application.properties", "application/pdf", PDF))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.nombreOriginal").value("application.properties"));

        em.flush();
        assertThat(jdbc.queryForObject(
                "SELECT archivo_path FROM comprobante_pago WHERE id_pago = ?", String.class, idPago))
                .startsWith("comprobantes/")
                .doesNotContain("application.properties");
    }

    /** El escalón de abajo, el que se cruza sin querer y también a propósito. */
    @Test
    void un_archivo_que_no_es_lo_que_dice_no_entra() throws Exception {
        mvc.perform(adjuntar(pagoNuevo(), "comprobante.pdf", "application/pdf",
                new byte[] { 'M', 'Z', (byte) 0x90, 0x00 }))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("mira el contenido")));
    }

    @Test
    void no_se_adjunta_a_un_pago_que_no_existe() throws Exception {
        mvc.perform(adjuntar(999_999L, "transferencia.pdf", "application/pdf", PDF))
                .andExpect(status().isNotFound());
    }

    // == Bajar ================================================================

    /**
     * <b>El {@code Content-Type} sale de lo que el archivo es</b>, no de un valor
     * fijo. {@code ContratoController} contesta siempre {@code application/pdf}, y
     * eso alcanzaba mientras el único archivo del sistema fuera un contrato
     * escaneado: acá la mitad de los comprobantes son fotos, y bajarlas como PDF le
     * deja al alumno un archivo que no abre nada.
     */
    @Test
    void una_foto_se_baja_como_foto_y_con_su_nombre() throws Exception {
        long idPago = pagoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "captura.jpg", "image/jpeg", JPG)));

        mvc.perform(get("/api/pagos/" + idPago + "/comprobantes/" + idComprobante + "/archivo")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "image/jpeg"))
                .andExpect(header().string("Content-Disposition",
                        Matchers.containsString("captura.jpg")));
    }

    /**
     * El id del pago viaja en la URL <b>y se verifica</b>: sin esa condición,
     * {@code /api/pagos/9/comprobantes/3} serviría el comprobante 3 aunque sea del
     * pago 4 — y quien lo mira creería estar viendo el respaldo de otra plata.
     */
    @Test
    void no_se_baja_el_comprobante_de_un_pago_desde_otro_pago() throws Exception {
        long idPago = pagoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "transferencia.pdf", "application/pdf", PDF)));

        mvc.perform(get("/api/pagos/" + pagoNuevo() + "/comprobantes/" + idComprobante + "/archivo")
                .header("Authorization", comoStaff()))
                .andExpect(status().isNotFound());
    }

    // == El portal: de a pares ================================================

    /**
     * <b>La pantalla que el Módulo 4 dejó anotada como pendiente</b> — <i>"la
     * descarga de comprobantes necesita el {@code StorageService} de §2.4, que
     * todavía no existe"</i>.
     */
    @Test
    void el_alumno_baja_su_comprobante() throws Exception {
        Alumno alumno = alumnoNuevo();
        long idPago = pagoDe(alumno);
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "mi-transferencia.pdf", "application/pdf", PDF)));

        mvc.perform(get("/api/me/comprobantes/" + idComprobante)
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"));
    }

    /** Y el del vecino contesta "no existe", que es lo que no le confirma nada a nadie. */
    @Test
    void el_alumno_no_baja_el_comprobante_de_otro() throws Exception {
        long idPago = pagoDe(alumnoNuevo());
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "ajeno.pdf", "application/pdf", PDF)));

        mvc.perform(get("/api/me/comprobantes/" + idComprobante)
                .header("Authorization", credencialPara(alumnoNuevo().getUsuario())))
                .andExpect(status().isNotFound());
    }

    // == Invalidar, que es la razón de que esto sea una tabla =================

    @Test
    void invalidar_marca_el_comprobante_y_no_lo_borra() throws Exception {
        long idPago = pagoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "equivocado.pdf", "application/pdf", PDF)));

        mvc.perform(invalidar(idPago, idComprobante, "Era de otra transferencia"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.invalido").value(true))
                .andExpect(jsonPath("$.invalidadoPor").isNotEmpty())
                .andExpect(jsonPath("$.motivoInvalidacion").isNotEmpty());

        em.flush();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM comprobante_pago WHERE id_comprobante = ?",
                Integer.class, idComprobante)).isEqualTo(1);
    }

    /**
     * <b>El caso que justifica la migración entera.</b> Con la columna de `V1` esto
     * era imposible: el comprobante correcto tenía que pisar al anterior, y al
     * pisarlo se llevaba puesta la firma de quien dijo que el anterior no servía —
     * o sea que el mecanismo que existía para dejar rastro era el que lo borraba.
     */
    @Test
    void despues_de_invalidar_se_adjunta_el_correcto_y_quedan_los_dos() throws Exception {
        long idPago = pagoNuevo();
        long malo = idDe(mvc.perform(adjuntar(idPago, "equivocado.pdf", "application/pdf", PDF)));
        mvc.perform(invalidar(idPago, malo, "Era de otra transferencia")).andExpect(status().isOk());

        mvc.perform(adjuntar(idPago, "el-que-va.pdf", "application/pdf", JPG))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/pagos/" + idPago).header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.comprobantes.length()").value(2))
                .andExpect(jsonPath("$.comprobantes[0].invalido").value(true))
                .andExpect(jsonPath("$.comprobantes[0].motivoInvalidacion").isNotEmpty())
                .andExpect(jsonPath("$.comprobantes[1].invalido").value(false));
    }

    @Test
    void no_se_invalida_dos_veces() throws Exception {
        long idPago = pagoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "uno.pdf", "application/pdf", PDF)));
        mvc.perform(invalidar(idPago, idComprobante, "No sirve")).andExpect(status().isOk());

        mvc.perform(invalidar(idPago, idComprobante, "Tampoco sirve"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("ya está marcado")));
    }

    @Test
    void invalidar_sin_motivo_no_pasa() throws Exception {
        long idPago = pagoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "uno.pdf", "application/pdf", PDF)));

        mvc.perform(invalidar(idPago, idComprobante, "   "))
                .andExpect(status().isBadRequest());
    }

    // == Las tres reglas que sostiene la base, atacadas por SQL ===============

    /** `V21` §2: la misma función que protege pagos, clases y fichas del buzón. */
    @Test
    void un_comprobante_no_se_borra() throws Exception {
        long idComprobante = idDe(mvc.perform(
                adjuntar(pagoNuevo(), "uno.pdf", "application/pdf", PDF)));
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "DELETE FROM comprobante_pago WHERE id_comprobante = ?", idComprobante))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("No se borran filas");
    }

    /**
     * `V21` §3, primera mitad: sin esto la tabla no compra nada — cambiar
     * {@code archivo_path} es la columna pisada de siempre, con más pasos.
     */
    @Test
    void el_archivo_de_un_comprobante_no_se_cambia() throws Exception {
        long idComprobante = idDe(mvc.perform(
                adjuntar(pagoNuevo(), "uno.pdf", "application/pdf", PDF)));
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE comprobante_pago SET archivo_path = 'comprobantes/otro.pdf' "
                        + "WHERE id_comprobante = ?", idComprobante))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("no se cambia");
    }

    /**
     * `V21` §3, segunda mitad — y la que estuvo a punto de faltar. Es la forma
     * exacta de `V18` §1b: desde adentro de <i>"no se borra, se marca"</i> no se ve
     * la otra mitad, que la marca tampoco se borre. Sin este trigger, un UPDATE
     * devuelve a válido un comprobante que alguien firmó como inválido y no queda
     * rastro de la vuelta atrás.
     */
    @Test
    void una_invalidacion_no_se_deshace() throws Exception {
        long idPago = pagoNuevo();
        long idComprobante = idDe(mvc.perform(adjuntar(idPago, "uno.pdf", "application/pdf", PDF)));
        mvc.perform(invalidar(idPago, idComprobante, "No sirve")).andExpect(status().isOk());
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE comprobante_pago SET invalido = FALSE WHERE id_comprobante = ?", idComprobante))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("no vuelve atras");
    }

    // =========================================================================

    private MockMultipartHttpServletRequestBuilder adjuntar(
            long idPago, String nombre, String tipo, byte[] contenido) {

        return multipart("/api/pagos/" + idPago + "/comprobantes")
                .file(new MockMultipartFile("archivo", nombre, tipo, contenido))
                .header("Authorization", comoStaff());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder invalidar(
            long idPago, long idComprobante, String motivo) {

        return patch("/api/pagos/" + idPago + "/comprobantes/" + idComprobante + "/invalidacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"%s"}
                        """.formatted(motivo));
    }

    /** Un pago cualquiera, para tener de dónde colgar el archivo. */
    private long pagoNuevo() throws Exception {
        return pagoDe(alumnoNuevo());
    }

    private long pagoDe(Alumno alumno) throws Exception {
        Inscripcion curso = inscripcionDe(alumno);

        String cuerpo = mvc.perform(post("/api/pagos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                         "medioPago":"TRANSFERENCIA"}
                        """.formatted(alumno.getUsuario().getId(), curso.getId())))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        return extraer(cuerpo, "\"idPago\":");
    }

    private long idDe(ResultActions resultado) throws Exception {
        return extraer(resultado.andReturn().getResponse().getContentAsString(), "\"idComprobante\":");
    }

    private long extraer(String cuerpo, String clave) {
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return Long.parseLong(cuerpo.substring(desde, hasta).trim());
    }

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    private Inscripcion inscripcionDe(Alumno alumno) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(Disciplina.DJ);
        inscripcion.setNivel(Nivel.INICIAL);
        inscripcion.setClasesContratadas((short) 8);
        inscripcion.setPrecioTotal(new BigDecimal("180000"));
        inscripcion.setMoneda(Moneda.ARS);
        inscripcion.setFechaInicio(HOY);
        return inscripciones.save(inscripcion);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Comprobante" + rol.name());
        usuario.setEmail("comprobante-" + UUID.randomUUID() + "@lajuanita.local");
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
