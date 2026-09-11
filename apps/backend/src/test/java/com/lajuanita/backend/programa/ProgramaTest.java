package com.lajuanita.backend.programa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * El catálogo de programas (`V28`, P63 — cierra P13).
 *
 * <p>Lo que estos casos sostienen:
 *
 * <ul>
 *   <li><b>Que las tres filas existan y digan lo que la migración sembró</b>,
 *       incluida la mentoría sin precio — {@code null} y no cero, porque cero en
 *       este esquema es una beca.
 *   <li><b>Que se edite todo menos la disciplina</b>, y que un DIRECTIVO lea y
 *       no edite.
 *   <li><b>Que no se borre.</b> Es el trigger de `V28` §3, y el caso habla con
 *       la base directamente porque no hay endpoint que lo intente.
 * </ul>
 *
 * <p>⚠️ Los casos de edición escriben sobre las filas sembradas y la clase es
 * {@code @Transactional}: al terminar cada uno todo vuelve. Si alguien saca la
 * anotación, la base de desarrollo se queda con los valores del test.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProgramaTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private ProgramaRepository programas;
    @Autowired private JdbcTemplate jdbc;

    @Test
    void las_tres_disciplinas_estan_en_el_catalogo_como_las_sembro_V28() throws Exception {
        mvc.perform(get("/api/programas").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.disciplina == 'DJ')].clasesEstandar").value(8))
                .andExpect(jsonPath("$[?(@.disciplina == 'DJ')].cobro").value("PAQUETE"))
                .andExpect(jsonPath("$[?(@.disciplina == 'PRODUCCION')].clasesEstandar").value(16))
                // La mentoría: sin estándar y sin precio, por sesión. El null del
                // precio es "todavía no hay", y viaja como null — no como 0.
                .andExpect(jsonPath("$[?(@.disciplina == 'MENTORIA')].cobro").value("SESION"))
                .andExpect(jsonPath("$[?(@.disciplina == 'MENTORIA')].clasesEstandar").value(
                        org.hamcrest.Matchers.contains((Object) null)))
                .andExpect(jsonPath("$[?(@.disciplina == 'MENTORIA')].precio").value(
                        org.hamcrest.Matchers.contains((Object) null)));
    }

    @Test
    void se_edita_el_precio_y_queda() throws Exception {
        long dj = idDe(Disciplina.DJ);

        mvc.perform(editar(dj, """
                {"nombre":"Convertite en DJ","precio":200000,"moneda":"ARS","cobro":"PAQUETE",
                 "clasesEstandar":8,"duracionMinutos":90,"activo":true}
                """, comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.precio").value(200000))
                .andExpect(jsonPath("$.disciplina").value("DJ"));

        // El filtro devuelve una lista: `contains`, no `value` (ver TableroTest).
        mvc.perform(get("/api/programas").header("Authorization", comoStaff()))
                .andExpect(jsonPath("$[?(@.disciplina == 'DJ')].precio").value(
                        org.hamcrest.Matchers.contains(200000)));
    }

    /** Un paquete sin cantidad de clases no es un precio (`V28` §2). */
    @Test
    void un_paquete_sin_clases_se_rechaza() throws Exception {
        mvc.perform(editar(idDe(Disciplina.DJ), """
                {"nombre":"Convertite en DJ","precio":200000,"moneda":"ARS","cobro":"PAQUETE",
                 "clasesEstandar":null,"duracionMinutos":90,"activo":true}
                """, comoStaff()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("paquete")));
    }

    /** Por sesión sí puede ir sin estándar: es la mentoría. */
    @Test
    void por_sesion_puede_ir_sin_clases_estandar() throws Exception {
        mvc.perform(editar(idDe(Disciplina.MENTORIA), """
                {"nombre":"Mentoría para DJs","precio":45000,"moneda":"ARS","cobro":"SESION",
                 "clasesEstandar":null,"duracionMinutos":90,"activo":true}
                """, comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.precio").value(45000))
                .andExpect(jsonPath("$.clasesEstandar").isEmpty());
    }

    @Test
    void el_directivo_lee_y_no_edita() throws Exception {
        mvc.perform(get("/api/programas").header("Authorization", comoDirectivo()))
                .andExpect(status().isOk());

        mvc.perform(editar(idDe(Disciplina.DJ), """
                {"nombre":"Convertite en DJ","precio":1,"moneda":"ARS","cobro":"PAQUETE",
                 "clasesEstandar":8,"duracionMinutos":90,"activo":true}
                """, comoDirectivo()))
                .andExpect(status().isForbidden());
    }

    /** No hay DELETE en la API, y la base tampoco lo deja (`V28` §3). */
    @Test
    void no_hay_como_borrar_un_programa() throws Exception {
        mvc.perform(delete("/api/programas/" + idDe(Disciplina.DJ))
                .header("Authorization", comoStaff()))
                .andExpect(status().is4xxClientError());

        assertThatThrownBy(() -> jdbc.update("DELETE FROM programa WHERE disciplina = 'MENTORIA'"))
                .hasMessageContaining("programa -> activo = FALSE");
    }

    // == Helpers =============================================================

    private long idDe(Disciplina disciplina) {
        return programas.findByDisciplina(disciplina).orElseThrow().getId();
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder editar(
            long id, String cuerpo, String credencial) {
        return put("/api/programas/" + id)
                .header("Authorization", credencial)
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private String comoDirectivo() {
        return credencialPara(crear(Rol.DIRECTIVO));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Programa" + rol.name());
        usuario.setEmail("programa-" + UUID.randomUUID() + "@lajuanita.local");
        usuario.setPasswordHash("$2a$10$noSeUsaEnEsteTest000000000000000000000000000000000000");
        usuario.setRol(rol);
        Usuario guardado = usuarios.save(usuario);
        assertThat(guardado.getId()).isNotNull();
        return guardado;
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
