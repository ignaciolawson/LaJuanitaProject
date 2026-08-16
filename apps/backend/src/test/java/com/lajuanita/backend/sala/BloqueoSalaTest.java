package com.lajuanita.backend.sala;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
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
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 2, pantalla 3 — bloqueo de sala.
 *
 * <p>Igual que en {@code ReservaTest}: <b>casi todo lo que se prueba acá lo
 * impone la base</b>, y el valor de estos casos es verificar que esas reglas
 * lleguen a la pantalla con el estado HTTP correcto y una frase legible. Una
 * regla que la base cumple y que sale como 500 no sirve.
 *
 * <p>Las fechas son de 2028 —no 2027, que es la que usa {@code ReservaTest}—
 * para que las dos suites no se pisen contra la base de desarrollo: tanto el
 * EXCLUDE de bloqueos como los dos triggers miran <b>todo</b> lo que hay
 * cargado, no solo lo que creó el caso.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class BloqueoSalaTest {

    private static final LocalDate LUNES = LocalDate.of(2028, 5, 1);
    private static final LocalDate VIERNES = LUNES.plusDays(4);

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private SalaRepository salas;

    @Autowired
    private TipoUsoRepository tiposDeUso;

    private Long sala1;
    private Long sala2;
    private Long claseDj;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        sala2 = idDeSala("Sala 2");
        claseDj = idDeTipo("CLASE_DJ");
    }

    // == El alta ==============================================================

    @Test
    void bloquear_una_sala_la_deja_en_el_listado() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "Refacción del piso"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.sala").value("Sala 1"))
                .andExpect(jsonPath("$.motivo").value("Refacción del piso"));

        mvc.perform(get("/api/bloqueos?desde=" + LUNES + "&idSala=" + sala1)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].motivo").value("Refacción del piso"));
    }

    /**
     * El caso principal del negocio: "la Sala 2 está en refacción toda la
     * semana". Sin horas es el día entero, y la pantalla necesita saber que lo
     * es para no dibujar "00:00 a 23:59", que no es como se dice.
     */
    @Test
    void sin_horas_el_bloqueo_toma_el_dia_entero() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "Mantenimiento"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.diaCompleto").value(true))
                .andExpect(jsonPath("$.horaInicio").value("00:00:00"))
                .andExpect(jsonPath("$.horaFin").value("23:59:00"));
    }

    @Test
    void un_bloqueo_con_franja_horaria_no_es_dia_completo() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, "09:00", "13:00", "Obra"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.diaCompleto").value(false));
    }

    /** Queda firmado quién lo cargó: el autor sale del token, no del cuerpo. */
    @Test
    void el_bloqueo_queda_firmado_por_quien_lo_carga() throws Exception {
        Usuario mica = crear(Rol.STAFF);

        mvc.perform(post("/api/bloqueos")
                .header("Authorization", credencialPara(mica))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo(sala1, LUNES, VIERNES, null, null, "Mantenimiento")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.registradoPor").value(mica.getNombre() + " " + mica.getApellido()))
                .andExpect(jsonPath("$.fechaRegistro").isNotEmpty());
    }

    // == Las dos reglas del esquema, vistas desde la pantalla =================

    /**
     * Regla dura del alcance §5: <i>"una sala bloqueada no acepta reservas
     * mientras dure el bloqueo"</i>. La impone {@code reserva_respeta_bloqueos}.
     */
    @Test
    void una_sala_bloqueada_no_acepta_reservas() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "Refacción"))
                .andExpect(status().isCreated());

        mvc.perform(reservar(sala1, LUNES.plusDays(1), "10:00", "11:30"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("bloqueada")));
    }

    /** Fuera de la franja, el mismo día, la sala sigue libre. */
    @Test
    void un_bloqueo_parcial_deja_libre_el_resto_del_dia() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, "09:00", "13:00", "Obra"))
                .andExpect(status().isCreated());

        mvc.perform(reservar(sala1, LUNES.plusDays(2), "15:00", "16:30"))
                .andExpect(status().isCreated());
    }

    /** El camino inverso: primero se mueven las clases, después se bloquea. */
    @Test
    void no_se_bloquea_una_sala_con_reservas_activas_adentro() throws Exception {
        mvc.perform(reservar(sala1, LUNES.plusDays(1), "10:00", "11:30"))
                .andExpect(status().isCreated());

        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "Refacción"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString("reserva")));
    }

    /** La definición canónica: una cancelada no ocupa la sala, así que no estorba. */
    @Test
    void una_reserva_cancelada_no_impide_bloquear() throws Exception {
        long reserva = idDe(mvc.perform(reservar(sala1, LUNES.plusDays(1), "10:00", "11:30")));

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .patch("/api/reservas/" + reserva + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "Refacción"))
                .andExpect(status().isCreated());
    }

    // == El EXCLUDE de `V7` ===================================================

    @Test
    void dos_bloqueos_que_se_pisan_no_entran() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "Refacción"))
                .andExpect(status().isCreated());

        mvc.perform(bloquear(sala1, LUNES.plusDays(2), VIERNES.plusDays(3), null, null, "Otra cosa"))
                .andExpect(status().isConflict());
    }

    /**
     * <b>El caso que `V7` arregló.</b> Una fila es una franja que se repite todos
     * los días del rango, no un intervalo continuo: mantenimiento de 9 a 13 toda
     * la semana y un evento de 19 a 23 el miércoles y el jueves <b>no se pisan
     * ningún día</b>. El EXCLUDE de `V6` los rechazaba, y ese error se descubrió
     * porque ningún caso usaba horario parcial en un rango multi-día.
     */
    @Test
    void dos_bloqueos_del_mismo_rango_en_franjas_distintas_conviven() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, "09:00", "13:00", "Mantenimiento"))
                .andExpect(status().isCreated());

        mvc.perform(bloquear(sala1, LUNES.plusDays(2), LUNES.plusDays(3), "19:00", "23:00", "Evento"))
                .andExpect(status().isCreated());
    }

    @Test
    void el_mismo_rango_en_otra_sala_no_choca() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "Refacción"))
                .andExpect(status().isCreated());

        mvc.perform(bloquear(sala2, LUNES, VIERNES, null, null, "Refacción"))
                .andExpect(status().isCreated());
    }

    // == Desbloquear ==========================================================

    @Test
    void desbloquear_devuelve_la_sala_al_servicio() throws Exception {
        long bloqueo = idDeBloqueo(mvc.perform(
                bloquear(sala1, LUNES, VIERNES, null, null, "Refacción")));

        mvc.perform(delete("/api/bloqueos/" + bloqueo).header("Authorization", comoStaff()))
                .andExpect(status().isNoContent());

        mvc.perform(reservar(sala1, LUNES.plusDays(1), "10:00", "11:30"))
                .andExpect(status().isCreated());
    }

    @Test
    void desbloquear_algo_que_no_existe_da_404() throws Exception {
        mvc.perform(delete("/api/bloqueos/99999999").header("Authorization", comoStaff()))
                .andExpect(status().isNotFound());
    }

    // == El listado ===========================================================

    /**
     * Por defecto el listado arranca en hoy. Un bloqueo vencido ya no rechaza
     * nada, y mezclarlo con los vigentes convierte la pantalla en un archivo.
     */
    @Test
    void por_defecto_el_listado_no_trae_los_vencidos() throws Exception {
        LocalDate haceUnAnio = LocalDate.now().minusYears(1);
        mvc.perform(bloquear(sala1, haceUnAnio, haceUnAnio.plusDays(2), null, null, "Vieja obra"))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/bloqueos").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.motivo == 'Vieja obra')]").isEmpty());

        // Bajando `desde` sí aparece: el histórico se pide, no se pierde.
        mvc.perform(get("/api/bloqueos?desde=" + haceUnAnio).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.motivo == 'Vieja obra')]").isNotEmpty());
    }

    @Test
    void el_listado_filtra_por_sala() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "En la 1")).andExpect(status().isCreated());
        mvc.perform(bloquear(sala2, LUNES, VIERNES, null, null, "En la 2")).andExpect(status().isCreated());

        mvc.perform(get("/api/bloqueos?desde=" + LUNES + "&idSala=" + sala2)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.motivo == 'En la 1')]").isEmpty())
                .andExpect(jsonPath("$[?(@.motivo == 'En la 2')]").isNotEmpty());
    }

    // == Validación ===========================================================

    @Test
    void la_fecha_de_fin_no_puede_ser_anterior_a_la_de_inicio() throws Exception {
        mvc.perform(bloquear(sala1, VIERNES, LUNES, null, null, "Al revés"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.rangoDeFechasValido").isNotEmpty());
    }

    @Test
    void la_hora_de_fin_no_puede_ser_anterior_a_la_de_inicio() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, "13:00", "09:00", "Al revés"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.horarioValido").isNotEmpty());
    }

    @Test
    void un_bloqueo_sin_motivo_no_entra() throws Exception {
        mvc.perform(bloquear(sala1, LUNES, VIERNES, null, null, "   "))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.motivo").isNotEmpty());
    }

    @Test
    void bloquear_una_sala_que_no_existe_da_404() throws Exception {
        mvc.perform(bloquear(99999999L, LUNES, VIERNES, null, null, "Refacción"))
                .andExpect(status().isNotFound());
    }

    // == Permisos (§5: bloquear sala es ADMIN·STAFF) ==========================

    @Test
    void un_directivo_ve_los_bloqueos_y_no_los_carga() throws Exception {
        String directivo = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/bloqueos").header("Authorization", directivo))
                .andExpect(status().isOk());

        mvc.perform(post("/api/bloqueos")
                .header("Authorization", directivo)
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo(sala1, LUNES, VIERNES, null, null, "Refacción")))
                .andExpect(status().isForbidden());
    }

    @Test
    void un_usuario_comun_no_ve_los_bloqueos() throws Exception {
        mvc.perform(get("/api/bloqueos").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    @Test
    void sin_credencial_no_se_ve_nada() throws Exception {
        mvc.perform(get("/api/bloqueos")).andExpect(status().isUnauthorized());
    }

    // =========================================================================

    private MockHttpServletRequestBuilder bloquear(Long idSala, LocalDate desde, LocalDate hasta,
            String horaInicio, String horaFin, String motivo) {
        return post("/api/bloqueos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo(idSala, desde, hasta, horaInicio, horaFin, motivo));
    }

    private String cuerpo(Long idSala, LocalDate desde, LocalDate hasta,
            String horaInicio, String horaFin, String motivo) {
        return """
                {"idSala":%d,"fechaInicio":"%s","fechaFin":"%s",
                 "horaInicio":%s,"horaFin":%s,"motivo":"%s"}
                """.formatted(idSala, desde, hasta,
                horaInicio == null ? "null" : "\"" + horaInicio + "\"",
                horaFin == null ? "null" : "\"" + horaFin + "\"",
                motivo);
    }

    private MockHttpServletRequestBuilder reservar(Long idSala, LocalDate fecha,
            String desde, String hasta) {
        return post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s"}
                        """.formatted(idSala, claseDj, fecha, desde, hasta));
    }

    private long idDe(ResultActions resultado) throws Exception {
        return extraer(resultado, "\"idReserva\":");
    }

    private long idDeBloqueo(ResultActions resultado) throws Exception {
        return extraer(resultado, "\"idBloqueo\":");
    }

    private long extraer(ResultActions resultado, String clave) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return Long.parseLong(cuerpo.substring(desde, hasta).trim());
    }

    private Long idDeSala(String nombre) {
        return salas.listar(true).stream()
                .filter(s -> s.getNombreSala().equals(nombre))
                .findFirst().orElseThrow().getId();
    }

    private Long idDeTipo(String codigo) {
        return tiposDeUso.listar(true).stream()
                .filter(t -> t.getCodigo().equals(codigo))
                .findFirst().orElseThrow().getId();
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Bloqueo" + rol.name());
        usuario.setEmail("bloqueo-" + UUID.randomUUID() + "@lajuanita.local");
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
