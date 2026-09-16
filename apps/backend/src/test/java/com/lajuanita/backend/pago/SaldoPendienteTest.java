package com.lajuanita.backend.pago;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
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

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * La novena barrida (`mejoras.md` §21, P83–P85): "cuánto falta" es UNA
 * definición sobre las cuatro cosas que un pago salda, y Pagos y Deudores son
 * complementarias por construcción.
 *
 * <p>Casi todos los casos miran <b>las dos pantallas</b>, porque la falla que
 * importa no es que una diga de más sino que un pago no esté en ninguna. Y cada
 * regla de `V33` se prueba desde la API —el trigger lo prueba la suite SQL—:
 * lo que se afirma acá es que el servicio la dice antes, con un mensaje.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SaldoPendienteTest {

    private static final LocalDate EL_DIA = LocalDate.of(2027, 5, 10);

    @Autowired
    private MockMvc mvc;
    @Autowired
    private JwtEncoder codificador;
    @Autowired
    private UsuarioRepository usuarios;
    @Autowired
    private AlumnoRepository alumnos;
    @Autowired
    private InscripcionRepository inscripciones;
    @Autowired
    private JdbcTemplate jdbc;
    @Autowired
    private EntityManager em;

    private Long sala2;
    private Long alquiler;
    private Long claseDj;

    @BeforeEach
    void catalogo() {
        sala2 = jdbc.queryForObject("SELECT id_sala FROM sala WHERE nombre_sala = 'Sala 2'", Long.class);
        alquiler = jdbc.queryForObject("SELECT id_tipo_uso FROM tipo_uso WHERE codigo = 'ALQUILER_CABINA'", Long.class);
        claseDj = jdbc.queryForObject("SELECT id_tipo_uso FROM tipo_uso WHERE codigo = 'CLASE_DJ'", Long.class);
    }

    // == P83: el precio de una reserva ========================================

    /** El hallazgo que abrió la barrida: la cabina señada tiene que estar en Deudores. */
    @Test
    void la_cabina_seniada_esta_en_deudores_con_lo_que_falta_y_no_en_pagos() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        long senia = idDePago(alquilerConSenia(cliente, "90000", "45000", "10:00"));

        deudores()
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].motivo".formatted(cliente.getId())).value("RESERVA_A_SALDAR"))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].adeudado".formatted(cliente.getId())).value(45000.00))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].precio".formatted(cliente.getId())).value(90000.00))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].cobrado".formatted(cliente.getId())).value(45000.00))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].detalle".formatted(cliente.getId()))
                        .value("Alquiler de cabina en Sala 2, 10/05/2027 10:00"))
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].idReserva".formatted(cliente.getId())).isNotEmpty());
        pagosDe(cliente)
                .andExpect(jsonPath("$.contenido[?(@.idPago == %d)]".formatted(senia)).isEmpty());
    }

    /** Y cuando entra el resto, sale de Deudores y las dos filas pasan a Pagos. */
    @Test
    void con_el_resto_pagado_la_cabina_sale_de_deudores_y_entra_en_pagos() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        ResultActions alta = alquilerConSenia(cliente, "90000", "45000", "10:00");
        long senia = idDePago(alta);
        long reserva = idDeReserva(alta);

        long resto = idDePago(mvc.perform(pagar("""
                {"idUsuario":%d,"idReserva":%d,"monto":45000,"moneda":"ARS","medioPago":"EFECTIVO"}
                """.formatted(cliente.getId(), reserva))).andExpect(status().isCreated()));

        deudores().andExpect(jsonPath("$[?(@.idUsuario == %d)]".formatted(cliente.getId())).isEmpty());
        pagosDe(cliente)
                .andExpect(jsonPath("$.contenido[?(@.idPago == %d)]".formatted(senia)).isNotEmpty())
                .andExpect(jsonPath("$.contenido[?(@.idPago == %d)]".formatted(resto)).isNotEmpty());
    }

    @Test
    void un_alquiler_sin_precio_se_rechaza() throws Exception {
        mvc.perform(post("/api/reservas").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"10:00","horaFin":"11:00",
                         "sena":{"idUsuario":%d,"monto":45000,"moneda":"ARS","medioPago":"EFECTIVO"}}
                        """.formatted(sala2, alquiler, EL_DIA, crear(Rol.USUARIO).getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("necesita el precio total")));
    }

    /** La plata de una clase es la inscripción: un segundo precio es la segunda definición de siempre. */
    @Test
    void una_clase_con_precio_se_rechaza() throws Exception {
        mvc.perform(post("/api/reservas").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"precioTotal":1000,"moneda":"ARS",
                         "fecha":"%s","horaInicio":"10:00","horaFin":"11:30"}
                        """.formatted(sala2, claseDj, EL_DIA)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("Una clase no lleva precio")));
    }

    @Test
    void la_senia_en_otra_moneda_que_la_reserva_se_rechaza() throws Exception {
        mvc.perform(post("/api/reservas").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"precioTotal":200,"moneda":"USD",
                         "fecha":"%s","horaInicio":"10:00","horaFin":"11:00",
                         "sena":{"idUsuario":%d,"monto":45000,"moneda":"ARS","medioPago":"EFECTIVO"}}
                        """.formatted(sala2, alquiler, EL_DIA, crear(Rol.USUARIO).getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("moneda de la reserva")));
    }

    /** `V33` §3 desde la API: la moneda no cambia con la seña adentro; el precio sí. */
    @Test
    void no_se_le_cambia_la_moneda_a_una_reserva_con_la_senia_adentro_pero_el_precio_si() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        long reserva = idDeReserva(alquilerConSenia(cliente, "90000", "45000", "10:00"));

        editarReserva(reserva, "200", "USD")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("tiene pagos vivos en ARS")));

        editarReserva(reserva, "100000", "ARS")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.precioTotal").value(100000.00));
        deudores()
                .andExpect(jsonPath("$[?(@.idUsuario == %d)].adeudado".formatted(cliente.getId())).value(55000.00));
    }

    /** El hueco simétrico de `V31` que `pendientes.md` §4 anotaba, cerrado para la inscripción. */
    @Test
    void no_se_le_cambia_la_moneda_a_una_inscripcion_con_la_senia_adentro() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, "180000", Moneda.ARS);
        mvc.perform(pagar("""
                {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS","medioPago":"EFECTIVO","estadoPago":"SENADO"}
                """.formatted(alumno.getUsuario().getId(), curso.getId()))).andExpect(status().isCreated());

        mvc.perform(put("/api/inscripciones/" + curso.getId()).header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"disciplina":"DJ","nivel":"INICIAL","clasesContratadas":8,
                         "precioTotal":200,"moneda":"USD","cotizacionDolar":1450}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(containsString("tiene pagos vivos en ARS")));
    }

    // == P84: las otras dos cosas ==============================================

    /** Un trabajo es deuda desde que se entrega (Ignacio, 2026-09-15), no desde que se confirma. */
    @Test
    void un_trabajo_entregado_a_medio_cobrar_es_deuda_y_uno_sin_entregar_no() throws Exception {
        em.flush();
        long enProceso = trabajo("EN_PROCESO", "Todavia en el horno");
        long entregado = trabajo("ENTREGADO", "Ya entregado");
        for (long t : new long[] {enProceso, entregado}) {
            mvc.perform(pagar("""
                    {"nombrePagadorExterno":"Cliente Saldo","idTrabajoMastering":%d,"monto":100,
                     "moneda":"USD","cotizacionDolar":1450,"medioPago":"PAYPAL"}
                    """.formatted(t))).andExpect(status().isCreated());
        }

        deudores()
                .andExpect(jsonPath("$[?(@.idTrabajoMastering == %d)].motivo".formatted(entregado)).value("TRABAJO_A_COBRAR"))
                .andExpect(jsonPath("$[?(@.idTrabajoMastering == %d)].adeudado".formatted(entregado)).value(200.00))
                .andExpect(jsonPath("$[?(@.idTrabajoMastering == %d)].nombre".formatted(entregado)).value("Cliente Saldo"))
                .andExpect(jsonPath("$[?(@.idTrabajoMastering == %d)].detalle".formatted(entregado)).value("Mix & Mastering: Ya entregado"))
                .andExpect(jsonPath("$[?(@.idTrabajoMastering == %d)]".formatted(enProceso)).isEmpty());

        // Y el adelanto del no entregado está en Pagos (no es deuda), el del
        // entregado no (su cosa debe).
        mvc.perform(get("/api/pagos").param("buscar", "Cliente Saldo").header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.contenido[?(@.queSalda == 'Trabajo de mastering #%d')]".formatted(enProceso)).isNotEmpty())
                .andExpect(jsonPath("$.contenido[?(@.queSalda == 'Trabajo de mastering #%d')]".formatted(entregado)).isEmpty());
    }

    @Test
    void una_venta_sin_cobrar_es_deuda_de_quien_compro() throws Exception {
        em.flush();
        long venta = jdbc.queryForObject("""
                INSERT INTO venta_equipo (nombre_comprador_externo, contacto_comprador_externo,
                                          id_usuario_vendedor, modelo_equipo, precio, moneda)
                VALUES ('Compra Sin Pagar', '11-0000-0000', ?, 'XDJ-RR', 500000, 'ARS')
                RETURNING id_venta
                """, Long.class, crear(Rol.STAFF).getId());

        deudores()
                .andExpect(jsonPath("$[?(@.idVentaEquipo == %d)].motivo".formatted(venta)).value("VENTA_A_COBRAR"))
                .andExpect(jsonPath("$[?(@.idVentaEquipo == %d)].adeudado".formatted(venta)).value(500000.00))
                .andExpect(jsonPath("$[?(@.idVentaEquipo == %d)].nombre".formatted(venta)).value("Compra Sin Pagar"))
                .andExpect(jsonPath("$[?(@.idVentaEquipo == %d)].telefono".formatted(venta)).value("11-0000-0000"))
                .andExpect(jsonPath("$[?(@.idVentaEquipo == %d)].detalle".formatted(venta)).value("Equipo: XDJ-RR"));
    }

    /** "Lo que debo" del portal lee la misma lista: la cabina también está ahí. */
    @Test
    void la_cabina_seniada_esta_en_lo_que_debo_del_portal() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        alquilerConSenia(cliente, "90000", "45000", "10:00");

        mvc.perform(get("/api/me/estado-de-cuenta").header("Authorization", credencialPara(cliente)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.pendientes[?(@.motivo == 'RESERVA_A_SALDAR')].adeudado").value(45000.00));
    }

    // -------------------------------------------------------------------------

    private ResultActions alquilerConSenia(Usuario cliente, String precio, String senia, String desde)
            throws Exception {
        return mvc.perform(post("/api/reservas").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"precioTotal":%s,"moneda":"ARS",
                         "fecha":"%s","horaInicio":"%s","horaFin":"%s",
                         "participantes":[{"idUsuario":%d}],
                         "sena":{"idUsuario":%d,"monto":%s,"moneda":"ARS","medioPago":"EFECTIVO"}}
                        """.formatted(sala2, alquiler, precio, EL_DIA, desde,
                        desde.replace("10:", "11:"), cliente.getId(), cliente.getId(), senia)))
                .andExpect(status().isCreated());
    }

    private ResultActions editarReserva(long id, String precio, String moneda) throws Exception {
        return mvc.perform(put("/api/reservas/" + id).header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"10:00","horaFin":"11:00",
                         "precioTotal":%s,"moneda":"%s"}
                        """.formatted(sala2, alquiler, EL_DIA, precio, moneda)));
    }

    private long trabajo(String estado, String track) {
        return jdbc.queryForObject("""
                INSERT INTO trabajo_mastering (nombre_cliente_externo, tipo_trabajo, nombre_track,
                                               estado, moneda, precio_acordado, fecha_entrega_real)
                VALUES ('Cliente Saldo', 'MIX_MASTER', ?, ?, 'USD', 300, ?)
                RETURNING id_trabajo
                """, Long.class, track, estado, "ENTREGADO".equals(estado) ? LocalDate.now().minusDays(2) : null);
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder pagar(String cuerpo) {
        return post("/api/pagos").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo);
    }

    private ResultActions deudores() throws Exception {
        return mvc.perform(get("/api/pagos/deudores").header("Authorization", comoStaff()))
                .andExpect(status().isOk());
    }

    private ResultActions pagosDe(Usuario quien) throws Exception {
        return mvc.perform(get("/api/pagos").param("idUsuario", String.valueOf(quien.getId()))
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
    }

    private long idDePago(ResultActions resultado) throws Exception {
        return extraer(resultado, "\"idPago\"");
    }

    private long idDeReserva(ResultActions resultado) throws Exception {
        return extraer(resultado, "\"idReserva\"");
    }

    /** El alta de reserva devuelve `{reserva: {...}, idPagoSena}`: la seña viaja con otro nombre. */
    private long extraer(ResultActions resultado, String clave) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        String buscada = cuerpo.contains(clave + ":") ? clave : "\"idPagoSena\"";
        int desde = cuerpo.indexOf(buscada + ":") + buscada.length() + 1;
        int hasta = desde;
        while (hasta < cuerpo.length() && Character.isDigit(cuerpo.charAt(hasta))) hasta++;
        return Long.parseLong(cuerpo.substring(desde, hasta));
    }

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    private Inscripcion inscripcionDe(Alumno alumno, String precio, Moneda moneda) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(Disciplina.DJ);
        inscripcion.setNivel(Nivel.INICIAL);
        inscripcion.setClasesContratadas((short) 8);
        inscripcion.setPrecioTotal(new BigDecimal(precio));
        inscripcion.setMoneda(moneda);
        return inscripciones.save(inscripcion);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Saldo" + rol.name());
        usuario.setEmail("saldo-" + UUID.randomUUID() + "@lajuanita.local");
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
