package com.lajuanita.backend.reserva;

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

import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 2, pantalla 4 — el historial de uso por sala y período.
 *
 * <p>Lo que se prueba acá no es una regla de la base sino <b>una cuenta</b>, y
 * las cuentas se equivocan distinto: no tiran error, dan otro número. Los casos
 * apuntan a las tres formas de que este informe mienta sin avisar — que una sala
 * sin uso desaparezca en vez de salir en cero, que una clase cancelada sume
 * horas como si se hubiera dictado, y que las horas se cuenten por reserva en
 * vez de por duración.
 *
 * <p>Fechas de 2029, por lo mismo que las otras dos suites: el informe agrega
 * <b>todo</b> lo que hay en el rango, incluido lo que haya cargado a mano la
 * base de desarrollo. Un año propio es lo que hace que los números sean del caso.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UsoDeSalaTest {

    private static final LocalDate LUNES = LocalDate.of(2029, 4, 2);
    private static final LocalDate DESDE = LUNES.minusDays(7);
    private static final LocalDate HASTA = LUNES.plusDays(7);

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
    private Long alquiler;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        sala2 = idDeSala("Sala 2");
        claseDj = idDeTipo("CLASE_DJ");
        alquiler = idDeTipo("ALQUILER_CABINA");
    }

    // == La cuenta ============================================================

    /** Dos clases de 1:30 son dos reservas y tres horas, no dos. */
    @Test
    void suma_las_horas_por_duracion_y_no_por_reserva() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");
        reservar(sala1, claseDj, LUNES, "12:00", "13:30");

        informe()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].reservas").value(2))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].horas").value(3.00));
    }

    /**
     * <b>Una sala que no se usó sale en cero, no desaparece.</b> Es justo el
     * número por el que se mira este informe —si conviene alquilar la sala— y una
     * fila ausente se lee como que el sistema perdió el dato.
     */
    @Test
    void una_sala_sin_uso_aparece_igual_en_cero() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");

        informe()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.sala == 'Cabina de grabación')]").isNotEmpty())
                .andExpect(jsonPath("$[?(@.sala == 'Cabina de grabación')].reservas").value(0))
                .andExpect(jsonPath("$[?(@.sala == 'Cabina de grabación')].horas").value(0))
                .andExpect(jsonPath("$[?(@.sala == 'Cabina de grabación')].porTipo.length()").value(0));
    }

    /** Las tres salas siempre, aunque el período esté entero vacío. */
    @Test
    void un_periodo_sin_nada_devuelve_las_tres_salas_en_cero() throws Exception {
        informe()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[0].reservas").value(0));
    }

    /**
     * Una sala con veinte clases dictadas y una con veinte canceladas no se
     * usaron igual. Meterlas en el mismo total borra el dato del informe.
     */
    @Test
    void una_cancelada_cuenta_aparte_y_no_suma_horas() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");
        long caida = idDe(reservar(sala1, claseDj, LUNES, "15:00", "17:00"));
        cambiarEstado(caida, "CANCELADA");

        informe()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].reservas").value(1))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].horas").value(1.50))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].canceladas").value(1));
    }

    @Test
    void una_reprogramada_tambien_cuenta_aparte() throws Exception {
        long movida = idDe(reservar(sala1, claseDj, LUNES, "10:00", "11:30"));
        cambiarEstado(movida, "REPROGRAMADA");

        informe()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].reservas").value(0))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].horas").value(0))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].reprogramadas").value(1));
    }

    /** Una FINALIZADA es uso real: es la clase que efectivamente se dictó. */
    @Test
    void una_finalizada_cuenta_como_uso() throws Exception {
        long dictada = idDe(reservar(sala1, claseDj, LUNES, "10:00", "11:30"));
        cambiarEstado(dictada, "FINALIZADA");

        informe().andExpect(jsonPath("$[?(@.sala == 'Sala 1')].reservas").value(1));
    }

    // == El desglose ==========================================================

    @Test
    void desglosa_cuanto_fue_clase_y_cuanto_alquiler() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");
        reservar(sala1, alquiler, LUNES, "14:00", "18:00");

        informe()
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].porTipo.length()").value(2))
                // Ordenado por horas: el alquiler de 4 horas va primero.
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].porTipo[0].tipoUso")
                        .value("Alquiler de cabina"))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].porTipo[0].horas").value(4.00))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].porTipo[1].horas").value(1.50));
    }

    /** El color viaja con el desglose: el informe se dibuja con la misma paleta. */
    @Test
    void el_desglose_trae_el_color_del_tipo_de_uso() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");

        informe().andExpect(jsonPath("$[?(@.sala == 'Sala 1')].porTipo[0].color").isNotEmpty());
    }

    /** Un tipo que solo tuvo canceladas no ensucia el desglose con una fila en cero. */
    @Test
    void un_tipo_sin_uso_efectivo_no_aparece_en_el_desglose() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");
        cambiarEstado(idDe(reservar(sala1, alquiler, LUNES, "14:00", "18:00")), "CANCELADA");

        informe()
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].porTipo.length()").value(1))
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].porTipo[0].tipoUso").value("Clase de DJ"))
                // Pero la cancelada no se pierde: sale en el total de la sala.
                .andExpect(jsonPath("$[?(@.sala == 'Sala 1')].canceladas").value(1));
    }

    // == Los filtros ==========================================================

    @Test
    void filtra_por_sala() throws Exception {
        reservar(sala1, claseDj, LUNES, "10:00", "11:30");
        reservar(sala2, claseDj, LUNES, "10:00", "11:30");

        mvc.perform(get("/api/reservas/uso?desde=%s&hasta=%s&idSala=%d".formatted(DESDE, HASTA, sala2))
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].sala").value("Sala 2"));
    }

    @Test
    void lo_de_afuera_del_periodo_no_cuenta() throws Exception {
        reservar(sala1, claseDj, HASTA.plusDays(30), "10:00", "11:30");

        informe().andExpect(jsonPath("$[?(@.sala == 'Sala 1')].reservas").value(0));
    }

    // == El rango =============================================================

    @Test
    void un_rango_invertido_no_devuelve_una_lista_vacia_sino_un_error() throws Exception {
        mvc.perform(get("/api/reservas/uso?desde=%s&hasta=%s".formatted(HASTA, DESDE))
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest());
    }

    /**
     * El techo del informe es más alto que el de la agenda a propósito: lo que
     * acota a la agenda es el tamaño de la respuesta y acá son tres salas pida el
     * período que pida. Un año entra; más de un año, no.
     */
    @Test
    void un_ano_entra_y_mas_de_un_ano_no() throws Exception {
        mvc.perform(get("/api/reservas/uso?desde=%s&hasta=%s".formatted(LUNES, LUNES.plusDays(366)))
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        mvc.perform(get("/api/reservas/uso?desde=%s&hasta=%s".formatted(LUNES, LUNES.plusDays(367)))
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest());
    }

    // == Permisos =============================================================

    /** Es un informe de dirección: el DIRECTIVO es de los que más lo va a mirar. */
    @Test
    void un_directivo_lo_ve() throws Exception {
        mvc.perform(get("/api/reservas/uso?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", credencialPara(crear(Rol.DIRECTIVO))))
                .andExpect(status().isOk());
    }

    @Test
    void un_usuario_comun_no_lo_ve() throws Exception {
        mvc.perform(get("/api/reservas/uso?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================

    private ResultActions informe() throws Exception {
        return mvc.perform(get("/api/reservas/uso?desde=%s&hasta=%s".formatted(DESDE, HASTA))
                .header("Authorization", comoStaff()));
    }

    private ResultActions reservar(Long idSala, Long idTipoUso, LocalDate fecha,
            String desde, String hasta) throws Exception {
        return mvc.perform(alta(idSala, idTipoUso, fecha, desde, hasta))
                .andExpect(status().isCreated());
    }

    private MockHttpServletRequestBuilder alta(Long idSala, Long idTipoUso, LocalDate fecha,
            String desde, String hasta) {
        return post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s"}
                        """.formatted(idSala, idTipoUso, fecha, desde, hasta));
    }

    private void cambiarEstado(long idReserva, String estado) throws Exception {
        mvc.perform(patch("/api/reservas/" + idReserva + "/estado?estado=" + estado)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
    }

    private long idDe(ResultActions resultado) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf("\"idReserva\":") + "\"idReserva\":".length();
        return Long.parseLong(cuerpo.substring(desde, cuerpo.indexOf(',', desde)).trim());
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
        usuario.setApellido("Uso" + rol.name());
        usuario.setEmail("uso-" + UUID.randomUUID() + "@lajuanita.local");
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
