package com.lajuanita.backend.cliente;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.hamcrest.Matchers;
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

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Clientes (P77 · 3): quien gastó plata y no es alumno, profe ni equipo.
 *
 * <p>La plata entra por una venta de equipos cobrada en el mismo gesto —el
 * camino más corto a un pago en {@code ENTRARON} con destino— y cada caso
 * busca por un apellido o un nombre único, para que la base de desarrollo no
 * entre en la cuenta. La pareja de siempre: quien tiene que estar, y quien no.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ClienteTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private AlumnoRepository alumnos;

    /**
     * Una cuenta que pagó es cliente; una que sólo se registró, no — ésa está en
     * el Directorio. Y la fila dice qué compró y cuántas veces.
     */
    @Test
    void una_cuenta_que_pago_es_cliente_y_una_que_solo_se_registro_no() throws Exception {
        String apellido = apellidoUnico();
        Usuario compradora = crear(Rol.USUARIO, apellido);
        crear(Rol.USUARIO, apellido); // se registró, nunca pagó

        vender(compradora.getId(), null, "TRANSFERENCIA");
        vender(compradora.getId(), null, "EFECTIVO");

        mvc.perform(get("/api/clientes").param("buscar", apellido).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].idUsuario").value(compradora.getId()))
                .andExpect(jsonPath("$.contenido[0].email").value(compradora.getEmail()))
                .andExpect(jsonPath("$.contenido[0].pagos").value(2))
                .andExpect(jsonPath("$.contenido[0].lineas").value(Matchers.contains("VENTA_EQUIPOS")));
    }

    /**
     * Un alumno que compra un equipo no es "cliente": es alumno, y está en
     * Alumnos. Lo mismo alguien del equipo. Clientes es lo que queda cuando se
     * sacan las otras tres pantallas (P77 · 3).
     */
    @Test
    void un_alumno_o_alguien_del_equipo_que_pago_no_aparece_en_clientes() throws Exception {
        String apellido = apellidoUnico();
        Usuario alumna = crear(Rol.USUARIO, apellido);
        Alumno fila = new Alumno();
        fila.setUsuario(alumna);
        alumnos.save(fila);
        Usuario staff = crear(Rol.STAFF, apellido);

        vender(alumna.getId(), null, "EFECTIVO");
        vender(staff.getId(), null, "EFECTIVO");

        mvc.perform(get("/api/clientes").param("buscar", apellido).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(0));
    }

    /**
     * Quien pagó a nombre escrito es cliente aunque no tenga cuenta (P77 · 3:
     * <i>"si los sin cuenta están registrados y guardados, sí"</i>), y sus pagos
     * se agrupan por el nombre normalizado: "Marta Ruiz" y " marta ruiz " son
     * una fila con dos compras. Es agrupar para listar, no cruzar para unir.
     */
    @Test
    void quien_pago_a_nombre_escrito_es_cliente_agrupado_por_su_nombre() throws Exception {
        String nombre = "Marta Ruiz " + UUID.randomUUID().toString().substring(0, 8);

        vender(null, nombre, "EFECTIVO");
        vender(null, "  " + nombre.toUpperCase() + " ", "TRANSFERENCIA");

        mvc.perform(get("/api/clientes").param("buscar", nombre).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].idUsuario").value(Matchers.nullValue()))
                .andExpect(jsonPath("$.contenido[0].pagos").value(2))
                .andExpect(jsonPath("$.contenido[0].contacto").value("11-5555-0000"));
    }

    /** Una venta sin cobrar no es plata que entró: todavía no es cliente. */
    @Test
    void una_venta_sin_cobrar_no_hace_cliente() throws Exception {
        String apellido = apellidoUnico();
        Usuario persona = crear(Rol.USUARIO, apellido);

        vender(persona.getId(), null, null);

        mvc.perform(get("/api/clientes").param("buscar", apellido).header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.totalElementos").value(0));
    }

    @Test
    void un_usuario_comun_no_ve_la_lista() throws Exception {
        mvc.perform(get("/api/clientes").header("Authorization", credencialPara(crear(Rol.USUARIO, "X"))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================

    /** Una venta de equipos, cobrada si se dice cómo se pagó. */
    private void vender(Long idComprador, String nombreExterno, String medioPago) throws Exception {
        String comprador = idComprador != null
                ? "\"idUsuarioComprador\":" + idComprador
                : "\"nombreCompradorExterno\":\"" + nombreExterno + "\",\"contactoCompradorExterno\":\"11-5555-0000\"";
        String cobro = medioPago == null ? "" : ",\"medioPago\":\"" + medioPago + "\"";

        mvc.perform(post("/api/ventas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{" + comprador + ",\"idUsuarioVendedor\":" + crear(Rol.STAFF, "Vende").getId()
                        + ",\"modeloEquipo\":\"DDJ-FLX4\",\"precio\":450000,\"moneda\":\"ARS\""
                        + cobro + "}"))
                .andExpect(status().isCreated());
    }

    private String apellidoUnico() {
        return "Cliente" + UUID.randomUUID().toString().replace("-", "").substring(0, 12);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF, "Staff"));
    }

    private Usuario crear(Rol rol, String apellido) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido(apellido);
        usuario.setEmail("cliente-" + UUID.randomUUID() + "@lajuanita.local");
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
