package com.lajuanita.backend.mastering;

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
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * Módulo 6 — Mix & Mastering.
 *
 * <p><b>La pregunta de esta suite es una sola: ¿se puede sacar el premaster sin
 * pagar?</b> Es la regla que le resuelve a Ghezz el <i>"básicamente estoy fiando el
 * servicio"</i>, y tiene tres puertas distintas, cada una con su caso:
 *
 * <ol>
 *   <li>Liberarlo de frente sin pago — lo para el trigger de `V1` §8.4.
 *   <li>Liberarlo con pago y después anular el pago — lo para `V6` §6.
 *   <li>Mirarlo desde el portal antes de que lo liberen — lo para
 *       {@code TrabajoDelPortal}, que decide en el mapeo y no en la pantalla.
 * </ol>
 *
 * <p>La tercera es la única que este módulo tuvo que construir, y es la más fácil
 * de romper sin que nada falle: un link escondido en el front viaja igual en la
 * respuesta HTTP y se lee con las herramientas del navegador.
 *
 * <p><b>Y el caso de `V15`</b>: la cuarta revisión de un trabajo de tres tiene que
 * poder registrarse. Hasta esa migración la base la rechazaba, lo que hacía
 * imposible la alerta que §9 pide dar.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class MasteringTest {

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    // == La regla del módulo =================================================

    @Test
    void no_se_libera_el_premaster_sin_pago() throws Exception {
        long trabajo = trabajoConPremasterCargado();

        liberar(trabajo, null)
                .andExpect(status().isConflict())
                // El texto sale del trigger y explica la salida: es lo que la
                // pantalla muestra, así que tiene que decir algo útil.
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("sin un pago registrado")));
    }

    @Test
    void con_el_pago_registrado_se_libera() throws Exception {
        long trabajo = trabajoConPremasterCargado();
        cobrar(trabajo, "150.00").andExpect(status().isCreated());

        liberar(trabajo, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.premasterLiberado").value(true))
                .andExpect(jsonPath("$.liberadoSinPago").value(false));
    }

    /**
     * <b>La salida, que existe a propósito.</b> Un bloqueo sin excepción se esquiva
     * por afuera del sistema —Ghezz avisó que con gente cercana es más flexible— y
     * ahí el sistema pasaría a mentir. Cuesta una frase escrita, y queda firmada.
     */
    @Test
    void sin_pago_se_libera_igual_escribiendo_el_motivo() throws Exception {
        long trabajo = trabajoConPremasterCargado();

        liberar(trabajo, "Cliente de mucha exposición, arreglamos que paga en el mes")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.premasterLiberado").value(true))
                .andExpect(jsonPath("$.liberadoSinPago").value(true))
                .andExpect(jsonPath("$.motivoLiberacion").isNotEmpty());
    }

    /** Liberar algo que no está cargado deja al cliente con un "listo" que no le da nada. */
    @Test
    void no_se_libera_un_premaster_que_no_esta_cargado() throws Exception {
        long trabajo = alta(null, "Cliente Externo");
        cobrar(trabajo, "150.00").andExpect(status().isCreated());

        liberar(trabajo, null)
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("no hay nada que liberar")));
    }

    /**
     * <b>`V6` §6, desde el módulo que la necesita.</b> El ataque son tres pasos:
     * cobrar, liberar, anular el pago. Sin esta regla el cliente se lleva el
     * premaster y en la base no queda ningún cobro.
     */
    @Test
    void no_se_anula_el_pago_que_respalda_un_premaster_liberado() throws Exception {
        long trabajo = trabajoConPremasterCargado();
        cobrar(trabajo, "150.00").andExpect(status().isCreated());
        liberar(trabajo, null).andExpect(status().isOk());

        // El id del pago no vuelve en la respuesta —el endpoint devuelve el
        // trabajo— así que se lo pregunta a la base. El `flush` es obligatorio:
        // sin él la fila todavía está en la sesión de Hibernate y esta consulta
        // no la ve.
        em.flush();
        Long pago = jdbc.queryForObject(
                "SELECT id_pago FROM pago WHERE id_trabajo_mastering = ?", Long.class, trabajo);

        mvc.perform(patch("/api/pagos/" + pago + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"me arrepentí"}
                        """))
                .andExpect(status().isConflict());
    }

    // == El portal ===========================================================

    /**
     * <b>El par que sostiene la mitad que este módulo construyó.</b> El mismo
     * trabajo, el mismo endpoint, dos momentos: antes de liberar el link no está en
     * la respuesta, después sí. Si alguien "simplifica" reusando
     * {@code TrabajoResumen} para el portal, este caso cae.
     */
    @Test
    void el_cliente_no_recibe_el_link_del_premaster_hasta_que_se_libera() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        long trabajo = alta(cliente.getId(), null);
        editarConPremaster(trabajo);

        mvc.perform(get("/api/me/mastering").header("Authorization", credencialPara(cliente)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].premasterLiberado").value(false))
                .andExpect(jsonPath("$[0].urlPremaster").doesNotExist());

        cobrar(trabajo, "150.00");
        liberar(trabajo, null).andExpect(status().isOk());

        mvc.perform(get("/api/me/mastering").header("Authorization", credencialPara(cliente)))
                .andExpect(jsonPath("$[0].premasterLiberado").value(true))
                .andExpect(jsonPath("$[0].urlPremaster").isNotEmpty());
    }

    /** El otro par: lo del vecino no se ve por el mismo endpoint. */
    @Test
    void el_cliente_no_ve_los_trabajos_de_otro() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        alta(cliente.getId(), null);

        mvc.perform(get("/api/me/mastering")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    /** Las notas internas son de administración: por eso el portal tiene su propio DTO. */
    @Test
    void el_cliente_no_ve_las_notas_internas() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        alta(cliente.getId(), null);

        mvc.perform(get("/api/me/mastering").header("Authorization", credencialPara(cliente)))
                .andExpect(jsonPath("$[0].notasInternas").doesNotExist());
    }

    @Test
    void el_tablero_es_de_administracion() throws Exception {
        mvc.perform(get("/api/mastering")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    // == Revisiones ==========================================================

    /**
     * <b>El caso de `V15`.</b> Tres incluidas, cuatro hechas: tiene que entrar. La
     * base lo rechazaba hasta esa migración —`V6` §3— y con eso la alerta de §9 era
     * imposible de escribir: no se puede avisar de algo que no se puede registrar.
     */
    @Test
    void la_cuarta_revision_de_un_trabajo_de_tres_se_registra() throws Exception {
        long trabajo = alta(null, "Cliente Externo");

        for (int i = 0; i < 4; i++) {
            mvc.perform(post("/api/mastering/" + trabajo + "/revision")
                    .header("Authorization", comoStaff()))
                    .andExpect(status().isOk());
        }

        mvc.perform(get("/api/mastering/" + trabajo).header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.revisionesRealizadas").value(4))
                .andExpect(jsonPath("$.revisionesIncluidas").value(3));
    }

    // == Estados =============================================================

    @Test
    void el_estado_no_retrocede() throws Exception {
        long trabajo = alta(null, "Cliente Externo");
        cambiarEstado(trabajo, "EN_PROCESO").andExpect(status().isOk());
        cambiarEstado(trabajo, "ENTREGADO").andExpect(status().isOk());

        cambiarEstado(trabajo, "EN_PROCESO").andExpect(status().isConflict());
    }

    /** Se cancela desde donde sea: `V1` §8.5 deja CANCELADO fuera de la escalera. */
    @Test
    void se_puede_cancelar_desde_cualquier_estado() throws Exception {
        long trabajo = alta(null, "Cliente Externo");
        cambiarEstado(trabajo, "ENTREGADO").andExpect(status().isOk());

        cambiarEstado(trabajo, "CANCELADO")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CANCELADO"));
    }

    // == El cobro ============================================================

    /**
     * Cobrar el total de un trabajo ya entregado lo cierra. Sin esto el tablero
     * muestra DEBE sobre algo que está pago, y ese tablero es justamente el que se
     * abre para saber quién debe.
     */
    @Test
    void cobrar_el_total_de_un_trabajo_entregado_lo_deja_pagado() throws Exception {
        long trabajo = alta(null, "Cliente Externo");
        cambiarEstado(trabajo, "ENTREGADO").andExpect(status().isOk());

        cobrar(trabajo, "150.00")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PAGADO"));
    }

    /** Una seña sobre algo en proceso no lo vuelve un trabajo terminado. */
    @Test
    void cobrar_algo_todavia_en_proceso_no_mueve_el_estado() throws Exception {
        long trabajo = alta(null, "Cliente Externo");
        cambiarEstado(trabajo, "EN_PROCESO").andExpect(status().isOk());

        cobrar(trabajo, "150.00")
                .andExpect(jsonPath("$.estado").value("EN_PROCESO"))
                .andExpect(jsonPath("$.cobrado").value(150.00));
    }

    @Test
    void un_cobro_parcial_deja_el_trabajo_donde_estaba() throws Exception {
        long trabajo = alta(null, "Cliente Externo");
        cambiarEstado(trabajo, "ENTREGADO").andExpect(status().isOk());

        cobrar(trabajo, "50.00")
                .andExpect(jsonPath("$.estado").value("ENTREGADO"))
                .andExpect(jsonPath("$.cobrado").value(50.00));
    }

    // == El cliente ==========================================================

    /**
     * <b>La contracara de `usuario` como raíz.</b> La mayoría de los clientes de
     * M&M mandan un track y nunca se registran; exigirles cuenta sería inventarles
     * una para poder anotar el trabajo.
     */
    @Test
    void un_cliente_sin_cuenta_se_carga_con_su_nombre() throws Exception {
        long trabajo = alta(null, "Fulano De Tal");

        mvc.perform(get("/api/mastering/" + trabajo).header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.cliente").value("Fulano De Tal"))
                .andExpect(jsonPath("$.clienteTieneCuenta").value(false));
    }

    @Test
    void sin_cliente_de_ningun_tipo_el_trabajo_no_entra() throws Exception {
        mvc.perform(post("/api/mastering")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"tipoTrabajo":"MIX_MASTER","nombreTrack":"Sin dueño"}
                        """))
                .andExpect(status().isBadRequest());
    }

    @Test
    void un_link_que_no_parece_un_link_se_rechaza() throws Exception {
        mvc.perform(post("/api/mastering")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"tipoTrabajo":"MIX","nombreTrack":"Tema","nombreClienteExterno":"Fulano",
                         "urlMaterialCliente":"tema_final_v3.wav"}
                        """))
                .andExpect(status().isBadRequest());
    }

    // =========================================================================

    private long trabajoConPremasterCargado() throws Exception {
        long trabajo = alta(null, "Cliente Externo");
        editarConPremaster(trabajo);
        return trabajo;
    }

    private void editarConPremaster(long trabajo) throws Exception {
        mvc.perform(put("/api/mastering/" + trabajo)
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"tipoTrabajo":"MIX_MASTER","nombreTrack":"Tema de prueba",
                         "precioAcordado":150.00,"moneda":"USD","revisionesIncluidas":3,
                         "urlMaster":"https://drive.example/master",
                         "urlPremaster":"https://drive.example/premaster"}
                        """))
                .andExpect(status().isOk());
    }

    private long alta(Long idCliente, String nombreExterno) throws Exception {
        String cliente = idCliente != null
                ? "\"idClienteUsuario\":" + idCliente
                : "\"nombreClienteExterno\":\"" + nombreExterno + "\"";

        ResultActions creado = mvc.perform(post("/api/mastering")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {%s,"tipoTrabajo":"MIX_MASTER","nombreTrack":"Tema de prueba",
                         "precioAcordado":150.00,"moneda":"USD",
                         "notasInternas":"el bajo viene muy comprimido"}
                        """.formatted(cliente)))
                .andExpect(status().isCreated());

        return idDe(creado, "\"idTrabajo\":");
    }

    private ResultActions liberar(long trabajo, String motivo) throws Exception {
        String cuerpo = motivo == null ? "{}" : "{\"motivo\":\"" + motivo + "\"}";

        return mvc.perform(patch("/api/mastering/" + trabajo + "/premaster")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo));
    }

    private ResultActions cobrar(long trabajo, String monto) throws Exception {
        // El pago necesita una cuenta aunque el trabajo sea de un cliente externo:
        // `pago.id_usuario` es NOT NULL. Es la asimetría que la pantalla avisa.
        Usuario quienCobra = crear(Rol.USUARIO);

        return mvc.perform(post("/api/mastering/" + trabajo + "/cobro")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"monto":%s,"moneda":"USD","cotizacionDolar":1000,
                         "medioPago":"TRANSFERENCIA"}
                        """.formatted(quienCobra.getId(), monto)));
    }

    private ResultActions cambiarEstado(long trabajo, String estado) throws Exception {
        return mvc.perform(patch("/api/mastering/" + trabajo + "/estado?estado=" + estado)
                .header("Authorization", comoStaff()));
    }

    private long idDe(ResultActions resultado, String clave) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
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
        usuario.setApellido("Mastering" + rol.name());
        usuario.setEmail("mastering-" + UUID.randomUUID() + "@lajuanita.local");
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
