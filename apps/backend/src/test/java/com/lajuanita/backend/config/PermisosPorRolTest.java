package com.lajuanita.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * La matriz de permisos de {@code docs/requirements/platform.md} §2.1,
 * verificada de punta a punta contra usuarios REALES de la base.
 *
 * <p>Antes este test forjaba tokens con el rol que quería en el claim. Dejó de
 * servir cuando la autorización pasó a leer el rol de la base -- y eso está
 * bien: el claim ya no autoriza nada, así que un test basado en el claim
 * probaba una puerta que no existe. Ahora crea usuarios de verdad con cada rol.
 *
 * <p><b>La fila que más importa es DIRECTIVO:</b> lee todo y no escribe nada. Es
 * la razón por la que el sistema tiene cuatro roles y no tres.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PermisosPorRolTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    // -- LECTURA: la ve todo el que administra, incluido DIRECTIVO ------------

    @Test
    void admin_directivo_y_staff_pueden_ver_los_listados() throws Exception {
        for (Rol rol : new Rol[] { Rol.ADMIN, Rol.DIRECTIVO, Rol.STAFF }) {
            String credencial = comoUsuarioCon(rol);

            mvc.perform(get("/api/alumnos").header("Authorization", credencial))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/usuarios").header("Authorization", credencial))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/inscripciones").header("Authorization", credencial))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/profesores").header("Authorization", credencial))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/salas").header("Authorization", credencial))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/tipos-uso").header("Authorization", credencial))
                    .andExpect(status().isOk());
            mvc.perform(get("/api/reservas?desde=2027-03-01&hasta=2027-03-07")
                    .header("Authorization", credencial))
                    .andExpect(status().isOk());
        }
    }

    @Test
    void un_usuario_comun_no_ve_las_pantallas_de_administracion() throws Exception {
        String credencial = comoUsuarioCon(Rol.USUARIO);

        mvc.perform(get("/api/alumnos").header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/usuarios").header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/inscripciones").header("Authorization", credencial))
                .andExpect(status().isForbidden());
    }

    // -- ESCRITURA: DIRECTIVO queda afuera ------------------------------------

    /**
     * El test central del rol DIRECTIVO. "Solo directivos y socios ven el
     * dashboard completo" viene con la contracara de que no operan el sistema.
     */
    @Test
    void un_directivo_puede_leer_pero_NO_puede_escribir_nada() throws Exception {
        String credencial = comoUsuarioCon(Rol.DIRECTIVO);

        mvc.perform(get("/api/alumnos").header("Authorization", credencial))
                .andExpect(status().isOk());

        mvc.perform(altaDeAlumno().header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(altaDeUsuario().header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(altaDeInscripcion().header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(altaDeReserva().header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(put("/api/usuarios/1")
                .header("Authorization", credencial)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"X","apellido":"Y","email":"z@lajuanita.local"}
                        """))
                .andExpect(status().isForbidden());
        mvc.perform(patch("/api/usuarios/1/activo?activo=false").header("Authorization", credencial))
                .andExpect(status().isForbidden());
    }

    @Test
    void staff_y_admin_si_pueden_crear_alumnos() throws Exception {
        for (Rol rol : new Rol[] { Rol.ADMIN, Rol.STAFF }) {
            mvc.perform(altaDeAlumno().header("Authorization", comoUsuarioCon(rol)))
                    .andExpect(status().isCreated());
        }
    }

    @Test
    void un_usuario_comun_no_puede_crear_nada() throws Exception {
        String credencial = comoUsuarioCon(Rol.USUARIO);

        mvc.perform(altaDeAlumno().header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(altaDeUsuario().header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(altaDeInscripcion().header("Authorization", credencial))
                .andExpect(status().isForbidden());
    }

    // -- Escalada de privilegios ---------------------------------------------

    @Test
    void staff_no_puede_crear_una_cuenta_con_rol_administrativo() throws Exception {
        mvc.perform(post("/api/usuarios")
                .header("Authorization", comoUsuarioCon(Rol.STAFF))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Colado","apellido":"Colado","email":"%s","rol":"ADMIN"}
                        """.formatted(emailNuevo())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.rol").value("USUARIO"));
    }

    @Test
    void un_admin_si_puede_asignar_roles() throws Exception {
        mvc.perform(post("/api/usuarios")
                .header("Authorization", comoUsuarioCon(Rol.ADMIN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Nueva","apellido":"Staff","email":"%s","rol":"STAFF"}
                        """.formatted(emailNuevo())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.rol").value("STAFF"));
    }

    /**
     * Un STAFF podía desactivar al ADMIN y dejarlo sin poder entrar. Como
     * además solo un ADMIN puede otorgar roles, eso alcanzaba para dejar el
     * sistema sin nadie capaz de administrarlo.
     */
    @Test
    void staff_no_puede_desactivar_ni_editar_una_cuenta_administrativa() throws Exception {
        Usuario admin = crear(Rol.ADMIN);
        String staff = comoUsuarioCon(Rol.STAFF);

        mvc.perform(patch("/api/usuarios/" + admin.getId() + "/activo?activo=false")
                .header("Authorization", staff))
                .andExpect(status().isForbidden());

        mvc.perform(put("/api/usuarios/" + admin.getId())
                .header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Secuestrada","apellido":"Cuenta","email":"%s"}
                        """.formatted(emailNuevo())))
                .andExpect(status().isForbidden());
    }

    /**
     * La misma puerta, con la llave nueva. Resetear la contraseña de alguien es
     * quedarse con su cuenta: si un STAFF puede resetear la de un ADMIN, el
     * agujero que la auditoría del 12/08 cerró vuelve a estar abierto, solo que
     * por el endpoint de SEC-03 en vez de por el de baja.
     */
    @Test
    void staff_no_puede_resetear_la_password_de_una_cuenta_administrativa() throws Exception {
        Usuario admin = crear(Rol.ADMIN);

        mvc.perform(post("/api/usuarios/" + admin.getId() + "/password-temporal")
                .header("Authorization", comoUsuarioCon(Rol.STAFF)))
                .andExpect(status().isForbidden());
    }

    @Test
    void staff_si_puede_resetear_la_password_de_un_usuario_comun() throws Exception {
        Usuario comun = crear(Rol.USUARIO);

        mvc.perform(post("/api/usuarios/" + comun.getId() + "/password-temporal")
                .header("Authorization", comoUsuarioCon(Rol.STAFF)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.passwordTemporal").isNotEmpty());
    }

    @Test
    void un_directivo_no_puede_resetear_ninguna_password() throws Exception {
        Usuario comun = crear(Rol.USUARIO);

        mvc.perform(post("/api/usuarios/" + comun.getId() + "/password-temporal")
                .header("Authorization", comoUsuarioCon(Rol.DIRECTIVO)))
                .andExpect(status().isForbidden());
    }

    @Test
    void un_admin_no_puede_desactivarse_a_si_mismo() throws Exception {
        Usuario admin = crear(Rol.ADMIN);

        mvc.perform(patch("/api/usuarios/" + admin.getId() + "/activo?activo=false")
                .header("Authorization", credencialPara(admin)))
                .andExpect(status().isForbidden());
    }

    /**
     * La otra puerta al mismo desastre, medida contra la API el 2026-08-13: el
     * único ADMIN se puso rol USUARIO, la API contestó 200 y el pedido siguiente
     * vino 403. Como solo un ADMIN otorga roles, no quedaba nadie capaz de
     * deshacerlo.
     */
    @Test
    void un_admin_no_puede_cambiarse_el_rol_a_si_mismo() throws Exception {
        Usuario admin = crear(Rol.ADMIN);

        mvc.perform(put("/api/usuarios/" + admin.getId())
                .header("Authorization", credencialPara(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Administrador","apellido":"Sistema","email":"%s","rol":"USUARIO"}
                        """.formatted(admin.getEmail())))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("No podés cambiarte el rol a vos mismo."));
    }

    /**
     * La contracara: editarse el nombre o el email no es sacarse del sistema, y
     * mandar el propio rol sin cambiarlo —que es lo que hace un formulario que
     * envía el registro entero— tampoco.
     */
    @Test
    void un_admin_si_puede_editarse_los_datos_y_reenviar_su_propio_rol() throws Exception {
        Usuario admin = crear(Rol.ADMIN);

        mvc.perform(put("/api/usuarios/" + admin.getId())
                .header("Authorization", credencialPara(admin))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Nombre","apellido":"Nuevo","email":"%s","rol":"ADMIN"}
                        """.formatted(admin.getEmail())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("ADMIN"));
    }

    /** Degradar a OTRO administrador sigue siendo válido: la regla es sobre uno mismo. */
    @Test
    void un_admin_si_puede_cambiarle_el_rol_a_otro_admin() throws Exception {
        Usuario otro = crear(Rol.ADMIN);

        mvc.perform(put("/api/usuarios/" + otro.getId())
                .header("Authorization", comoUsuarioCon(Rol.ADMIN))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Degradado","apellido":"Admin","email":"%s","rol":"USUARIO"}
                        """.formatted(otro.getEmail())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.rol").value("USUARIO"));
    }

    // -- Sin credencial ------------------------------------------------------

    /**
     * Sin token es 401 (no sé quién sos), con el rol equivocado es 403 (sé quién
     * sos y no podés). El front los trata distinto: el 401 cierra la sesión, el
     * 403 solo avisa.
     */
    @Test
    void sin_credencial_es_401_y_no_403() throws Exception {
        mvc.perform(get("/api/alumnos")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/usuarios")).andExpect(status().isUnauthorized());
        mvc.perform(altaDeAlumno()).andExpect(status().isUnauthorized());
    }

    /**
     * La salud del servicio es la única excepción a "todo lo demás exige
     * credencial", y tiene que serlo: la consulta el healthcheck del contenedor
     * y un monitor externo, ninguno de los dos tiene sesión. No filtra nada —
     * `show-details=never` deja la respuesta en UP o DOWN.
     */
    @Test
    void la_salud_del_servicio_se_consulta_sin_credencial_y_no_dice_nada_mas() throws Exception {
        mvc.perform(get("/actuator/health"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("UP"))
                .andExpect(jsonPath("$.components").doesNotExist());
    }

    @Test
    void el_403_trae_un_mensaje_utilizable() throws Exception {
        mvc.perform(altaDeAlumno().header("Authorization", comoUsuarioCon(Rol.DIRECTIVO)))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value("No tenés permiso para hacer esto."))
                .andExpect(jsonPath("$.title").value("Permiso insuficiente"));
    }

    // -------------------------------------------------------------------------

    private MockHttpServletRequestBuilder altaDeAlumno() {
        return post("/api/alumnos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"usuarioNuevo":{"nombre":"Alumno","apellido":"Prueba","email":"%s"},
                         "nivelIngreso":"INICIAL"}
                        """.formatted(emailNuevo()));
    }

    /**
     * El cuerpo tiene que pasar Bean Validation aunque el pedido vaya a
     * rechazarse por rol: los argumentos se resuelven antes de que corra el
     * {@code @PreAuthorize}, así que un cuerpo incompleto devolvería 400 y el
     * caso no probaría nada sobre permisos. El alumno 1 puede no existir — nunca
     * se llega al servicio.
     */
    private MockHttpServletRequestBuilder altaDeInscripcion() {
        return post("/api/inscripciones")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idAlumno":1,"disciplina":"DJ","precioTotal":180000}
                        """);
    }

    /** Mismo cuidado que el de inscripción: el cuerpo tiene que ser válido. */
    private MockHttpServletRequestBuilder altaDeReserva() {
        return post("/api/reservas")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":1,"idTipoUso":1,"fecha":"2027-03-01",
                         "horaInicio":"10:00","horaFin":"11:30"}
                        """);
    }

    private MockHttpServletRequestBuilder altaDeUsuario() {
        return post("/api/usuarios")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Persona","apellido":"Prueba","email":"%s"}
                        """.formatted(emailNuevo()));
    }

    /** Crea un usuario real con ese rol y devuelve su credencial. */
    private String comoUsuarioCon(Rol rol) {
        return credencialPara(crear(rol));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido(rol.name());
        usuario.setEmail(emailNuevo());
        // No se loguea con esto: el test firma el token directamente.
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

    private String emailNuevo() {
        return "permisos-" + UUID.randomUUID() + "@lajuanita.local";
    }
}
