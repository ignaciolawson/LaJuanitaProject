package com.lajuanita.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * Un token sigue siendo válido hasta que vence, pero <b>lo que podés hacer con
 * él se decide contra la base en cada pedido</b>.
 *
 * <p>Este archivo existe por tres agujeros medidos contra la API corriendo en la
 * auditoría del 2026-08-12. Los tres tenían la misma causa -- la autorización
 * leía el claim {@code rol}, una foto de cuando se emitió el token -- y los tres
 * eran explotables durante las 8 horas de vida de la credencial:
 *
 * <ol>
 *   <li>un usuario <b>dado de baja</b> seguía leyendo alumnos y creando filas;
 *   <li>un ADMIN <b>degradado</b> seguía operando como ADMIN;
 *   <li>alguien con <b>contraseña temporal sin cambiar</b> operaba igual, porque
 *       ese bloqueo vivía solo en el frontend.
 * </ol>
 *
 * <p>Si alguno de estos tests se pone en rojo, es que se volvió a confiar en el
 * token en vez de en la base.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CredencialVigenteTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    /**
     * {@code usuario.activo = FALSE} es la forma que este sistema documenta para
     * dar de baja a alguien (ver la cabecera de {@code V1__baseline.sql}). Tiene
     * que sacarlo en el acto, no dentro de ocho horas.
     */
    @Test
    void dar_de_baja_a_alguien_le_corta_el_acceso_en_el_pedido_siguiente() throws Exception {
        Usuario staff = crear(Rol.STAFF, false);
        String credencial = credencialPara(staff);

        mvc.perform(get("/api/alumnos").header("Authorization", credencial))
                .andExpect(status().isOk());

        staff.setActivo(false);
        usuarios.saveAndFlush(staff);

        // Con el MISMO token, ya sin poder leer ni escribir.
        mvc.perform(get("/api/alumnos").header("Authorization", credencial))
                .andExpect(status().isUnauthorized());
        mvc.perform(altaDeAlumno().header("Authorization", credencial))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me").header("Authorization", credencial))
                .andExpect(status().isUnauthorized());
    }

    /** Bajarle el rol a alguien tiene que pegar sin esperar a que venza el token. */
    @Test
    void degradar_un_rol_pega_en_el_pedido_siguiente() throws Exception {
        Usuario admin = crear(Rol.ADMIN, false);
        String credencial = credencialPara(admin);

        mvc.perform(altaDeAlumno().header("Authorization", credencial))
                .andExpect(status().isCreated());

        admin.setRol(Rol.USUARIO);
        usuarios.saveAndFlush(admin);

        mvc.perform(altaDeAlumno().header("Authorization", credencial))
                .andExpect(status().isForbidden());
    }

    /**
     * El bloqueo de la contraseña temporal tiene que existir en el servidor: si
     * vive solo en el frontend, quien tiene la credencial temporal --que además
     * conoce administración-- opera por API sin cambiarla nunca.
     */
    @Test
    void con_password_temporal_sin_cambiar_no_se_puede_operar_ni_por_api() throws Exception {
        Usuario conTemporal = crear(Rol.STAFF, true);
        String credencial = credencialPara(conTemporal);

        mvc.perform(get("/api/alumnos").header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(altaDeAlumno().header("Authorization", credencial))
                .andExpect(status().isForbidden());
    }

    /**
     * Pero sí tiene que poder hacer las dos cosas necesarias para salir del
     * estado: saber quién es y cambiar su contraseña. Si se le cerrara todo,
     * quedaría encerrado sin forma de destrabarse.
     */
    @Test
    void con_password_temporal_igual_puede_verse_y_cambiar_su_password() throws Exception {
        Usuario conTemporal = crear(Rol.STAFF, true);
        String credencial = credencialPara(conTemporal);

        mvc.perform(get("/api/me").header("Authorization", credencial))
                .andExpect(status().isOk());

        // Llega al endpoint (la contraseña actual es incorrecta, de ahí el 401,
        // pero no es un 403: la puerta está abierta para él).
        mvc.perform(post("/api/me/password")
                .header("Authorization", credencial)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"passwordActual":"loQueSea","passwordNueva":"unaClaveLarga"}
                        """))
                .andExpect(status().isUnauthorized());
    }

    /** Un token cuyo `sub` apunta a un usuario borrado no autentica a nadie. */
    @Test
    void un_token_de_un_usuario_que_ya_no_existe_da_401() throws Exception {
        Instant ahora = Instant.now();
        String credencial = "Bearer " + codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder()
                        .issuer("la-juanita")
                        .issuedAt(ahora)
                        .expiresAt(ahora.plusSeconds(3600))
                        .subject("99999999")
                        .claim("rol", "ADMIN")
                        .build()))
                .getTokenValue();

        mvc.perform(get("/api/alumnos").header("Authorization", credencial))
                .andExpect(status().isUnauthorized());
    }

    // -------------------------------------------------------------------------

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder altaDeAlumno() {
        return post("/api/alumnos")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"usuarioNuevo":{"nombre":"Alumno","apellido":"Prueba","email":"%s"}}
                        """.formatted(emailNuevo()));
    }

    private Usuario crear(Rol rol, boolean debeCambiarPassword) {
        String hash = "$2a$10$noSeUsaEnEsteTest000000000000000000000000000000000000";

        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido(rol.name());
        usuario.setEmail(emailNuevo());
        usuario.setRol(rol);

        // Las dos columnas de la temporal se mueven juntas, y desde V8 la base
        // lo exige: poner el booleano a mano dejaba la fecha en NULL y el INSERT
        // moría contra `usuario_password_temporal_coherente`. Por eso se pasa por
        // los dos métodos de la entidad y no por el setter.
        if (debeCambiarPassword) {
            usuario.marcarPasswordTemporal(hash);
        } else {
            usuario.marcarPasswordElegida(hash);
        }

        return usuarios.saveAndFlush(usuario);
    }

    private String credencialPara(Usuario usuario) {
        Instant ahora = Instant.now();
        return "Bearer " + codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(),
                JwtClaimsSet.builder()
                        .issuer("la-juanita")
                        .issuedAt(ahora)
                        .expiresAt(ahora.plusSeconds(3600))
                        .subject(String.valueOf(usuario.getId()))
                        .claim("rol", usuario.getRol().name())
                        .build()))
                .getTokenValue();
    }

    private String emailNuevo() {
        return "vigente-" + UUID.randomUUID() + "@lajuanita.local";
    }
}
