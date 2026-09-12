package com.lajuanita.backend.solicitante;

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
import java.util.concurrent.atomic.AtomicInteger;

import com.jayway.jsonpath.JsonPath;
import org.hamcrest.Matchers;
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
import org.springframework.test.context.transaction.TestTransaction;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * El buzón de solicitantes, de punta a punta (`V20`, hallazgo #7).
 *
 * <p>Lo que esta suite persigue son dos cosas que se rompen distinto:
 *
 * <ul>
 *   <li><b>Que el endpoint público sea exactamente un POST.</b> Es la primera vez
 *       que este sistema deja escribir a alguien sin cuenta, y el error caro no es
 *       que entre basura sino que la misma ruta deje <i>leer</i>: el buzón tiene
 *       teléfonos y mails de gente real. Por eso hay un caso que pide el listado
 *       sin credencial y espera 401.
 *   <li><b>Que una ficha no se pueda atender dos veces.</b> Convertir crea una
 *       cuenta; hacerlo dos veces son dos cuentas para la misma persona. El
 *       servicio lo chequea y la base lo sostiene, y hay un caso por cada uno —el
 *       de la base entra por SQL crudo, porque un chequeo de Java que se borra deja
 *       la suite verde.
 * </ul>
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SolicitanteTest {

    /**
     * Los teléfonos tienen que ser únicos entre cuentas (`usuario_telefono_unico`),
     * y esta suite crea cuentas de verdad. Un literal repetido haría fallar el
     * segundo caso que convierta, por una razón que no tiene nada que ver con lo
     * que el caso prueba.
     */
    private static final AtomicInteger SECUENCIA = new AtomicInteger();

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;
    @Autowired private SalaRepository salas;
    @Autowired private TipoUsoRepository tiposDeUso;
    @Autowired private ReservaRepository reservas;

    /** Lejos, para que el plazo de la prereserva sea el de 24hs y no el recortado. */
    private static final LocalDate DENTRO_DE_UN_MES = LocalDate.now().plusDays(30);

    // == El formulario público ===============================================

    @Test
    void un_formulario_de_la_landing_entra_sin_ninguna_credencial() throws Exception {
        mandarFormulario("CURSO", unEmail())
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.interes").value("CURSO"))
                // Si esto viene null falta el @Generated: la base puso la fecha y
                // Hibernate no la releyó. Es la sexta vez que aparece la trampa.
                .andExpect(jsonPath("$.fechaCreacion").isNotEmpty())
                .andExpect(jsonPath("$.idUsuario").doesNotExist());
    }

    /**
     * <b>El caso que justifica que el matcher de {@code SeguridadConfig} sea por
     * método y no por ruta.</b> Si algún día alguien "simplifica" ese
     * {@code requestMatchers} a la ruta entera, el buzón —con el teléfono y el mail
     * de todo el que escribió— queda público, y nada más falla.
     */
    @Test
    void el_buzon_no_se_lee_sin_credencial() throws Exception {
        mvc.perform(get("/api/solicitantes")).andExpect(status().isUnauthorized());
    }

    @Test
    void un_usuario_comun_no_lee_el_buzon() throws Exception {
        mvc.perform(get("/api/solicitantes").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    /**
     * El estado no viaja en el cuerpo, y el cuerpo no lo puede imponer. Es el mismo
     * caso que {@code SolicitudReservaTest} escribe para el {@code idUsuario}: un
     * campo de más en un DTO público es una regla de negocio regalada.
     */
    @Test
    void una_ficha_nace_pendiente_diga_lo_que_diga_el_cuerpo() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"ALQUILER_CABINA","estado":"CONVERTIDO"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"));
    }

    /**
     * El teléfono es obligatorio acá y opcional en el alta administrativa. No es
     * una inconsistencia: la contraseña temporal se pasa por WhatsApp, así que una
     * ficha sin teléfono es una ficha que después no se puede convertir.
     */
    @Test
    void una_ficha_sin_telefono_no_entra() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","interes":"CURSO"}
                        """.formatted(unEmail())))
                .andExpect(status().isBadRequest());
    }

    @Test
    void no_se_puede_pedir_cualquier_cosa() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"MIX_MASTERING"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isBadRequest());
    }

    // == El buzón ============================================================

    /**
     * <b>El caso que pinea los {@code LEFT} del repositorio.</b> Una ficha pendiente
     * no tiene ni cuenta ni quién la resolvió; con {@code JOIN FETCH} a secas
     * desaparecerían del listado justo las pendientes, que son las únicas que el
     * buzón abre a mostrar. Es el modo de falla que `V19` encontró en
     * {@code PagoRepository.listar}: la consulta anda y la lista viene vacía.
     */
    @Test
    void las_fichas_pendientes_son_las_que_se_ven() throws Exception {
        mandarUnaFicha("CURSO");

        mvc.perform(get("/api/solicitantes?estado=PENDIENTE")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido.length()").value(Matchers.greaterThan(0)));
    }

    /**
     * DIRECTIVO lee todo y no escribe nada. Si alguien "arregla" el permiso
     * sumándolo, un socio pasa a crear cuentas.
     */
    @Test
    void el_directivo_mira_el_buzon_y_no_lo_resuelve() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        String directivo = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/solicitantes").header("Authorization", directivo))
                .andExpect(status().isOk());

        mvc.perform(post("/api/solicitantes/" + ficha + "/cuenta")
                .header("Authorization", directivo))
                .andExpect(status().isForbidden());
    }

    // == La cuenta, que ya no cierra la ficha ================================

    /**
     * ⚠️ <b>El caso que cambió de sentido con `V27`, y el que sostiene la mejora
     * entera.</b>
     *
     * <p>Antes afirmaba que crear la cuenta dejaba la ficha en {@code CONVERTIDO},
     * o sea resuelta. <b>Eso era el bug</b>: la persona seguía sin su reserva y la
     * ficha ya se había ido de la lista — y del contador del sidebar, que miraba
     * lo mismo. Ahora la cuenta se crea y <b>la ficha sigue abierta</b>, porque la
     * cuenta es una comodidad para el cliente y no la respuesta a lo que pidió
     * (P54, P55).
     */
    @Test
    void darle_cuenta_no_resuelve_la_ficha() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");

        mvc.perform(post("/api/solicitantes/" + ficha + "/cuenta")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(true))
                .andExpect(jsonPath("$.passwordTemporal").isNotEmpty())
                // La cuenta nace obligada a cambiarla, y `V8` le pone vencimiento.
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(true))
                // Un formulario público no otorga roles ni por accidente.
                .andExpect(jsonPath("$.usuario.rol").value("USUARIO"))
                // Lo que cambió: sigue pendiente, y sin firma de resolución.
                .andExpect(jsonPath("$.solicitante.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.solicitante.idUsuario").isNotEmpty())
                .andExpect(jsonPath("$.solicitante.fechaResolucion").doesNotExist());
    }

    /** Y por eso sigue apareciendo en la lista de lo que falta hacer. */
    @Test
    void una_ficha_con_cuenta_sigue_en_el_buzon_abierto() throws Exception {
        long ficha = mandarUnaFicha("ALQUILER_CABINA");
        mvc.perform(post("/api/solicitantes/" + ficha + "/cuenta")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        mvc.perform(get("/api/solicitantes?abiertas=true").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.idSolicitante == %d)]".formatted(ficha))
                        .isNotEmpty());
    }

    /**
     * <b>El otro camino, que no es un borde raro:</b> un alumno que cursa hace un
     * año y pide la cabina desde la landing llega exactamente así. Con un solo
     * camino, esa ficha choca contra {@code usuario_email_unico} y queda trabada
     * para siempre.
     *
     * <p>Y el {@code passwordTemporal} tiene que venir <b>null</b>: la persona ya
     * tiene su contraseña y no hay nada que mandarle por WhatsApp. Una pantalla que
     * muestre un campo vacío ahí está contando mal lo que pasó.
     */
    @Test
    void a_alguien_que_ya_tenia_cuenta_se_la_vincula_en_vez_de_duplicarla() throws Exception {
        Usuario existente = crear(Rol.USUARIO);
        long ficha = idDe(mandarFormulario("ALQUILER_CABINA", existente.getEmail()));

        mvc.perform(post("/api/solicitantes/" + ficha + "/cuenta")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(false))
                .andExpect(jsonPath("$.passwordTemporal").doesNotExist())
                .andExpect(jsonPath("$.usuario.id").value(existente.getId()))
                .andExpect(jsonPath("$.solicitante.idUsuario").value(existente.getId()));
    }

    /**
     * ⚠️ <b>Apretar el botón dos veces ya no es un error, y eso también cambió.</b>
     *
     * <p>Antes la primera vez cerraba la ficha, así que la segunda chocaba contra
     * *"ya fue atendida"*. Ahora la ficha sigue abierta —es lo correcto— y volver a
     * apretar encuentra la cuenta que acaba de crear y la reporta como existente.
     * <b>Lo que importa es que no cree una segunda cuenta</b>, que era todo el
     * daño que ese caso protegía.
     */
    @Test
    void darle_cuenta_dos_veces_no_crea_una_segunda() throws Exception {
        long ficha = mandarUnaFicha("GRABACION_SET");

        mvc.perform(post("/api/solicitantes/" + ficha + "/cuenta")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(true));

        mvc.perform(post("/api/solicitantes/" + ficha + "/cuenta")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(false))
                .andExpect(jsonPath("$.passwordTemporal").doesNotExist());
    }

    // == Los candidatos: lo que hay para elegir al cerrar ====================

    /**
     * <b>Una ficha sin cuenta no tiene candidatos</b>, y contesta vacío en vez de
     * fallar.
     *
     * <p>Las tres consultas entran por {@code id_usuario}, así que esto no es un
     * borde: es el estado en el que llega toda ficha nueva. La pantalla lo
     * distingue de "no se le cargó nada todavía" mirando {@code idUsuario}, y
     * ofrece crear la cuenta.
     */
    @Test
    void una_ficha_sin_cuenta_no_tiene_candidatos() throws Exception {
        mvc.perform(get("/api/solicitantes/" + mandarUnaFicha("EQUIPOS") + "/candidatos")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());
    }

    /**
     * Con cuenta, se ofrece lo de esa persona — con su descripción ya legible, que
     * es lo que evita el único campo del sistema donde habría que tipear un id.
     */
    @Test
    void los_candidatos_son_lo_que_esa_persona_tiene() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        long duenio = darleCuenta(ficha);
        long venta = unaVentaDe(duenio);

        mvc.perform(get("/api/solicitantes/" + ficha + "/candidatos")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == %d)].tipo".formatted(venta)).value("VENTA"))
                .andExpect(jsonPath("$[?(@.id == %d)].descripcion".formatted(venta))
                        .value(Matchers.contains("DDJ-400")));
    }

    /**
     * El par del anterior, que es el que importa: <b>lo de otra persona no
     * aparece</b>.
     *
     * <p>Sin este caso, una consulta a la que se le olvida el filtro por cuenta
     * deja la pantalla funcionando y ofreciendo de más — y el final de eso es una
     * ficha cerrada contra la compra de otro, que se ve resuelta. Es la misma
     * razón por la que el portal está escrito en pares desde el Módulo 4.
     */
    @Test
    void no_se_ofrece_lo_de_otra_persona() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        darleCuenta(ficha);
        long ajena = unaVentaDe(crear(Rol.USUARIO).getId());

        mvc.perform(get("/api/solicitantes/" + ficha + "/candidatos")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == %d)]".formatted(ajena)).isEmpty());
    }

    /**
     * <b>Una venta anulada se ofrece igual, con el reparo escrito.</b>
     *
     * <p>Es una decisión y no un descuido, y por eso tiene caso: esconderla deja a
     * quien atiende buscando algo que está y no aparece, y el final de esa
     * búsqueda es cerrar la ficha contra cualquier otra cosa. Mostrada con el
     * reparo, la decisión la toma quien mira.
     */
    @Test
    void una_venta_anulada_se_ofrece_con_el_reparo_escrito() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        long venta = unaVentaDe(darleCuenta(ficha));

        jdbc.update("""
                UPDATE venta_equipo SET anulada = TRUE, id_usuario_anula = ?,
                       fecha_anulacion = now(), motivo_anulacion = 'Cargada por error'
                WHERE id_venta = ?
                """, crear(Rol.STAFF).getId(), venta);

        mvc.perform(get("/api/solicitantes/" + ficha + "/candidatos")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.id == %d)].reparo".formatted(venta))
                        .value(Matchers.contains("anulada")));
    }

    // == Lo que la web manda sobre el horario (P58, Fase 4) ==================

    /**
     * ⚠️ <b>Los tres campos de horario llegan y se guardan</b>, que es lo que hace
     * posible precargar el alta desde el buzón.
     *
     * <p>Reabre a propósito una decisión escrita de `V20` —<i>"ninguno de esos
     * datos se usa para crear nada"</i>— porque <b>la premisa cambió</b>: desde la
     * Fase 3 el buzón aparta la cabina en un movimiento, y esto es lo único que
     * puede precargarlo. Acotado a tres columnas, no doce.
     */
    @Test
    void el_formulario_puede_decir_cuando_le_viene_bien() throws Exception {
        long ficha = idDe(mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"ALQUILER_CABINA","fechaPreferida":"2026-10-10",
                         "horaPreferida":"18:00","duracionMinutos":120}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fechaPreferida").value("2026-10-10"))
                .andExpect(jsonPath("$.duracionMinutos").value(120)));

        assertThat(jdbc.queryForObject(
                "SELECT duracion_minutos FROM solicitante WHERE id_solicitante = ?",
                Integer.class, ficha)).isEqualTo(120);
    }

    /**
     * ⚠️ <b>Y los tres son opcionales, por separado.</b>
     *
     * <p>Es la mitad no obvia de P58 y la que tiene consecuencia comercial:
     * <b>exigir día y hora pierde a quien sólo quería preguntar cuánto sale</b>, o
     * sea justo a la gente que estos formularios existen para captar — publicar la
     * landing sin ellos era perder clientes reales, que es lo que `V20` dice de sí
     * misma. Sin este caso, un {@code @NotNull} agregado sin pensar convierte un
     * formulario que capta en uno que filtra, y no falla en ningún lado.
     */
    @Test
    void los_tres_campos_de_horario_son_opcionales() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"ALQUILER_CABINA","fechaPreferida":"2026-10-10"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fechaPreferida").value("2026-10-10"))
                .andExpect(jsonPath("$.horaPreferida").doesNotExist())
                .andExpect(jsonPath("$.duracionMinutos").doesNotExist());
    }

    // == Inscribir desde el buzón: las cuatro cosas en un movimiento (Fase 6) ==

    /**
     * ⚠️ El gemelo de {@code apartar_la_cabina_...} para los programas (B2 1.1).
     * Un POST y quedan hechas las cuatro: la cuenta, la relación de alumno, la
     * inscripción <b>preinscripta</b> con su plazo, y la ficha cerrada apuntándole.
     * Y lo que la pantalla necesita para el WhatsApp: la seña sugerida (50%) y
     * hasta cuándo.
     */
    @Test
    void inscribir_crea_la_cuenta_el_alumno_la_preinscripcion_y_cierra_la_ficha() throws Exception {
        long ficha = idDe(mandarFormularioDeCurso(unEmail(), "DJ", "CERO"));

        ResultActions respuesta = inscribir(ficha, """
                {"disciplina":"DJ","precioTotal":180000}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(true))
                .andExpect(jsonPath("$.passwordTemporal").isNotEmpty())
                .andExpect(jsonPath("$.inscripcion.estado").value("PREINSCRIPTA"))
                .andExpect(jsonPath("$.inscripcion.clasesContratadas").value(8))
                .andExpect(jsonPath("$.inscripcion.vencePreinscripcion").isNotEmpty())
                .andExpect(jsonPath("$.senia").value(90000.00))
                .andExpect(jsonPath("$.moneda").value("ARS"))
                .andExpect(jsonPath("$.vence").isNotEmpty())
                .andExpect(jsonPath("$.ficha.estado").value("ATENDIDO"))
                .andExpect(jsonPath("$.ficha.idInscripcion").isNotEmpty())
                .andExpect(jsonPath("$.ficha.idUsuario").isNotEmpty());

        long idUsuario = ((Number) JsonPath.read(
                respuesta.andReturn().getResponse().getContentAsString(), "$.usuario.id")).longValue();
        // La relación de alumno existe, y no hay ningún pago anotado (P72).
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM alumno WHERE id_usuario = ?", Long.class, idUsuario)).isEqualTo(1);
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM pago WHERE id_usuario = ?", Long.class, idUsuario)).isZero();
        // Y el aviso en su bandeja, que dice que falta la seña.
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM notificacion WHERE id_usuario_destino = ? AND titulo LIKE '%falta la seña%'",
                Long.class, idUsuario)).isEqualTo(1);
    }

    /**
     * P64: el nivel se prellena desde la experiencia que la web preguntó — "ya
     * toca" arranca en INTERMEDIO— cuando el pedido no lo dice, y el pedido
     * gana cuando sí lo dice. La tabla vive en un solo lugar.
     */
    @Test
    void el_nivel_sale_de_la_experiencia_de_la_ficha_salvo_que_se_diga_otro() throws Exception {
        long toca = idDe(mandarFormularioDeCurso(unEmail(), "PRODUCCION", "TOCA"));
        inscribir(toca, """
                {"disciplina":"PRODUCCION","precioTotal":440000}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inscripcion.nivel").value("INTERMEDIO"));

        long otra = idDe(mandarFormularioDeCurso(unEmail(), "DJ", "TOCA"));
        inscribir(otra, """
                {"disciplina":"DJ","nivel":"AVANZADO","precioTotal":180000}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.inscripcion.nivel").value("AVANZADO"));
    }

    /** La ficha ya trae `nivelSugerido`, para que el formulario arranque de ahí. */
    @Test
    void la_ficha_dice_con_que_nivel_arrancar() throws Exception {
        mandarFormularioDeCurso(unEmail(), "DJ", "ALGO")
                .andExpect(jsonPath("$.nivelSugerido").value("INICIAL"));
        mandarFormularioDeCurso(unEmail(), "DJ", "TOCA")
                .andExpect(jsonPath("$.nivelSugerido").value("INTERMEDIO"));
        mandarUnaFicha("CURSO");
    }

    /** Quien ya tenía cuenta (y alumno) no recibe otra: se le cuelga la inscripción. */
    @Test
    void a_quien_ya_era_alumno_se_le_cuelga_la_preinscripcion_sin_otra_cuenta() throws Exception {
        Usuario persona = crear(Rol.USUARIO);
        jdbc.update("INSERT INTO alumno (id_usuario) VALUES (?)", persona.getId());
        long ficha = idDe(mandarFormularioDeCurso(persona.getEmail(), "DJ", "CERO"));

        inscribir(ficha, """
                {"disciplina":"DJ","precioTotal":180000}
                """)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.cuentaNueva").value(false))
                .andExpect(jsonPath("$.passwordTemporal").doesNotExist())
                .andExpect(jsonPath("$.usuario.id").value(persona.getId()));

        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM alumno WHERE id_usuario = ?", Long.class, persona.getId())).isEqualTo(1);
    }

    /**
     * ⚠️ El caso que justifica la transacción única: si la inscripción choca (ya
     * tiene una abierta en esa disciplina), <b>no queda una cuenta creada</b> con
     * una contraseña que ya no se puede volver a ver, y la ficha sigue abierta.
     */
    @Test
    void si_la_inscripcion_choca_no_queda_ni_la_cuenta_ni_la_ficha_cerrada() throws Exception {
        // Alguien que ya cursa DJ y pide DJ otra vez desde la web.
        Usuario persona = crear(Rol.USUARIO);
        long idAlumno = jdbc.queryForObject(
                "INSERT INTO alumno (id_usuario) VALUES (?) RETURNING id_alumno", Long.class, persona.getId());
        jdbc.update("""
                INSERT INTO inscripcion (id_alumno, disciplina, clases_contratadas, precio_total)
                VALUES (?, 'DJ', 8, 180000)
                """, idAlumno);
        long ficha = idDe(mandarFormularioDeCurso(persona.getEmail(), "DJ", "CERO"));

        inscribir(ficha, """
                {"disciplina":"DJ","precioTotal":180000}
                """).andExpect(status().isConflict());

        // ⚠️ Este caso corre adentro de la transacción del test, así que el
        // rollback no se puede VER: lo que se afirma es que quedó marcada para
        // deshacerse entera — que es exactamente "cuenta y alta viven en una".
        assertThat(TestTransaction.isFlaggedForRollback()).isTrue();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM inscripcion WHERE id_alumno = ?", Long.class, idAlumno)).isEqualTo(1);
    }

    /**
     * Y con una cuenta NUEVA: la mentoría sin decir las clases se rechaza en el
     * alta (P65), que corre <b>después</b> de crear la cuenta. Si la transacción
     * no fuera una, quedaría una cuenta con una contraseña ya mostrada para
     * alguien que no tiene nada — el escenario exacto de §15 · Fase 3.
     */
    @Test
    void si_el_alta_se_rechaza_despues_de_crear_la_cuenta_la_cuenta_no_queda() throws Exception {
        String email = unEmail();
        long ficha = idDe(mandarFormularioDeCurso(email, "MENTORIA", "TOCA"));

        inscribir(ficha, """
                {"disciplina":"MENTORIA","precioTotal":100000}
                """).andExpect(status().isBadRequest());

        // La cuenta se creó (`darleCuenta` corrió) y la transacción entera quedó
        // marcada para rollback: al terminar, esa cuenta no existe. Ver el caso
        // de arriba sobre por qué no se puede leer el rollback desde acá.
        assertThat(usuarios.findByEmailIgnoreCase(email)).isPresent();
        assertThat(TestTransaction.isFlaggedForRollback()).isTrue();
    }

    /** Sólo fichas de curso: inscribir a quien pidió la cabina es el espejo de apartar una clase. */
    @Test
    void desde_el_buzon_no_se_inscribe_a_quien_pidio_la_cabina() throws Exception {
        long ficha = mandarUnaFicha("ALQUILER_CABINA");

        inscribir(ficha, """
                {"disciplina":"DJ","precioTotal":180000}
                """).andExpect(status().isForbidden());
    }

    // == Qué programa, con qué experiencia y cómo (`V29`, P64 · P67) ==========

    /**
     * El formulario de programas manda las tres como campos, y la ficha las
     * guarda tal cual: <b>la experiencia, no un nivel</b>. Que se lea de vuelta
     * como {@code TOCA} y no como {@code INTERMEDIO} es la mitad de P64 que este
     * caso pinea — la traducción es del alta, no de la landing.
     */
    @Test
    void el_formulario_de_programas_dice_que_programa_con_que_experiencia_y_como() throws Exception {
        long ficha = idDe(mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"CURSO","disciplina":"PRODUCCION","experiencia":"TOCA",
                         "modalidad":"VIRTUAL"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.disciplina").value("PRODUCCION"))
                .andExpect(jsonPath("$.experiencia").value("TOCA"))
                .andExpect(jsonPath("$.modalidad").value("VIRTUAL")));

        assertThat(jdbc.queryForObject(
                "SELECT experiencia FROM solicitante WHERE id_solicitante = ?",
                String.class, ficha)).isEqualTo("TOCA");
    }

    /**
     * ⚠️ <b>Los tres son opcionales y NO se atan a {@code interes}</b> (`V29`,
     * punto 2). Una ficha de curso sin disciplina tiene que entrar: es lo que
     * manda una landing anterior a esta fase, y rechazarla es perder a la
     * persona — el mismo argumento que sostiene los tres campos de horario.
     * Sin este caso, un {@code @NotNull} o un CHECK "CURSO exige disciplina"
     * obligan a desplegar landing y backend a la vez y no fallan en ningún lado.
     */
    @Test
    void una_ficha_de_curso_sin_programa_entra_igual() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"CURSO","detalle":"Convertite en DJ · Presencial en Pilar"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.disciplina").doesNotExist())
                .andExpect(jsonPath("$.experiencia").doesNotExist())
                .andExpect(jsonPath("$.modalidad").doesNotExist());
    }

    /** Un valor que no está en el enum es un 400, como con {@code interes}. */
    @Test
    void una_experiencia_inventada_no_entra() throws Exception {
        mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"CURSO","disciplina":"DJ","experiencia":"INTERMEDIO"}
                        """.formatted(unEmail(), unTelefono())))
                .andExpect(status().isBadRequest());
    }

    /**
     * La base sostiene la lista aunque Java no la mire: el CHECK es el que
     * habla si alguien escribe la tabla por otro lado.
     */
    @Test
    void la_base_no_acepta_una_modalidad_que_no_existe() {
        assertThatThrownBy(() -> jdbc.update("""
                INSERT INTO solicitante (nombre, apellido, email, telefono, interes, modalidad)
                VALUES ('Ana', 'Pérez', ?, ?, 'CURSO', 'HIBRIDA')
                """, unEmail(), unTelefono()))
                .hasMessageContaining("solicitante_modalidad_valida");
    }

    /**
     * P64 ⏳: <i>cero</i> y <i>algo</i> arrancan en INICIAL, <i>ya toca</i> en
     * INTERMEDIO. Es una sugerencia que el alta muestra elegida; lo que este
     * caso pinea es que la tabla viva en un solo lugar.
     */
    @Test
    void la_experiencia_sugiere_el_nivel_con_el_que_arranca_el_alta() {
        assertThat(Experiencia.CERO.nivelSugerido()).isEqualTo(Nivel.INICIAL);
        assertThat(Experiencia.ALGO.nivelSugerido()).isEqualTo(Nivel.INICIAL);
        assertThat(Experiencia.TOCA.nivelSugerido()).isEqualTo(Nivel.INTERMEDIO);
    }

    // == Apartar la cabina: las tres cosas en un movimiento ===================

    /**
     * ⚠️ <b>El caso central de la Fase 3.</b> Un solo POST y quedan hechas las tres
     * cosas que antes eran tres pantallas: la cuenta, la reserva apartada con su
     * deuda, y la ficha cerrada apuntando a esa reserva.
     *
     * <p>Lo que este caso cuida es que sean <b>las tres</b>. Con dos de las tres el
     * sistema no falla en ningún lado —hay una reserva, hay una cuenta— y la ficha
     * se queda abierta para siempre sobre algo que ya se hizo, que es la mitad del
     * problema que abrió esta sección.
     */
    @Test
    void apartar_la_cabina_crea_la_cuenta_la_reserva_y_cierra_la_ficha() throws Exception {
        long ficha = mandarUnaFicha("ALQUILER_CABINA");

        ResultActions respuesta = apartar(ficha, "20:00")
                .andExpect(status().isOk())
                // La cuenta, con la única contraseña del sistema que no se puede
                // volver a ver: si no vuelve acá, se pierde al nacer.
                .andExpect(jsonPath("$.cuentaNueva").value(true))
                .andExpect(jsonPath("$.passwordTemporal").isNotEmpty())
                // La ficha, cerrada y apuntando a lo que produjo (P56).
                .andExpect(jsonPath("$.ficha.estado").value("ATENDIDO"))
                .andExpect(jsonPath("$.ficha.idReserva").isNotEmpty())
                .andExpect(jsonPath("$.ficha.idUsuario").isNotEmpty())
                // Y la deuda, que es lo que hace reclamable la prereserva.
                .andExpect(jsonPath("$.idPagoDeuda").isNotEmpty());

        long idReserva = ((Number) JsonPath.read(
                respuesta.andReturn().getResponse().getContentAsString(), "$.reserva.idReserva"))
                .longValue();

        Reserva reserva = reservas.findById(idReserva).orElseThrow();
        assertThat(reserva.getEstado()).isEqualTo(EstadoReserva.PRECONFIRMADA);
        assertThat(reserva.getVencePreconfirmacion()).isNotNull();

        // La deuda queda anotada y NO como plata que entró: eso es lo que la pone
        // en Deudores y lo que `V24` exige para que el horario esté apartado.
        assertThat(jdbc.queryForObject(
                "SELECT estado_pago FROM pago WHERE id_reserva = ?", String.class, idReserva))
                .isEqualTo("DEBE");
    }

    /**
     * P75 (§17 · H7): la ficha cuya prereserva se venció sin señar <b>sale sola
     * de lo que falta hacer</b>, y el contador del sidebar dice lo mismo que la
     * lista. Antes quedaba abierta para siempre: sin botones (sólo PENDIENTE los
     * tiene) y sin UPDATE posible (`V13` §4).
     */
    @Test
    void una_ficha_cuya_prereserva_se_vencio_sale_sola_del_buzon_abierto() throws Exception {
        long ficha = mandarUnaFicha("ALQUILER_CABINA");
        String cuerpo = apartar(ficha, "20:00").andReturn().getResponse().getContentAsString();
        long idReserva = ((Number) JsonPath.read(cuerpo, "$.reserva.idReserva")).longValue();

        // Apartada y sin señar: abierta, y el contador la cuenta.
        mvc.perform(get("/api/solicitantes?abiertas=true").header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.contenido[?(@.idSolicitante == %d)]".formatted(ficha)).isNotEmpty());
        long abiertasAntes = jdbc.queryForObject(
                "SELECT count(*) FROM solicitante s WHERE s.estado = 'PENDIENTE' OR EXISTS "
                        + "(SELECT 1 FROM reserva r WHERE r.id_reserva = s.id_reserva AND r.estado = 'PRECONFIRMADA')",
                Long.class);

        // Se vence: lo que hace el scheduler, por SQL para no depender del reloj.
        jdbc.update("UPDATE reserva SET estado = 'CANCELADA', vence_preconfirmacion = NULL, "
                + "id_usuario_modifico = id_usuario_creo WHERE id_reserva = ?", idReserva);
        // El UPDATE fue por SQL: la entidad en sesión sigue diciendo PRECONFIRMADA.
        em.clear();

        mvc.perform(get("/api/solicitantes?abiertas=true").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.idSolicitante == %d)]".formatted(ficha)).isEmpty());
        // Sigue existiendo, atendida, con su reserva cancelada a la vista.
        mvc.perform(get("/api/solicitantes?estado=ATENDIDO").header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.contenido[?(@.idSolicitante == %d)].estadoDeLaReserva".formatted(ficha))
                        .value("CANCELADA"));
        // Y el contador bajó con la lista: es la misma definición.
        mvc.perform(get("/api/pendientes").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.buzon").value(abiertasAntes - 1));
    }

    /**
     * <b>Al que pidió se lo anota como participante</b>, aunque un alquiler no sea
     * una clase.
     *
     * <p>Es cierto —está en la sala ocupándola—, le da una sola definición a "mis
     * próximas reservas", y de regalo lo mete en la regla de `V9`: nadie en dos
     * salas a la vez. Mismo criterio que el pedido de sala del portal.
     */
    @Test
    void al_que_pidio_se_lo_anota_en_su_propia_reserva() throws Exception {
        long ficha = mandarUnaFicha("ALQUILER_CABINA");

        String cuerpo = apartar(ficha, "20:00").andReturn().getResponse().getContentAsString();
        long idReserva = ((Number) JsonPath.read(cuerpo, "$.reserva.idReserva")).longValue();
        long idUsuario = ((Number) JsonPath.read(cuerpo, "$.usuario.id")).longValue();

        assertThat(jdbc.queryForObject("""
                SELECT count(*) FROM reserva_participante
                WHERE id_reserva = ? AND id_usuario = ?
                """, Integer.class, idReserva, idUsuario)).isEqualTo(1);
    }

    /**
     * ⚠️ <b>Desde el buzón no se aparta una CLASE</b>, y la lista que lo decide no
     * es nueva: es {@code tipo_uso.solicitable_por_usuario}, la misma que ya define
     * qué se puede pedir desde el portal (P17).
     *
     * <p>El agujero que cierra es concreto: una clase apartada acá nacería sin la
     * inscripción que la descuenta —el participante va sin inscripción— y P39
     * prohíbe exactamente eso desde el otro lado. La base no lo vería, porque la
     * deuda de la prereserva ya satisface a `V10`.
     */
    @Test
    void desde_el_buzon_no_se_aparta_una_clase() throws Exception {
        long ficha = mandarUnaFicha("ALQUILER_CABINA");

        mvc.perform(post("/api/solicitantes/" + ficha + "/reserva")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pedidoDeCabina(idDeTipo("CLASE_DJ"), "20:00")))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("no ")));
    }

    /**
     * Una ficha ya atendida no se aparta de nuevo: sería una segunda reserva y una
     * segunda deuda para un pedido que ya se resolvió.
     */
    @Test
    void una_ficha_ya_atendida_no_se_aparta_de_nuevo() throws Exception {
        long ficha = mandarUnaFicha("ALQUILER_CABINA");
        apartar(ficha, "20:00").andExpect(status().isOk());

        apartar(ficha, "21:00")
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("ya fue atendida")));
    }

    // == Atender: lo que sí cierra la ficha ==================================

    /**
     * <b>La ficha se cierra apuntando a lo que produjo</b>, y eso es a la vez el
     * cierre automático y la trazabilidad: dentro de tres meses se abre la ficha y
     * se ve <i>cuál</i> inscripción salió de ella.
     */
    @Test
    void atender_cierra_la_ficha_apuntando_a_lo_que_produjo() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        long venta = unaVenta();

        atender(ficha, "VENTA", venta)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ATENDIDO"))
                .andExpect(jsonPath("$.idVentaEquipo").value(venta))
                .andExpect(jsonPath("$.resueltaPor").isNotEmpty())
                .andExpect(jsonPath("$.fechaResolucion").isNotEmpty());
    }

    /** Y ahí sí sale de la lista de lo que falta hacer. */
    @Test
    void una_ficha_atendida_sale_del_buzon_abierto() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        atender(ficha, "VENTA", unaVenta()).andExpect(status().isOk());

        mvc.perform(get("/api/solicitantes?abiertas=true").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.idSolicitante == %d)]".formatted(ficha))
                        .isEmpty());
    }

    /** Apuntar a algo que no existe no cierra nada. */
    @Test
    void no_se_cierra_apuntando_a_una_inscripcion_inventada() throws Exception {
        atender(mandarUnaFicha("EQUIPOS"), "VENTA", 999_999L)
                .andExpect(status().isNotFound());
    }

    @Test
    void una_ficha_no_se_atiende_dos_veces() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        atender(ficha, "VENTA", unaVenta()).andExpect(status().isOk());

        // 403 y no 409: `OperacionNoPermitidaException` mapea a FORBIDDEN en todo el
        // sistema, y es la misma que usa el Módulo 4 para "esa solicitud ya fue
        // resuelta".
        atender(ficha, "VENTA", unaVenta())
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("ya fue atendida")));
    }

    /**
     * Lo mismo, pero contra la base y por SQL crudo.
     *
     * <p>El chequeo del servicio existe para el mensaje; <b>quien sostiene la regla
     * es el trigger de `V20` §2</b>, que es la función que `V13` ya tenía. Sin este
     * caso, borrar el {@code if} del servicio deja la suite verde y el esquive
     * abierto: volver la ficha a PENDIENTE y atenderla otra vez.
     */
    @Test
    void la_base_impide_reabrir_una_ficha_resuelta() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        atender(ficha, "VENTA", unaVenta()).andExpect(status().isOk());
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE solicitante SET estado = 'PENDIENTE' WHERE id_solicitante = ?", ficha))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("ya fue resuelta");
    }

    /**
     * ⚠️ <b>La mitad del CHECK de `V27` que no se ve desde adentro de la otra</b>:
     * un destino colgado de una ficha pendiente dice que se creó algo que nadie
     * autorizó. Se ataca por SQL crudo porque la API no tiene ningún camino que lo
     * escriba — y ése es justamente el motivo de atacarla desde abajo: si mañana
     * alguien agrega uno, este caso lo frena.
     */
    @Test
    void la_base_no_deja_colgar_un_destino_de_una_ficha_pendiente() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");
        long venta = unaVenta();
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE solicitante SET id_venta_equipo = ? WHERE id_solicitante = ?",
                venta, ficha))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("solicitante_atendido_produjo_algo");
    }

    // == El descarte =========================================================

    @Test
    void descartar_deja_la_ficha_firmada_y_con_su_motivo() throws Exception {
        long ficha = mandarUnaFicha("CURSO");

        mvc.perform(patch("/api/solicitantes/" + ficha + "/descarte")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"Llamé tres veces y no contesta"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("DESCARTADO"))
                .andExpect(jsonPath("$.respuesta").value("Llamé tres veces y no contesta"))
                .andExpect(jsonPath("$.resueltaPor").isNotEmpty())
                .andExpect(jsonPath("$.fechaResolucion").isNotEmpty())
                // Descartar no crea ninguna cuenta.
                .andExpect(jsonPath("$.idUsuario").doesNotExist());
    }

    /**
     * Sin motivo no hay descarte. Lo pide `V20` y lo ataja antes la validación, que
     * es lo que hace que el error diga qué falta en vez de llegar como violación de
     * constraint.
     */
    @Test
    void descartar_sin_motivo_no_va() throws Exception {
        long ficha = mandarUnaFicha("EQUIPOS");

        mvc.perform(patch("/api/solicitantes/" + ficha + "/descarte")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"   "}
                        """))
                .andExpect(status().isBadRequest());
    }

    /**
     * Una ficha no se borra: se descarta. El que se pierde borrando es el lead real,
     * no el spam — el spam descartado no molesta a nadie porque el buzón filtra por
     * estado.
     */
    @Test
    void una_ficha_no_se_borra() throws Exception {
        long ficha = mandarUnaFicha("CURSO");
        em.flush();

        assertThatThrownBy(() -> jdbc.update("DELETE FROM solicitante WHERE id_solicitante = ?", ficha))
                .isInstanceOf(DataAccessException.class)
                // La enumeración es la mitad útil del mensaje (`V18`): dice cómo se
                // retira ESTA tabla.
                .hasMessageContaining("solicitante -> DESCARTADO");
    }

    // == Helpers =============================================================

    private ResultActions atender(long ficha, String tipo, long id) throws Exception {
        return mvc.perform(patch("/api/solicitantes/" + ficha + "/atencion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"tipo":"%s","id":%d}
                        """.formatted(tipo, id)));
    }

    /**
     * Una venta cualquiera, para tener a qué apuntar.
     *
     * <p>Se inserta por SQL y no por la API a propósito: lo que estos casos prueban
     * es el ciclo de vida de la ficha, no el alta de ventas —que tiene sus 22 casos
     * en {@code VentaEquipoTest}—. Cargarla por la API metería en rojo esta suite
     * cada vez que cambie aquel formulario.
     */
    private long unaVenta() {
        return jdbc.queryForObject("""
                INSERT INTO venta_equipo (id_usuario_vendedor, nombre_comprador_externo,
                                          modelo_equipo, precio, moneda, fecha_venta)
                VALUES (?, 'Comprador de prueba', 'DDJ-400', 100000, 'ARS', CURRENT_DATE)
                RETURNING id_venta
                """, Long.class, crear(Rol.STAFF).getId());
    }

    /** Apartarle la cabina a una ficha, en Sala 1 y por una hora. */
    private ResultActions apartar(long ficha, String desde) throws Exception {
        return mvc.perform(post("/api/solicitantes/" + ficha + "/reserva")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(pedidoDeCabina(idDeTipo("ALQUILER_CABINA"), desde)));
    }

    private String pedidoDeCabina(Long idTipoUso, String desde) {
        return """
                {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s",
                 "duracionMinutos":60,"monto":15000,"moneda":"ARS",
                 "medioPago":"TRANSFERENCIA","mensaje":"Te esperamos"}
                """.formatted(idDeSala("Sala 1"), idTipoUso, DENTRO_DE_UN_MES, desde);
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

    /**
     * Crearle la cuenta y devolver su id. Es el paso previo de todo lo que mira
     * candidatos: sin cuenta no hay de dónde sacarlos.
     */
    private long darleCuenta(long ficha) throws Exception {
        ResultActions respuesta = mvc.perform(post("/api/solicitantes/" + ficha + "/cuenta")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        return ((Number) JsonPath.read(
                respuesta.andReturn().getResponse().getContentAsString(), "$.usuario.id"))
                .longValue();
    }

    /** Una venta cuya compradora <b>tiene cuenta</b>, que es la que se ofrece. */
    private long unaVentaDe(long idComprador) {
        return jdbc.queryForObject("""
                INSERT INTO venta_equipo (id_usuario_vendedor, id_usuario_comprador,
                                          modelo_equipo, precio, moneda, fecha_venta)
                VALUES (?, ?, 'DDJ-400', 100000, 'ARS', CURRENT_DATE)
                RETURNING id_venta
                """, Long.class, crear(Rol.STAFF).getId(), idComprador);
    }

    private ResultActions inscribir(long ficha, String cuerpo) throws Exception {
        return mvc.perform(post("/api/solicitantes/" + ficha + "/inscripcion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo));
    }

    /** Un formulario de programa, con los campos de `V29`. */
    private ResultActions mandarFormularioDeCurso(String email, String disciplina, String experiencia)
            throws Exception {
        return mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"CURSO","disciplina":"%s","experiencia":"%s","modalidad":"PRESENCIAL"}
                        """.formatted(email, unTelefono(), disciplina, experiencia)))
                .andExpect(status().isCreated());
    }

    private long mandarUnaFicha(String interes) throws Exception {
        return idDe(mandarFormulario(interes, unEmail()));
    }

    private ResultActions mandarFormulario(String interes, String email) throws Exception {
        return mvc.perform(post("/api/solicitantes")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Pérez","email":"%s","telefono":"%s",
                         "interes":"%s","detalle":"Programa DJ · presencial",
                         "mensaje":"Quiero arrancar en marzo"}
                        """.formatted(email, unTelefono(), interes)));
    }

    /**
     * Se lee la respuesta como texto y no con un {@code ObjectMapper}, igual que el
     * resto de las suites: en Boot 4.1 Jackson pasó a ser el 3 y cambió de paquete
     * ({@code tools.jackson.databind}), así que un mapper inyectado acá es una
     * dependencia de más sobre algo que ya se movió una vez.
     */
    private long idDe(ResultActions respuesta) throws Exception {
        String cuerpo = respuesta.andReturn().getResponse().getContentAsString();
        String clave = "\"idSolicitante\":";
        int desde = cuerpo.indexOf(clave) + clave.length();
        return Long.parseLong(cuerpo.substring(desde, cuerpo.indexOf(',', desde)).trim());
    }

    private String unEmail() {
        return "solicitante-" + UUID.randomUUID() + "@ejemplo.com";
    }

    private String unTelefono() {
        return "11-4000-" + String.format("%06d", SECUENCIA.incrementAndGet());
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Buzon" + rol.name());
        usuario.setEmail("buzon-" + UUID.randomUUID() + "@lajuanita.local");
        usuario.setTelefono(unTelefono());
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
