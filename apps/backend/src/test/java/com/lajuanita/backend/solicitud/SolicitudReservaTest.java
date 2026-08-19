package com.lajuanita.backend.solicitud;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
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

import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * Módulo 4 — el circuito del pedido de sala, de punta a punta.
 *
 * <p>Lo que esta suite persigue no es que la tabla guarde bien: es que
 * <b>el portal no pueda hacer lo que no debe</b> y que <b>administración cierre
 * el circuito</b>. El pedido existe solo porque un {@code USUARIO} no tiene cómo
 * poner plata en el sistema; si alguna vez el portal pudiera crear una reserva
 * directo, esta suite entera pierde sentido y hay que borrarla, no adaptarla.
 *
 * <p><b>Las fechas son cercanas, y va contra la costumbre del proyecto.</b> El
 * resto de las suites usa 2027 o 2030 para no chocar con lo que haya cargado a
 * mano en la base de desarrollo. Acá no se puede: pedir una sala tiene un techo
 * de {@link SolicitudReservaService#DIAS_MAXIMOS_DE_ANTICIPACION} días y una
 * fecha lejana sería rechazada por el propio servicio. El reemplazo es la hora:
 * las 22 no es horario del estudio (abre 10 a 18), así que la franja está libre
 * igual que lo estaría en 2030.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SolicitudReservaTest {

    /** Lejos, pero adentro del techo de anticipación. */
    private static final LocalDate DENTRO_DE_UN_MES = LocalDate.now().plusDays(30);

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private SalaRepository salas;
    @Autowired private TipoUsoRepository tiposDeUso;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    private Long sala1;
    private Long cabina;
    private Long alquiler;
    private Long grabacion;
    private Long claseDj;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        cabina = idDeSala("Cabina de grabación");
        alquiler = idDeTipo("ALQUILER_CABINA");
        grabacion = idDeTipo("GRABACION_SET");
        claseDj = idDeTipo("CLASE_DJ");
    }

    // == Lo que el portal puede pedir =========================================

    @Test
    void pedir_una_cabina_deja_una_solicitud_pendiente() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);

        mvc.perform(pedir(quienPide, sala1, alquiler, "22:00", "23:00"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.sala").value("Sala 1"))
                // Si esto viene null, falta el @Generated: la base puso la fecha y
                // Hibernate no la releyó. Es la trampa que ya apareció cinco veces.
                .andExpect(jsonPath("$.fechaCreacion").isNotEmpty())
                .andExpect(jsonPath("$.idReserva").doesNotExist());
    }

    /**
     * <b>El caso que pinea el eje entero del portal.</b> El alta no tiene campo
     * para decir quién pide: sale del token. Si algún día alguien le agrega un
     * {@code idUsuario} al DTO "por comodidad", se puede pedir en nombre de otro y
     * la seña de uno queda contra la cuenta del otro.
     */
    @Test
    void la_solicitud_queda_a_nombre_de_quien_la_pide_y_no_de_lo_que_diga_el_cuerpo() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);
        Usuario otro = crear(Rol.USUARIO);

        mvc.perform(post("/api/me/solicitudes")
                .header("Authorization", credencialPara(quienPide))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:00",
                         "idUsuario":%d}
                        """.formatted(sala1, alquiler, DENTRO_DE_UN_MES, otro.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").value(quienPide.getId()));
    }

    /**
     * P17: la cursada la arma administración. La marca vive en el catálogo, así que
     * lo que rechaza es un trigger y no una lista escrita en Java.
     */
    @Test
    void una_clase_no_se_pide_desde_el_portal() throws Exception {
        mvc.perform(pedir(crear(Rol.USUARIO), sala1, claseDj, "22:00", "23:00"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("no se pide desde el portal")));
    }

    /**
     * La matriz sala×uso vale igual en el pedido que en la reserva.
     *
     * <p><b>400 y no 409</b>, igual que en el calendario: la matriz es una FK
     * compuesta, y {@code ManejadorDeErrores} distingue chocar con algo que ya
     * existe (409) de mandar un dato que la base no acepta (400). Lo que importa
     * es que llegue el mensaje redactado y no el nombre de la constraint.
     */
    @Test
    void no_se_pide_una_grabacion_en_una_sala_que_no_graba() throws Exception {
        mvc.perform(pedir(crear(Rol.USUARIO), sala1, grabacion, "22:00", "23:00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("no se usa para ese tipo de actividad")));
    }

    @Test
    void no_se_pide_una_sala_para_ayer() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);

        mvc.perform(post("/api/me/solicitudes")
                .header("Authorization", credencialPara(quienPide))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:00"}
                        """.formatted(sala1, alquiler, LocalDate.now().minusDays(1))))
                .andExpect(status().isBadRequest());
    }

    @Test
    void cada_uno_ve_solo_sus_solicitudes() throws Exception {
        Usuario juan = crear(Rol.USUARIO);
        Usuario ana = crear(Rol.USUARIO);
        mvc.perform(pedir(juan, sala1, alquiler, "22:00", "23:00")).andExpect(status().isCreated());

        mvc.perform(get("/api/me/solicitudes").header("Authorization", credencialPara(juan)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mvc.perform(get("/api/me/solicitudes").header("Authorization", credencialPara(ana)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    /**
     * La ajena contesta "no existe" y no "no podés": la segunda respuesta confirma
     * que la fila existe, que es lo que alguien probando ids quiere averiguar.
     */
    @Test
    void nadie_cancela_la_solicitud_de_otro() throws Exception {
        Usuario juan = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(pedir(juan, sala1, alquiler, "22:00", "23:00")));

        mvc.perform(patch("/api/me/solicitudes/" + id + "/cancelacion")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/me/solicitudes/" + id + "/cancelacion")
                .header("Authorization", credencialPara(juan)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CANCELADA"))
                // Cancelar también firma: `V13` no deja una resolución sin autor.
                .andExpect(jsonPath("$.fechaResolucion").isNotEmpty());
    }

    // == La bandeja de administración =========================================

    /**
     * <b>El caso central del módulo.</b> Aprobar tiene que dejar tres cosas en la
     * misma transacción —la reserva, su seña y el que pidió anotado— porque `V10`
     * las verifica al COMMIT. Si alguna se cae afuera, la aprobación entera se
     * rechaza al cerrar y el mensaje no señala nada.
     */
    @Test
    void aprobar_crea_la_reserva_con_su_sena_y_anota_al_que_pidio() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(pedir(quienPide, cabina, grabacion, "22:00", "23:00")));

        String cuerpo = mvc.perform(patch("/api/solicitudes-reserva/" + id + "/aprobacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":25000,"moneda":"ARS","medioPago":"TRANSFERENCIA"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("APROBADA"))
                .andExpect(jsonPath("$.idReserva").isNumber())
                .andExpect(jsonPath("$.resueltaPor").isNotEmpty())
                .andReturn().getResponse().getContentAsString();

        long idReserva = Long.parseLong(entre(cuerpo, "\"idReserva\":"));

        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM pago WHERE id_reserva = ? AND estado_pago = 'SENADO'",
                Integer.class, idReserva)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM reserva_participante WHERE id_reserva = ? AND id_usuario = ?",
                Integer.class, idReserva, quienPide.getId())).isEqualTo(1);

        // Y la prueba de que lo anterior alcanza: el chequeo diferido de la seña,
        // forzado a correr acá adentro. Sin `em.flush()` no hay nada encolado y el
        // caso pasaría sin haber verificado nada.
        em.flush();
        jdbc.execute("SET CONSTRAINTS reserva_con_sena IMMEDIATE");
    }

    @Test
    void aprobar_le_avisa_al_que_pidio() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(pedir(quienPide, sala1, alquiler, "22:00", "23:00")));

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/aprobacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"monto\":10000,\"moneda\":\"ARS\",\"medioPago\":\"EFECTIVO\"}"))
                .andExpect(status().isOk());

        mvc.perform(get("/api/me/notificaciones").header("Authorization", credencialPara(quienPide)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tipo").value("SOLICITUD_APROBADA"))
                .andExpect(jsonPath("$[0].leida").value(false));
    }

    /** `V10` otra vez: sin seña no hay reserva, así que el DTO la exige antes. */
    @Test
    void no_se_aprueba_sin_cargar_la_sena() throws Exception {
        long id = idDe(mvc.perform(pedir(crear(Rol.USUARIO), sala1, alquiler, "22:00", "23:00")));

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/aprobacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"dale\"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rechazar_sin_decir_por_que_no_pasa() throws Exception {
        long id = idDe(mvc.perform(pedir(crear(Rol.USUARIO), sala1, alquiler, "22:00", "23:00")));

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/rechazo")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"  \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rechazar_avisa_con_el_motivo_adentro() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(pedir(quienPide, sala1, alquiler, "22:00", "23:00")));

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/rechazo")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"esa noche hay mantenimiento\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("RECHAZADA"));

        mvc.perform(get("/api/me/notificaciones").header("Authorization", credencialPara(quienPide)))
                .andExpect(jsonPath("$[0].tipo").value("SOLICITUD_RECHAZADA"))
                .andExpect(jsonPath("$[0].contenido").value(
                        org.hamcrest.Matchers.containsString("mantenimiento")));
    }

    /**
     * El pre-chequeo del servicio, y no es de adorno: sin él, la segunda aprobación
     * llega a crear una segunda reserva y recién ahí la rechaza el trigger — con la
     * franja duplicada en el intento.
     */
    @Test
    void una_solicitud_no_se_resuelve_dos_veces() throws Exception {
        long id = idDe(mvc.perform(pedir(crear(Rol.USUARIO), sala1, alquiler, "22:00", "23:00")));

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/rechazo")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"no se puede\"}"))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/aprobacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"monto\":10000,\"moneda\":\"ARS\",\"medioPago\":\"EFECTIVO\"}"))
                .andExpect(status().isForbidden());
    }

    // == Permisos =============================================================

    @Test
    void un_usuario_no_aprueba_su_propia_solicitud() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(pedir(quienPide, sala1, alquiler, "22:00", "23:00")));

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/aprobacion")
                .header("Authorization", credencialPara(quienPide))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"monto\":10000,\"moneda\":\"ARS\",\"medioPago\":\"EFECTIVO\"}"))
                .andExpect(status().isForbidden());

        mvc.perform(get("/api/solicitudes-reserva").header("Authorization", credencialPara(quienPide)))
                .andExpect(status().isForbidden());
    }

    /** DIRECTIVO lee todo y no escribe nada. Es la razón de que haya cuatro roles. */
    @Test
    void un_directivo_ve_la_bandeja_y_no_resuelve() throws Exception {
        long id = idDe(mvc.perform(pedir(crear(Rol.USUARIO), sala1, alquiler, "22:00", "23:00")));
        String directivo = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/solicitudes-reserva?estado=PENDIENTE")
                .header("Authorization", directivo))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/rechazo")
                .header("Authorization", directivo)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"no\"}"))
                .andExpect(status().isForbidden());
    }

    // == Lo que sostiene la base ==============================================

    @Test
    void una_solicitud_no_se_borra_ni_por_sql() throws Exception {
        long id = idDe(mvc.perform(pedir(crear(Rol.USUARIO), sala1, alquiler, "22:00", "23:00")));
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "DELETE FROM solicitud_reserva WHERE id_solicitud_reserva = ?", id))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("solicitud_reserva -> CANCELADA");
    }

    /**
     * El esquive que cierra `V13` §4: resolver, volver a pendiente, resolver otra
     * vez. Sobre una aprobada serían dos reservas y dos señas.
     */
    @Test
    void una_solicitud_resuelta_no_vuelve_a_pendiente_ni_por_sql() throws Exception {
        long id = idDe(mvc.perform(pedir(crear(Rol.USUARIO), sala1, alquiler, "22:00", "23:00")));
        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/rechazo")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"no se puede\"}"))
                .andExpect(status().isOk());
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE solicitud_reserva SET estado = 'PENDIENTE' WHERE id_solicitud_reserva = ?", id))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("ya fue resuelta");
    }

    // =========================================================================

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder pedir(
            Usuario quienPide, Long idSala, Long idTipoUso, String desde, String hasta) {

        return post("/api/me/solicitudes")
                .header("Authorization", credencialPara(quienPide))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s",
                         "comentario":"para practicar"}
                        """.formatted(idSala, idTipoUso, DENTRO_DE_UN_MES, desde, hasta));
    }

    private long idDe(ResultActions resultado) throws Exception {
        return Long.parseLong(entre(
                resultado.andReturn().getResponse().getContentAsString(), "\"idSolicitud\":"));
    }

    private String entre(String cuerpo, String clave) {
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return cuerpo.substring(desde, hasta).trim();
    }

    private Long idDeSala(String nombre) {
        return salas.findAll().stream()
                .filter(s -> s.getNombreSala().equals(nombre))
                .findFirst().orElseThrow().getId();
    }

    private Long idDeTipo(String codigo) {
        return tiposDeUso.findAll().stream()
                .filter(t -> t.getCodigo().equals(codigo))
                .findFirst().orElseThrow().getId();
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Solicitud" + rol.name());
        usuario.setEmail("solicitud-" + UUID.randomUUID() + "@lajuanita.local");
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
