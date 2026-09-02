package com.lajuanita.backend.reserva;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.junit.jupiter.api.BeforeEach;
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
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * La prereserva, de punta a punta (`V24`, `mejoras.md` §13 · C1).
 *
 * <p>Ignacio: <i>"que cuando le llegue la solicitud ponga confirmar sala, el monto,
 * todo, pero que no sea ahí cuando se cobra (…) el usuario se 'prereserva': tiene
 * 24hs para abonar o hasta que el admin lo cancele."</i>
 *
 * <p><b>Lo que esta suite persigue son las dos mitades, porque por separado
 * ninguna sirve:</b>
 *
 * <ul>
 *   <li>Que el horario <b>quede apartado de verdad</b> — si no ocupara, el que
 *       pidió primero no se quedaría con nada y la funcionalidad no existiría.
 *   <li>Que el plazo <b>no se pueda esquivar</b>, ni volviendo a entrar al estado
 *       ni dejando la deuda sin efecto.
 * </ul>
 *
 * <p>⚠️ Las reglas duras las sostiene la base y las suites SQL las atacan con
 * <code>probar_mensaje</code>. Lo que se verifica acá es la otra mitad: que el
 * circuito de la aplicación las use bien y que el rechazo llegue a la pantalla
 * con un estado HTTP y una frase que alguien pueda leer.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PrereservaTest {

    /** Lejos, pero adentro del techo de anticipación de los pedidos. */
    private static final LocalDate DENTRO_DE_UN_MES = LocalDate.now().plusDays(30);

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private SalaRepository salas;
    @Autowired private TipoUsoRepository tiposDeUso;
    @Autowired private ReservaRepository reservas;
    @Autowired private ReservaService circuito;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    private Long sala1;
    private Long alquiler;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        alquiler = idDeTipo("ALQUILER_CABINA");
    }

    // == Nacer apartada =======================================================

    @Test
    void preconfirmar_deja_la_reserva_apartada_con_su_plazo_y_su_deuda() throws Exception {
        long idSolicitud = pedirUnaCabina("09:00", "10:00");

        long idReserva = idReservaDe(aprobar(idSolicitud, true));

        Reserva reserva = reservas.findById(idReserva).orElseThrow();
        assertThat(reserva.getEstado()).isEqualTo(EstadoReserva.PRECONFIRMADA);
        assertThat(reserva.getVencePreconfirmacion()).isNotNull();

        // La deuda: es lo que la manda a la pantalla de deudores y lo que hace que
        // la base acepte el horario apartado.
        assertThat(jdbc.queryForObject(
                "SELECT estado_pago FROM pago WHERE id_reserva = ?", String.class, idReserva))
                .isEqualTo("DEBE");
    }

    /**
     * <b>El punto entero de la funcionalidad</b>: el que pidió primero se queda con
     * el horario. Si la prereserva no ocupara, esto no serviría para nada — y del
     * lado SQL nadie tuvo que tocar el EXCLUDE, porque `V1` escribió la definición
     * por lo que queda afuera.
     */
    @Test
    void una_prereserva_le_saca_el_horario_a_los_demas() throws Exception {
        aprobar(pedirUnaCabina("22:00", "23:00"), true);
        em.flush();

        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:00",
                         "sena":{"idUsuario":%d,"monto":1000,"moneda":"ARS","medioPago":"EFECTIVO"}}
                        """.formatted(sala1, alquiler, DENTRO_DE_UN_MES, crear(Rol.USUARIO).getId())))
                .andExpect(status().isConflict());
    }

    /**
     * El otro camino de nacimiento (P45): administración carga la reserva desde el
     * calendario y la deja apartada. Es el caso real de siempre — el que arregla
     * por WhatsApp y paga después.
     */
    @Test
    void tambien_se_aparta_cargando_la_reserva_desde_el_calendario() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);

        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:00",
                         "preconfirmacion":{"idUsuario":%d,"monto":45000,"moneda":"ARS",
                                            "medioPago":"TRANSFERENCIA","mensaje":"te espero"}}
                        """.formatted(sala1, alquiler, DENTRO_DE_UN_MES, cliente.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reserva.estado").value("PRECONFIRMADA"))
                .andExpect(jsonPath("$.reserva.venceEn").isNotEmpty());
    }

    /**
     * O se cobra, o se aparta. Con las dos, la reserva nacería apartada <i>y</i> con
     * plata adentro: un plazo corriendo sobre algo ya pagado.
     */
    @Test
    void no_se_puede_cobrar_y_apartar_a_la_vez() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);

        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:00",
                         "sena":{"idUsuario":%d,"monto":1000,"moneda":"ARS","medioPago":"EFECTIVO"},
                         "preconfirmacion":{"idUsuario":%d,"monto":1000,"moneda":"ARS",
                                            "medioPago":"EFECTIVO"}}
                        """.formatted(sala1, alquiler, DENTRO_DE_UN_MES,
                        cliente.getId(), cliente.getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.cobradaOApartada").isNotEmpty());
    }

    // == Cobrarla =============================================================

    /**
     * <b>Cobrar y confirmar son un acto y no dos.</b> Separados, quedan reservas
     * pagas que nadie confirmó — y mientras tanto el vencimiento sigue corriendo
     * sobre algo ya abonado, así que el horario se cae igual.
     */
    @Test
    void cobrar_la_deuda_confirma_la_reserva_y_borra_el_plazo() throws Exception {
        long idReserva = idReservaDe(aprobar(pedirUnaCabina("22:00", "23:00"), true));
        long idPago = jdbc.queryForObject(
                "SELECT id_pago FROM pago WHERE id_reserva = ?", Long.class, idReserva);

        mvc.perform(patch("/api/pagos/" + idPago + "/cobro")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoPago").value("PAGADO"));

        em.clear();
        Reserva reserva = reservas.findById(idReserva).orElseThrow();
        assertThat(reserva.getEstado()).isEqualTo(EstadoReserva.CONFIRMADA);
        assertThat(reserva.getVencePreconfirmacion()).isNull();
    }

    /**
     * El endpoint de cobro no es un editor de estados: sólo va de deuda a plata
     * adentro. Corregir un pago ya cobrado es anularlo, que deja la explicación.
     */
    @Test
    void no_se_cobra_un_pago_que_ya_estaba_cobrado() throws Exception {
        long idReserva = idReservaDe(aprobar(pedirUnaCabina("22:00", "23:00"), true));
        long idPago = jdbc.queryForObject(
                "SELECT id_pago FROM pago WHERE id_reserva = ?", Long.class, idReserva);

        mvc.perform(patch("/api/pagos/" + idPago + "/cobro").header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/pagos/" + idPago + "/cobro").header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest());
    }

    // == Vencerla =============================================================

    /**
     * P43: al cumplirse el plazo se cancela sola y libera el horario. <b>Es lo
     * único que sostiene "el primero que pide es el primero que reserva"</b>: si
     * nadie liberara, la sala quedaría tomada por alguien que no pagó.
     */
    @Test
    void al_vencerse_el_plazo_la_prereserva_se_cancela_sola() throws Exception {
        long idReserva = idReservaDe(aprobar(pedirUnaCabina("22:00", "23:00"), true));

        // El reloj no se puede adelantar, así que se atrasa el vencimiento. Va por
        // SQL crudo porque la aplicación no tiene —ni debe tener— forma de mover
        // un plazo ya firmado.
        em.flush();
        jdbc.update("UPDATE reserva SET vence_preconfirmacion = now() - interval '1 hour' "
                + "WHERE id_reserva = ?", idReserva);
        em.clear();

        assertThat(circuito.vencerLasPrereservas()).isPositive();

        em.clear();
        Reserva reserva = reservas.findById(idReserva).orElseThrow();
        assertThat(reserva.getEstado()).isEqualTo(EstadoReserva.CANCELADA);
        assertThat(reserva.getVencePreconfirmacion()).isNull();
    }

    /**
     * P46: la deuda de una prereserva vencida <b>queda anotada</b> —es historia, y
     * es información comercial— pero <b>deja de ser cobrable</b>. Es el espejo de
     * la regla que `V11` ya tenía: una reserva cancelada no debe seña, así que
     * tampoco se le cobra.
     */
    @Test
    void la_deuda_de_una_prereserva_vencida_sale_de_deudores() throws Exception {
        Usuario cliente = crear(Rol.USUARIO);
        long idReserva = idReservaDe(aprobar(pedirUnaCabina("22:00", "23:00", cliente), true));

        mvc.perform(get("/api/pagos/deudores").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idUsuario == " + cliente.getId() + ")]").isNotEmpty());

        em.flush();
        jdbc.update("UPDATE reserva SET vence_preconfirmacion = now() - interval '1 hour' "
                + "WHERE id_reserva = ?", idReserva);
        em.clear();
        circuito.vencerLasPrereservas();
        em.flush();

        // La fila del pago sigue existiendo: no se borró ni se anuló.
        assertThat(jdbc.queryForObject(
                "SELECT estado_pago FROM pago WHERE id_reserva = ?", String.class, idReserva))
                .isEqualTo("DEBE");

        mvc.perform(get("/api/pagos/deudores").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idUsuario == " + cliente.getId() + ")]").isEmpty());
    }

    // == Los esquives =========================================================

    /**
     * El rodeo que `V18` §1b ya había encontrado en el sello, con otra ropa:
     * confirmar, volver a apartada, anular el pago. Sala tomada, cero plata.
     *
     * <p>Se ataca por SQL crudo <b>a propósito</b>: la aplicación no ofrece esa
     * transición, así que un caso que fuera sólo por la API estaría probando el
     * pre-chequeo y no la regla. Es el mismo recurso que usa {@code InscripcionTest}
     * con la firma de la baja de nivel.
     */
    @Test
    void no_se_vuelve_a_apartar_una_reserva_ya_confirmada_ni_por_sql() throws Exception {
        long idReserva = idReservaDe(aprobar(pedirUnaCabina("22:00", "23:00"), true));
        long idPago = jdbc.queryForObject(
                "SELECT id_pago FROM pago WHERE id_reserva = ?", Long.class, idReserva);

        mvc.perform(patch("/api/pagos/" + idPago + "/cobro").header("Authorization", comoStaff()))
                .andExpect(status().isOk());
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE reserva SET estado = 'PRECONFIRMADA', "
                        + "vence_preconfirmacion = now() + interval '24 hours', "
                        + "id_usuario_modifico = ? WHERE id_reserva = ?",
                idReserva, idReserva))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("se entra solo al crearla");
    }

    /** Del plazo se sale cobrando o cancelando. Darla por dictada sin cobrarla, no. */
    @Test
    void una_prereserva_no_pasa_a_finalizada() throws Exception {
        long idReserva = idReservaDe(aprobar(pedirUnaCabina("22:00", "23:00"), true));
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE reserva SET estado = 'FINALIZADA', id_usuario_modifico = ? "
                        + "WHERE id_reserva = ?",
                idReserva, idReserva))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("solo puede confirmarse");
    }

    // == Y el camino de siempre sigue andando =================================

    /**
     * Aprobar cobrando en el momento <b>no se sacó</b>: quien ya transfirió antes de
     * que le contesten no tiene por qué pasar por un plazo que no necesita.
     */
    @Test
    void aprobar_cobrando_sigue_dejando_la_reserva_confirmada() throws Exception {
        long idReserva = idReservaDe(aprobar(pedirUnaCabina("22:00", "23:00"), false));

        Reserva reserva = reservas.findById(idReserva).orElseThrow();
        assertThat(reserva.getEstado()).isEqualTo(EstadoReserva.CONFIRMADA);
        assertThat(reserva.getVencePreconfirmacion()).isNull();
        assertThat(jdbc.queryForObject(
                "SELECT estado_pago FROM pago WHERE id_reserva = ?", String.class, idReserva))
                .isEqualTo("SENADO");
    }

    // =========================================================================

    private long pedirUnaCabina(String desde, String hasta) throws Exception {
        return pedirUnaCabina(desde, hasta, crear(Rol.USUARIO));
    }

    private long pedirUnaCabina(String desde, String hasta, Usuario quienPide) throws Exception {
        ResultActions pedido = mvc.perform(post("/api/me/solicitudes")
                .header("Authorization", credencialPara(quienPide))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s"}
                        """.formatted(sala1, alquiler, DENTRO_DE_UN_MES, desde, hasta)))
                .andExpect(status().isCreated());

        return numeroDe(cuerpo(pedido), "idSolicitud");
    }

    private ResultActions aprobar(long idSolicitud, boolean preconfirmando) throws Exception {
        return mvc.perform(patch("/api/solicitudes-reserva/" + idSolicitud + "/aprobacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"monto":45000,"moneda":"ARS","medioPago":"TRANSFERENCIA",
                         "preconfirmar":%s,"respuesta":"listo"}
                        """.formatted(preconfirmando)))
                .andExpect(status().isOk());
    }

    private long idReservaDe(ResultActions aprobacion) throws Exception {
        return numeroDe(cuerpo(aprobacion), "idReserva");
    }

    private String cuerpo(ResultActions resultado) throws Exception {
        return resultado.andReturn().getResponse().getContentAsString();
    }

    /** Se lee como texto, igual que el resto de las suites. Ver {@code SolicitanteTest}. */
    private long numeroDe(String cuerpo, String clave) {
        var encontrado = java.util.regex.Pattern
                .compile("\"" + clave + "\"\\s*:\\s*(\\d+)").matcher(cuerpo);
        if (!encontrado.find()) {
            throw new AssertionError("No vino \"" + clave + "\" en la respuesta: " + cuerpo);
        }
        return Long.parseLong(encontrado.group(1));
    }

    private Long idDeSala(String nombre) {
        return salas.findAll().stream()
                .filter(s -> s.getNombreSala().equals(nombre))
                .findFirst().orElseThrow().getId();
    }

    private Long idDeTipo(String codigo) {
        return tiposDeUso.findAll().stream()
                .filter(t -> t.getCodigo().equals(codigo))
                .findFirst().orElseThrow().getId();
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Prereserva" + rol.name());
        usuario.setEmail("prereserva-" + UUID.randomUUID() + "@lajuanita.local");
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
