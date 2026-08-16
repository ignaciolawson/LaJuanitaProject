package com.lajuanita.backend.profesor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
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
