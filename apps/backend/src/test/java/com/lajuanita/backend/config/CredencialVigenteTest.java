package com.lajuanita.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
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

    /**
     * ⚠️ <b>Y tampoco entra al portal</b>, que es lo que este archivo daba por
     * probado y no probaba. El caso de arriba mira {@code /api/alumnos} y el alta
     * de alumno: <b>las dos del eje de administración</b>, donde el candado ya
     * funcionaba porque esos mappings llevan meta-anotación de rol.
     *
     * <p>Los 32 mappings de {@code /api/me} no llevan ninguna --autorizan por
     * identidad, con un {@code WHERE}-- así que caían en el
     * {@code anyRequest().authenticated()} y {@code ROLE_PASSWORD_PENDIENTE}
     * <b>está</b> autenticado. Quedaban 30 alcanzables de más, 11 de escritura
     * ({@code CS-01}). El nombre del caso de arriba --<i>"ni por api"</i>--
     * prometía más de lo que probaba.
     *
     * <p>La temporal es deliberadamente una credencial débil: la genera
     * administración, la ve Micaela, viaja por WhatsApp y vale 7 días. Todo el
     * sentido de {@code debeCambiarPassword} es que no valga como acceso real
     * hasta ser reemplazada.
     */
    @Test
    void con_password_temporal_tampoco_se_entra_al_portal() throws Exception {
        Usuario conTemporal = crear(Rol.USUARIO, true);
        String credencial = credencialPara(conTemporal);

        // Leer lo suyo: plata, deudas, saldos.
        mvc.perform(get("/api/me/estado-de-cuenta").header("Authorization", credencial))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/me/reservas").header("Authorization", credencial))
                .andExpect(status().isForbidden());

        // Escribir lo suyo. ⚠️ /api/me/perfil cuelga del MISMO controller que las
        // dos salidas abiertas: si la excepción se escribiera por prefijo en vez
        // de exacta, este caso se pone en verde por el motivo equivocado.
        mvc.perform(put("/api/me/perfil")
                .header("Authorization", credencial)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Otro","apellido":"Nombre","telefono":"1122334455"}
                        """))
                .andExpect(status().isForbidden());

        // Y el tramo del profesor, que es el que alcanza datos de TERCEROS: la
        // lista de sus alumnos con nivel y semáforo.
        mvc.perform(get("/api/me/profesor/alumnos").header("Authorization", credencial))
                .andExpect(status().isForbidden());
    }

    /**
     * La otra mitad del arreglo de {@code CS-01}, y la que se rompe sola si
     * alguien "simplifica" la regla.
     *
     * <p>La regla de ruta rechaza a quien <b>tenga</b> la autoridad
     * {@code ROLE_PASSWORD_PENDIENTE}. Un pedido sin credencial llega como
     * {@code AnonymousAuthenticationToken}, que <b>tampoco la tiene</b>: escrita
     * mirando solamente su ausencia --que es la forma corta y la que primero se
     * escribe-- la regla abriría los 32 endpoints del portal al mundo entero.
     * Por eso el predicado exige además estar autenticado.
     */
    @Test
    void el_portal_sigue_pidiendo_credencial() throws Exception {
        mvc.perform(get("/api/me/estado-de-cuenta"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me/notificaciones"))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/me"))
                .andExpect(status().isUnauthorized());
    }

    /**
     * Y la tercera mitad: <b>que el portal siga siendo el portal</b>. Un
     * {@code USUARIO} común --sin rol de administración y sin temporal-- tiene que
     * seguir entrando. Sin este caso, cerrar {@code /api/me/**} de más dejaría a
     * todos los alumnos afuera y ninguno de los otros dos casos lo notaría.
     */
    @Test
    void sin_temporal_el_portal_sigue_abierto_para_un_usuario_comun() throws Exception {
        Usuario alumno = crear(Rol.USUARIO, false);
        String credencial = credencialPara(alumno);

        mvc.perform(get("/api/me/estado-de-cuenta").header("Authorization", credencial))
                .andExpect(status().isOk());
        mvc.perform(get("/api/me/reservas")
                .param("desde", "2026-01-01")
                .param("hasta", "2026-01-31")
                .header("Authorization", credencial))
                .andExpect(status().isOk());
        mvc.perform(get("/api/me/notificaciones").header("Authorization", credencial))
                .andExpect(status().isOk());
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
