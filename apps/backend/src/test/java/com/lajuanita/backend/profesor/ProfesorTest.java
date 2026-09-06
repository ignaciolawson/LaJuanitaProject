package com.lajuanita.backend.profesor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * El listado de profesores, que existe para poder asignarlos a una inscripción.
 *
 * <p>Es chico a propósito: el endpoint es de lectura y no tiene lógica propia.
 * Lo que sí tiene y hay que sostener es <b>el default</b> — solo los activos —,
 * porque ofrecer un profesor dado de baja en el selector de una inscripción
 * nueva es exactamente el error de carga que el default evita.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ProfesorTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private ProfesorRepository profesores;

    @Test
    void lista_los_profesores_con_el_nombre_ya_armado() throws Exception {
        Profesor profe = crearProfesor("Tomás", "Ghezzi", true);

        mvc.perform(get("/api/profesores").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProfesor == " + profe.getId() + ")].nombreCompleto")
                        .value("Tomás Ghezzi"));
    }

    /** El default, que es la razón de ser del parámetro. */
    @Test
    void por_defecto_no_ofrece_a_los_que_ya_no_dan_clases() throws Exception {
        Profesor deBaja = crearProfesor("Ya", "NoDaClases", false);

        mvc.perform(get("/api/profesores").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProfesor == " + deBaja.getId() + ")]").doesNotExist());
    }

    /**
     * Y el otro lado: una pantalla que muestra inscripciones viejas necesita
     * poder nombrar al profesor que las dio, aunque hoy esté de baja.
     */
    @Test
    void pidiendolo_explicitamente_vuelven_todos() throws Exception {
        Profesor deBaja = crearProfesor("Ya", "NoDaClases", false);

        mvc.perform(get("/api/profesores?incluirInactivos=true")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idProfesor == " + deBaja.getId() + ")].activo")
                        .value(false));
    }

    @Test
    void un_usuario_comun_no_ve_la_lista() throws Exception {
        mvc.perform(get("/api/profesores")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    // == Convertir a alguien en profesor (§14 · B2) ===========================

    /**
     * ⚠️ <b>Estos casos existen porque el alta no existía.</b> Hasta el
     * 2026-09-05 este controller tenía un solo {@code @GetMapping}: seis
     * pantallas del Módulo 5, el selector de la inscripción y la agenda del
     * profesor leían una tabla que <b>ninguna capa sabía poblar</b>. La única
     * forma de que alguien fuera profesor era un INSERT a mano.
     *
     * <p>Nada estaba fallando, porque una capacidad que no existe no tiene nada
     * que romper — la misma forma de `V16`, de la mitad de §8 del Módulo 5 y de
     * la regla dura del Módulo 7. Lo encontró Ignacio usando el sistema.
     */
    @Test
    void una_persona_con_cuenta_se_convierte_en_profesor() throws Exception {
        Usuario pepe = crear(Rol.USUARIO);

        mvc.perform(post("/api/profesores")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"especialidad":"Producción"}
                        """.formatted(pepe.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").value(pepe.getId()))
                .andExpect(jsonPath("$.especialidad").value("Producción"))
                .andExpect(jsonPath("$.activo").value(true));
    }

    /**
     * ⚠️ <b>El caso que dice para qué sirve todo esto.</b> Ser profesor es una
     * relación y no un rol, así que lo único que hace falta es que exista la
     * fila: {@code /api/me} contesta {@code esProfesor} preguntando por su
     * existencia, y el menú del portal —Mi agenda, Mis alumnos, Subir material—
     * le aparece a esa persona en su pedido siguiente. <b>No hay un segundo
     * lugar donde "habilitarlo"</b>, y si algún día lo hubiera, este caso es el
     * que avisaría que se rompió el circuito.
     */
    @Test
    void darle_la_relacion_le_abre_el_portal_del_profesor() throws Exception {
        Usuario pepe = crear(Rol.USUARIO);
        String suCredencial = credencialPara(pepe);

        mvc.perform(get("/api/me").header("Authorization", suCredencial))
                .andExpect(jsonPath("$.esProfesor").value(false));

        mvc.perform(post("/api/profesores")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idUsuario\":%d}".formatted(pepe.getId())))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/me").header("Authorization", suCredencial))
                .andExpect(jsonPath("$.esProfesor").value(true));
    }

    /** El UNIQUE de `V1` es quien manda; el pre-chequeo está para el mensaje. */
    @Test
    void la_misma_persona_no_se_hace_profesor_dos_veces() throws Exception {
        Usuario pepe = crear(Rol.USUARIO);
        String cuerpo = "{\"idUsuario\":%d}".formatted(pepe.getId());

        mvc.perform(post("/api/profesores").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/profesores").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isConflict());
    }

    @Test
    void no_se_hace_profesor_a_una_cuenta_que_no_existe() throws Exception {
        mvc.perform(post("/api/profesores").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON).content("{\"idUsuario\":999999}"))
                .andExpect(status().isNotFound());
    }

    /**
     * <b>Dar de baja NO borra la fila</b>, y esa es la regla: quien dejó de dar
     * clases tiene que poder seguir viendo el historial de las que dictó, y esas
     * clases no pueden quedar apuntando a nadie. Es el mismo criterio con el que
     * este esquema no borra ni un pago ni una clase.
     */
    @Test
    void dar_de_baja_a_un_profesor_lo_saca_del_selector_sin_borrarlo() throws Exception {
        Profesor profe = crearProfesor("Se", "Fue", true);

        mvc.perform(put("/api/profesores/" + profe.getId())
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"activo\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.activo").value(false));

        mvc.perform(get("/api/profesores").header("Authorization", comoStaff()))
                .andExpect(jsonPath("$[?(@.idProfesor == " + profe.getId() + ")]").doesNotExist());

        // Pero la fila sigue, así que su portal sigue abierto.
        mvc.perform(get("/api/profesores?incluirInactivos=true")
                .header("Authorization", comoStaff()))
                .andExpect(jsonPath("$[?(@.idProfesor == " + profe.getId() + ")].activo")
                        .value(false));
    }

    /** `activo` ausente significa "no lo toques", no "ponelo en falso". */
    @Test
    void editar_solo_la_especialidad_no_da_de_baja_a_nadie() throws Exception {
        Profesor profe = crearProfesor("Sigue", "Dando", true);

        mvc.perform(put("/api/profesores/" + profe.getId())
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"especialidad\":\"Ableton\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.especialidad").value("Ableton"))
                .andExpect(jsonPath("$.activo").value(true));
    }

    /** Un DIRECTIVO lee todo el sistema y no escribe nada, acá tampoco. */
    @Test
    void un_directivo_ve_la_lista_y_no_da_de_alta() throws Exception {
        String credencial = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/profesores").header("Authorization", credencial))
                .andExpect(status().isOk());

        mvc.perform(post("/api/profesores").header("Authorization", credencial)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"idUsuario\":%d}".formatted(crear(Rol.USUARIO).getId())))
                .andExpect(status().isForbidden());
    }

    // =========================================================================

    private Profesor crearProfesor(String nombre, String apellido, boolean activo) {
        Usuario persona = crear(Rol.USUARIO);
        persona.setNombre(nombre);
        persona.setApellido(apellido);
        usuarios.save(persona);

        Profesor profesor = new Profesor();
        profesor.setUsuario(persona);
        profesor.setActivo(activo);
        return profesores.save(profesor);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Profesor" + rol.name());
        usuario.setEmail("profesor-" + UUID.randomUUID() + "@lajuanita.local");
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
