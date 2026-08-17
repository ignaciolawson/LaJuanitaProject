package com.lajuanita.backend.venta;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.dao.DataAccessException;
import org.springframework.http.MediaType;
import org.springframework.jdbc.core.JdbcTemplate;
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

import jakarta.persistence.EntityManager;

/**
 * Módulo 3, pantalla 6 — la venta de equipamiento.
 *
 * <p>Lo que esta suite persigue es distinto de lo del resto del módulo. Acá casi no
 * hay cuentas: hay <b>una operación que puede quedar sin dueño</b>. El comprador
 * puede no tener cuenta, el cobro puede no existir todavía, y la fila no se puede
 * borrar nunca — así que los tres casos caros son *"¿se puede cargar una venta que
 * después nadie pueda reclamar?"*, *"¿la plata quedó atada a la venta correcta?"* y
 * *"¿qué pasa cuando alguien se equivoca?"*.
 *
 * <p>Fechas de 2030, como {@code PagoTest}: la base de desarrollo puede tener
 * cargado a mano y el listado agrega todo lo que caiga en el rango.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class VentaEquipoTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    // == El alta ==============================================================

    @Test
    void vender_a_un_alumno_con_cuenta() throws Exception {
        Usuario comprador = crear(Rol.USUARIO);
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"idUsuarioComprador":%d,"idUsuarioVendedor":%d,"categoria":"Controladora",
                 "marca":"Pioneer","modeloEquipo":"DDJ-FLX4","precio":450000,"moneda":"ARS",
                 "fechaVenta":"2030-06-10"}
                """.formatted(comprador.getId(), vendedor.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.modeloEquipo").value("DDJ-FLX4"))
                .andExpect(jsonPath("$.idUsuarioComprador").value(comprador.getId()))
                // El nombre de la cuenta gana sobre el texto libre.
                .andExpect(jsonPath("$.comprador").value("Prueba VentaUSUARIO"))
                .andExpect(jsonPath("$.idUsuarioVendedor").value(vendedor.getId()))
                // Sin `medioPago` la venta queda sin cobrar, y se dice.
                .andExpect(jsonPath("$.cobrada").value(false));
    }

    /**
     * <b>El caso que justifica las tres columnas del comprador.</b> Mucha gente
     * llega por el acuerdo con Pioneer y no se registra en el sistema por comprar
     * un CDJ: tener cuenta y ser cliente son cosas distintas.
     */
    @Test
    void vender_a_alguien_sin_cuenta_en_el_sistema() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"nombreCompradorExterno":"Joaco (amigo de Ghezz)",
                 "contactoCompradorExterno":"11-5555-4444","idUsuarioVendedor":%d,
                 "modeloEquipo":"CDJ-3000","precio":2400,"moneda":"USD",
                 "cotizacionDolar":1450}
                """.formatted(vendedor.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.comprador").value("Joaco (amigo de Ghezz)"))
                .andExpect(jsonPath("$.idUsuarioComprador").doesNotExist());
    }

    /**
     * Espeja {@code venta_comprador_identificado}. <b>Una venta sin comprador es
     * una fila que después no se puede reclamar</b>: el equipo salió y no hay a
     * quién asociarlo. Como acá lo ataja el DTO, sale 400 y con el campo señalado —
     * el CHECK devolvería un 409 que no nombra ninguno.
     */
    @Test
    void una_venta_sin_comprador_identificado_se_rechaza() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"idUsuarioVendedor":%d,"modeloEquipo":"DDJ-FLX4","precio":450000,"moneda":"ARS"}
                """.formatted(vendedor.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.compradorIdentificado").isNotEmpty());
    }

    /** Y la red de abajo: la base lo rechaza igual, sin pasar por la aplicación. */
    @Test
    void la_base_tampoco_acepta_una_venta_sin_comprador() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);
        em.flush();

        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO venta_equipo (id_usuario_vendedor, modelo_equipo, precio)
                VALUES (?, 'DDJ-FLX4', 450000)
                """, vendedor.getId()))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("venta_comprador_identificado");
    }

    @Test
    void una_venta_en_dolares_sin_cotizacion_se_rechaza() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"nombreCompradorExterno":"Externo","idUsuarioVendedor":%d,
                 "modeloEquipo":"CDJ-3000","precio":2400,"moneda":"USD"}
                """.formatted(vendedor.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.cotizacionPresenteSiEsUsd").isNotEmpty());
    }

    @Test
    void una_venta_sin_modelo_se_rechaza() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"nombreCompradorExterno":"Externo","idUsuarioVendedor":%d,
                 "precio":450000,"moneda":"ARS"}
                """.formatted(vendedor.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.modeloEquipo").isNotEmpty());
    }

    @Test
    void una_venta_con_un_vendedor_que_no_existe_da_404() throws Exception {
        mvc.perform(vender("""
                {"nombreCompradorExterno":"Externo","idUsuarioVendedor":99999999,
                 "modeloEquipo":"DDJ-FLX4","precio":450000,"moneda":"ARS"}
                """))
                .andExpect(status().isNotFound());
    }

    // == El cobro =============================================================

    /**
     * <b>La venta y su plata, en la misma transacción.</b> Es el caso normal de un
     * proceso ad hoc: se vendió y se cobró.
     */
    @Test
    void vender_y_cobrar_en_el_mismo_gesto() throws Exception {
        Usuario comprador = crear(Rol.USUARIO);
        Usuario vendedor = crear(Rol.STAFF);

        long id = idDe(mvc.perform(vender("""
                {"idUsuarioComprador":%d,"idUsuarioVendedor":%d,"modeloEquipo":"DDJ-FLX4",
                 "precio":450000,"moneda":"ARS","medioPago":"TRANSFERENCIA",
                 "fechaVenta":"2030-06-10"}
                """.formatted(comprador.getId(), vendedor.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.cobrada").value(true)));

        em.flush();
        // El pago apunta a ESTA venta y a nadie más: `pago_tiene_destino` exige que
        // salde una sola cosa, y acá se verifica que sea la correcta.
        assertThat(jdbc.queryForObject(
                "SELECT id_venta_equipo FROM pago WHERE id_usuario = ?", Long.class,
                comprador.getId()))
                .isEqualTo(id);
        assertThat(jdbc.queryForObject(
                "SELECT monto FROM pago WHERE id_venta_equipo = ?", java.math.BigDecimal.class, id))
                .isEqualByComparingTo("450000");
    }

    /**
     * <b>{@code pago.id_usuario} es NOT NULL</b>, así que el cobro de alguien sin
     * cuenta no tiene dónde colgarse. Sin este chequeo el alta moría con un 409 de
     * la base; con él dice qué hacer.
     */
    @Test
    void no_se_puede_cobrar_a_un_comprador_sin_cuenta() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"nombreCompradorExterno":"Externo","idUsuarioVendedor":%d,
                 "modeloEquipo":"DDJ-FLX4","precio":450000,"moneda":"ARS",
                 "medioPago":"EFECTIVO"}
                """.formatted(vendedor.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.cobroConCompradorConCuenta").isNotEmpty());
    }

    // NO HAY CASO DE "si el cobro falla, la venta no queda a medias", y vale la
    // pena decir por qué en vez de dejar uno que no prueba eso.
    //
    // Se escribió uno con `"medioPago":"CRIPTO"` y pasaba... por el motivo
    // equivocado: un valor que no está en el enum lo rechaza Jackson al
    // deserializar el cuerpo, así que el pedido nunca llega al service y la venta
    // nunca se intenta. Probaba Jackson.
    //
    // Buscando uno de verdad no apareció ninguno, y eso es información sobre el
    // diseño y no una carencia de la suite: todo lo que puede rechazar el cobro
    // -comprador inexistente, moneda sin cotización, comprador sin cuenta, monto
    // no positivo- se verifica ANTES de insertar la venta, en el DTO o en
    // `buscarPersona`. El `@Transactional` sigue siendo la red por si eso deja de
    // ser cierto, pero hoy no hay forma de llegar a esa red desde la API.

    // == El listado ===========================================================

    @Test
    void el_listado_busca_por_equipo_y_por_comprador() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);
        cargar(vendedor, "Pioneer", "CDJ-3000", "Joaco Externo");
        cargar(vendedor, "Roland", "SP-404", "Otra Persona");

        mvc.perform(get("/api/ventas?buscar=CDJ").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].modeloEquipo").value("CDJ-3000"));

        mvc.perform(get("/api/ventas?buscar=Joaco").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].modeloEquipo").value("CDJ-3000"));
    }

    /**
     * <b>Una venta sin marca no puede desaparecer de la búsqueda por su modelo.</b>
     * Un {@code LIKE} contra NULL da NULL, así que sin los {@code COALESCE} del
     * repositorio la fila se cae del resultado sin ningún error.
     */
    @Test
    void una_venta_sin_marca_ni_categoria_igual_se_encuentra() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"nombreCompradorExterno":"Externo","idUsuarioVendedor":%d,
                 "modeloEquipo":"XDJ-RX3","precio":900000,"moneda":"ARS"}
                """.formatted(vendedor.getId())))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/ventas?buscar=XDJ").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1));
    }

    /** El sello de carga vuelve en la respuesta: necesita `@Generated`, no basta `insertable=false`. */
    @Test
    void el_alta_devuelve_cuando_se_cargo() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(vender("""
                {"nombreCompradorExterno":"Externo","idUsuarioVendedor":%d,
                 "modeloEquipo":"DDJ-FLX4","precio":450000,"moneda":"ARS",
                 "fechaVenta":"2030-01-05"}
                """.formatted(vendedor.getId())))
                .andExpect(status().isCreated())
                // La fecha del HECHO es la que se mandó...
                .andExpect(jsonPath("$.fechaVenta").value("2030-01-05"))
                // ...y la de la CARGA la pone la base. `V7` las separó por esto.
                .andExpect(jsonPath("$.fechaRegistro").isNotEmpty());
    }

    // == Permisos y borrado ===================================================

    @Test
    void un_directivo_lee_las_ventas_y_no_carga_ninguna() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);

        mvc.perform(get("/api/ventas").header("Authorization", credencialPara(crear(Rol.DIRECTIVO))))
                .andExpect(status().isOk());

        mvc.perform(post("/api/ventas")
                .header("Authorization", credencialPara(crear(Rol.DIRECTIVO)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombreCompradorExterno":"Externo","idUsuarioVendedor":%d,
                         "modeloEquipo":"DDJ-FLX4","precio":450000,"moneda":"ARS"}
                        """.formatted(vendedor.getId())))
                .andExpect(status().isForbidden());
    }

    @Test
    void un_usuario_comun_no_ve_las_ventas() throws Exception {
        mvc.perform(get("/api/ventas").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    /**
     * `V9` prohibió el DELETE cuando le dio estado de anulación. Es historial de un
     * negocio real y el mensaje nombra la salida.
     */
    @Test
    void una_venta_no_se_puede_borrar_ni_por_sql() throws Exception {
        Usuario vendedor = crear(Rol.STAFF);
        long id = cargar(vendedor, "Pioneer", "DDJ-FLX4", "Externo");
        em.flush();

        assertThatThrownBy(() -> jdbc.update("DELETE FROM venta_equipo WHERE id_venta = ?", id))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("venta_equipo -> anulada = TRUE");
    }

    // =========================================================================

    private long cargar(Usuario vendedor, String marca, String modelo, String comprador)
            throws Exception {
        return idDe(mvc.perform(vender("""
                {"nombreCompradorExterno":"%s","idUsuarioVendedor":%d,"marca":"%s",
                 "modeloEquipo":"%s","precio":450000,"moneda":"ARS","fechaVenta":"2030-06-10"}
                """.formatted(comprador, vendedor.getId(), marca, modelo)))
                .andExpect(status().isCreated()));
    }

    private MockHttpServletRequestBuilder vender(String cuerpo) {
        return post("/api/ventas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private long idDe(ResultActions resultado) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        String clave = "\"idVenta\":";
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return Long.parseLong(cuerpo.substring(desde, hasta).trim());
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Venta" + rol.name());
        usuario.setEmail("venta-" + UUID.randomUUID() + "@lajuanita.local");
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
