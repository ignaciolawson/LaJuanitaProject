package com.lajuanita.backend.usuario;

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

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;

/**
 * El Directorio y sus partes (P77): {@code GET /api/usuarios} filtrado por
 * grupo, con los dos ejes de cada persona en la fila.
 *
 * <p>Cada caso crea sus cuentas con un apellido único y busca por él, para que
 * las cuentas de la base de desarrollo no entren en la cuenta. Es lo que
 * permite afirmar "son exactamente estas tres".
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DirectorioTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private AlumnoRepository alumnos;

    @Autowired
    private ProfesorRepository profesores;

    /**
     * Equipo son los roles administrativos, <b>con el admin adentro</b> (P77 · 2:
     * "1. adentro"). Un USUARIO con el mismo apellido no entra, y ése es el
     * caso: si el filtro fuera de la pantalla y no del servidor, la página
     * traería a los cuatro y escondería uno.
     */
    @Test
    void equipo_son_los_tres_roles_administrativos_con_el_admin_adentro() throws Exception {
        String apellido = apellidoUnico();
        crear(Rol.ADMIN, apellido);
        crear(Rol.DIRECTIVO, apellido);
        crear(Rol.STAFF, apellido);
        crear(Rol.USUARIO, apellido);

        mvc.perform(get("/api/usuarios")
                .param("grupo", "EQUIPO")
                .param("buscar", apellido)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(3))
                .andExpect(jsonPath("$.contenido[*].rol").value(
                        org.hamcrest.Matchers.containsInAnyOrder("ADMIN", "DIRECTIVO", "STAFF")));

        // Sin grupo es el Directorio: los cuatro.
        mvc.perform(get("/api/usuarios")
                .param("buscar", apellido)
                .header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.totalElementos").value(4));
    }

    /**
     * El Directorio es la única pantalla donde una persona se ve entera: rol
     * <i>y</i> relaciones. Tres cuentas iguales salvo por la fila que tienen
     * detrás, y cada una dice lo suyo. Un profesor de baja sigue siendo
     * profesor: la relación existe, lo que cambió es {@code activo}.
     */
    @Test
    void el_directorio_dice_si_cada_cuenta_es_alumno_o_profesor() throws Exception {
        String apellido = apellidoUnico();
        Usuario alumna = crear(Rol.USUARIO, apellido);
        alumna.setNombre("Alumna");
        Alumno filaDeAlumno = new Alumno();
        filaDeAlumno.setUsuario(alumna);
        alumnos.save(filaDeAlumno);

        Usuario profe = crear(Rol.STAFF, apellido);
        profe.setNombre("Profe");
        Profesor filaDeProfesor = new Profesor();
        filaDeProfesor.setUsuario(profe);
        filaDeProfesor.setActivo(false);
        profesores.save(filaDeProfesor);

        Usuario nadie = crear(Rol.USUARIO, apellido);
        nadie.setNombre("Nadie");

        mvc.perform(get("/api/usuarios")
                .param("buscar", apellido)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(3))
                .andExpect(jsonPath("$.contenido[?(@.nombre == 'Alumna')].esAlumno").value(true))
                .andExpect(jsonPath("$.contenido[?(@.nombre == 'Alumna')].esProfesor").value(false))
                .andExpect(jsonPath("$.contenido[?(@.nombre == 'Profe')].esProfesor").value(true))
                .andExpect(jsonPath("$.contenido[?(@.nombre == 'Profe')].esAlumno").value(false))
                .andExpect(jsonPath("$.contenido[?(@.nombre == 'Nadie')].esAlumno").value(false))
                .andExpect(jsonPath("$.contenido[?(@.nombre == 'Nadie')].esProfesor").value(false));
    }

    // =========================================================================

    private String apellidoUnico() {
        return "Directorio" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF, "Staff" + UUID.randomUUID()));
    }

    private Usuario crear(Rol rol, String apellido) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido(apellido);
        usuario.setEmail("directorio-" + UUID.randomUUID() + "@lajuanita.local");
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
        JwsHeader cabecera = JwsHeader.with(MacAlgorithm.HS256).build();
        return "Bearer " + codificador.encode(JwtEncoderParameters.from(cabecera, reclamos)).getTokenValue();
    }
}
