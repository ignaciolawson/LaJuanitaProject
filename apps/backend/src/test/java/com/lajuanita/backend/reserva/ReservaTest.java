package com.lajuanita.backend.reserva;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
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

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * Módulo 2 — el calendario.
 *
 * <p><b>Casi todo lo que se prueba acá lo impone la base, no el servicio</b>, y
 * ese es el punto: `mvn test` no corre las suites SQL, así que estos casos son
 * los únicos que verifican que esas reglas <i>lleguen a la pantalla</i> — con el
 * estado HTTP correcto y un mensaje que una persona pueda leer. Una regla que la
 * base cumple y que sale como 500 no sirve.
 *
 * <p>Las fechas son de 2027 a propósito: la base de desarrollo puede tener datos
 * cargados a mano, y el EXCLUDE de solapamiento mira <b>todo</b> lo que hay,
 * incluso lo que este test no creó. Una fecha lejana es la forma barata de que
 * la suite no dependa de qué más haya en la base.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ReservaTest {

    private static final LocalDate LUNES = LocalDate.of(2027, 3, 1);

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

    @Autowired
    private InscripcionRepository inscripciones;

    @Autowired
    private SalaRepository salas;

    @Autowired
    private TipoUsoRepository tiposDeUso;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager em;

    private Long sala1;
    private Long sala2;
    private Long cabina;
    private Long claseDj;
    private Long grabacion;
    private Long alquiler;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        sala2 = idDeSala("Sala 2");
        cabina = idDeSala("Cabina de grabación");
        claseDj = idDeTipo("CLASE_DJ");
        grabacion = idDeTipo("GRABACION_SET");
        alquiler = idDeTipo("ALQUILER_CABINA");
    }

    // == DB-11: el orden de las horas =========================================
    //
    // Es una de las dos reglas que este módulo tenía que traer consigo, y la
    // única que se podía escribir hoy. No está en la base y no puede estarlo:
    // `reserva.periodo` es una columna generada que se computa ANTES que los
    // CHECK, así que unas horas invertidas explotan en `tsrange()` con un error
    // de dato sin nombre de constraint, y el CHECK que diría la frase correcta no
    // se alcanza nunca.

    @Test
    void una_reserva_con_las_horas_al_reves_se_rechaza_con_un_mensaje_util() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "20:00", "19:00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.horarioValido")
                        .value("La hora de fin tiene que ser posterior a la de inicio."));
    }

    /** El caso del medio, que un `>` mal puesto deja pasar. */
    @Test
    void una_reserva_que_empieza_y_termina_a_la_misma_hora_se_rechaza() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "10:00"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.horarioValido").isNotEmpty());
    }

    @Test
    void una_reserva_bien_formada_entra() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reserva.sala").value("Sala 1"))
                .andExpect(jsonPath("$.reserva.tipoUso").value("Clase de DJ"))
                .andExpect(jsonPath("$.reserva.estado").value("CONFIRMADA"))
                // El color lo pone `tipo_uso`, no el front.
                .andExpect(jsonPath("$.reserva.color").isNotEmpty());
    }

    // == La regla más importante del sistema: nunca dos en la misma sala ======

    @Test
    void dos_reservas_solapadas_en_la_misma_sala_son_imposibles() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());

        mvc.perform(alta(sala1, claseDj, LUNES, "11:00", "12:30"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Esa sala ya está ocupada en ese horario."));
    }

    /** Pegadas no es solapadas: 10:00–11:30 y 11:30–13:00 conviven. */
    @Test
    void dos_reservas_pegadas_conviven() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());
        mvc.perform(alta(sala1, claseDj, LUNES, "11:30", "13:00")).andExpect(status().isCreated());
    }

    @Test
    void el_mismo_horario_en_otra_sala_es_valido() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());
        mvc.perform(alta(sala2, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());
    }

    /** Cancelar libera la franja: es la definición canónica de "ocupa la sala". */
    @Test
    void una_reserva_cancelada_libera_su_horario() throws Exception {
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        // En producción esto son dos pedidos y el primero ya commiteó. Acá los
        // dos viven en la transacción del test, y Hibernate ordena los INSERT
        // antes que los UPDATE: sin el flush, la cancelación llegaría a la base
        // DESPUÉS del alta siguiente y el EXCLUDE la rechazaría por una razón
        // que no existe fuera del test.
        em.flush();

        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());
    }

    // == La matriz sala × uso =================================================

    @Test
    void no_se_puede_grabar_un_set_en_la_sala_1() throws Exception {
        mvc.perform(alta(sala1, grabacion, LUNES, "10:00", "11:30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail")
                        .value("Esa sala no se usa para ese tipo de actividad."));
    }

    @Test
    void no_se_puede_alquilar_la_cabina_de_grabacion() throws Exception {
        mvc.perform(alta(cabina, alquiler, LUNES, "10:00", "11:30"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void grabar_un_set_en_la_cabina_de_grabacion_si_se_puede() throws Exception {
        mvc.perform(alta(cabina, grabacion, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated());
    }

    // == Nadie en dos salas a la vez (V9 §1) ==================================

    @Test
    void el_mismo_profesor_no_puede_estar_en_dos_salas_a_la_vez() throws Exception {
        Profesor profe = profesorNuevo();

        mvc.perform(altaCon(sala1, claseDj, LUNES, "10:00", "11:30", profe.getId()))
                .andExpect(status().isCreated());

        mvc.perform(altaCon(sala2, claseDj, LUNES, "10:00", "11:30", profe.getId()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail")
                        .value("Ese profesor ya tiene otra reserva en ese horario."));
    }

    /** Sin profesor asignado no hay agenda que ocupar: un alquiler no choca. */
    @Test
    void dos_reservas_sin_profesor_en_salas_distintas_no_chocan() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());
        mvc.perform(alta(sala2, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());
    }

    /**
     * El alumno va por trigger y no por EXCLUDE, porque vive en
     * {@code reserva_participante} y el horario está en {@code reserva}: una
     * EXCLUDE no puede cruzar dos tablas.
     */
    @Test
    void el_mismo_alumno_no_puede_estar_en_dos_clases_solapadas() throws Exception {
        Alumno alumno = alumnoNuevo();
        long una = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));
        long otra = idDe(mvc.perform(alta(sala2, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        anotar(una, alumno.getUsuario().getId(), null).andExpect(status().isCreated());

        anotar(otra, alumno.getUsuario().getId(), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("ya esta en otra sala en ese horario")));
    }

    // == Participantes y clases contratadas ===================================

    @Test
    void anotar_a_alguien_dos_veces_en_la_misma_clase_se_rechaza() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        anotar(id, alumno.getUsuario().getId(), null).andExpect(status().isCreated());
        anotar(id, alumno.getUsuario().getId(), null)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.idUsuario").isNotEmpty());
    }

    /** La inscripción que se descuenta tiene que ser del que asiste (V1 §8.2). */
    @Test
    void no_se_puede_descontarle_la_clase_a_la_inscripcion_de_otro() throws Exception {
        Alumno unAlumno = alumnoNuevo();
        Alumno otroAlumno = alumnoNuevo();
        Inscripcion deOtro = inscripcionDe(otroAlumno, 8);

        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        anotar(id, unAlumno.getUsuario().getId(), deOtro.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("no pertenece al usuario")));
    }

    /**
     * <b>La cuenta por la que existe el sistema.</b> Anotar a alguien en una clase
     * con cargo a su inscripción le baja las clases restantes — y ese número lo
     * lee el Módulo 1 desde la misma definición.
     */
    @Test
    void anotar_a_un_alumno_le_descuenta_una_clase_de_su_curso() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, 8);
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        anotar(id, alumno.getUsuario().getId(), inscripcion.getId())
                .andExpect(status().isCreated());

        mvc.perform(get("/api/inscripciones/" + inscripcion.getId())
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesConsumidas").value(1))
                .andExpect(jsonPath("$.clasesRestantes").value(7));
    }

    /** `V9` §5: no se consumen más clases que las contratadas. */
    @Test
    void no_se_pueden_dar_mas_clases_que_las_contratadas() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, 1);

        long primera = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));
        anotar(primera, alumno.getUsuario().getId(), inscripcion.getId())
                .andExpect(status().isCreated());

        long segunda = idDe(mvc.perform(alta(sala1, claseDj, LUNES.plusDays(7), "10:00", "11:30"))
                .andExpect(status().isCreated()));

        anotar(segunda, alumno.getUsuario().getId(), inscripcion.getId())
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("ampliar la inscripcion")));
    }

    // == El alta con participantes: paso 1 de la seña ==========================
    //
    // Hasta el 2026-08-17 la reserva se cargaba siempre vacía y la gente se
    // anotaba en un pedido aparte. Eso hacía IMPOSIBLE la seña (P8 / DB-04a): el
    // CONSTRAINT TRIGGER de `V10` corre al COMMIT y, para una clase, el dinero
    // está en la inscripción del que asiste -- así que al cerrar el alta no habría
    // nada que mirar y toda alta de clase se rechazaría.
    //
    // Lo que estos casos NO prueban es que la seña se cumpla: eso lo prueba `V10`
    // cuando exista. Prueban que el camino que la va a satisfacer anda.

    @Test
    void el_alta_puede_traer_sus_participantes_y_les_descuenta_la_clase() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, 8);

        mvc.perform(altaConParticipantes(sala1, claseDj, LUNES, "10:00", "11:30",
                participante(alumno.getUsuario().getId(), inscripcion.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reserva.participantes", org.hamcrest.Matchers.hasSize(1)))
                .andExpect(jsonPath("$.reserva.participantes[0].idUsuario")
                        .value(alumno.getUsuario().getId()))
                .andExpect(jsonPath("$.reserva.participantes[0].idInscripcion")
                        .value(inscripcion.getId()))
                .andExpect(jsonPath("$.reserva.participantes[0].disciplina").value("DJ"));

        // Que la respuesta los dibuje no alcanza: lo que importa es que la clase
        // quedó consumida, porque ese es el mismo número que la seña va a leer.
        mvc.perform(get("/api/inscripciones/" + inscripcion.getId())
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesRestantes").value(7));
    }

    /** Una clase grupal entra completa, no de a un participante por pedido. */
    @Test
    void una_clase_grupal_se_carga_con_sus_dos_alumnos_de_una() throws Exception {
        Alumno uno = alumnoNuevo();
        Alumno otro = alumnoNuevo();

        mvc.perform(altaConParticipantes(sala1, claseDj, LUNES, "10:00", "11:30",
                participante(uno.getUsuario().getId(), null) + ","
                        + participante(otro.getUsuario().getId(), null)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reserva.participantes", org.hamcrest.Matchers.hasSize(2)));
    }

    /**
     * <b>La otra mitad de la decisión, y la que es fácil de romper "arreglando" la
     * primera:</b> la lista es opcional. Una grabación de set no tiene
     * participantes y su plata llega por {@code pago.id_reserva} — volverla
     * obligatoria dejaría incargable la mitad del calendario.
     */
    @Test
    void el_alta_sigue_andando_sin_participantes() throws Exception {
        mvc.perform(alta(cabina, grabacion, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reserva.participantes", org.hamcrest.Matchers.hasSize(0)));
    }

    /**
     * El {@code @Valid} de la lista. Sin él las validaciones de cada participante
     * no corren, y uno sin persona llega hasta el NOT NULL de la base como un 409
     * que no señala ningún campo.
     */
    @Test
    void un_participante_sin_persona_es_un_400_y_no_un_error_de_la_base() throws Exception {
        mvc.perform(altaConParticipantes(sala1, claseDj, LUNES, "10:00", "11:30",
                participante(null, null)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores").isNotEmpty());
    }

    /**
     * La misma persona dos veces en un mismo alta. El pre-chequeo la ve porque
     * {@code reserva_participante} es IDENTITY: cada {@code save} escribe en el
     * momento, así que la fila anterior ya está en la base y no solo en la sesión.
     */
    @Test
    void la_misma_persona_dos_veces_en_el_alta_se_rechaza() throws Exception {
        Alumno alumno = alumnoNuevo();
        long persona = alumno.getUsuario().getId();

        mvc.perform(altaConParticipantes(sala1, claseDj, LUNES, "10:00", "11:30",
                participante(persona, null) + "," + participante(persona, null)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.idUsuario").isNotEmpty());
    }

    // == La seña (V10) ========================================================
    //
    // ⚠️ ESTOS DOS CASOS NO SE PUEDEN ESCRIBIR COMO LOS DEMÁS, y entender por qué
    // es la mitad del trabajo. El chequeo de la seña es un CONSTRAINT TRIGGER
    // DEFERRABLE INITIALLY DEFERRED: **corre al COMMIT**. Esta clase es
    // `@Transactional` y revierte cada caso, así que el trigger no se dispararía
    // NUNCA y la suite entera quedaría en verde con la seña sin verificar.
    //
    // `SET CONSTRAINTS reserva_con_sena IMMEDIATE` ejecuta en el momento lo que
    // está pendiente. El `em.flush()` va antes y no es opcional: sin él el INSERT
    // de la reserva sigue en la sesión de Hibernate, no hay nada encolado en la
    // base, y el SET CONSTRAINTS no encuentra qué chequear -- el caso pasaría sin
    // haber probado nada, que es el falso positivo que estas suites persiguen.

    /**
     * <b>El caso que justifica los pasos 1 y 2.</b> Una clase cargada junto con su
     * alumno tiene plata detrás —la inscripción que la cubre— y pasa el chequeo.
     *
     * <p>Si alguien "simplifica" el alta para que vuelva a crear la reserva vacía y
     * anotar después, este caso se cae: serían dos transacciones, y al cerrar la
     * primera no habría ni inscripción ni pago.
     */
    @Test
    void una_clase_cargada_con_su_alumno_tiene_plata_detras() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, 8);

        mvc.perform(altaConParticipantes(sala1, claseDj, LUNES, "10:00", "11:30",
                participante(alumno.getUsuario().getId(), inscripcion.getId())))
                .andExpect(status().isCreated());

        em.flush();
        jdbc.execute("SET CONSTRAINTS reserva_con_sena IMMEDIATE");
    }

    /** Y el otro lado: una clase sin nadie anotado es un horario sin plata. */
    @Test
    void una_clase_sin_nadie_anotado_no_pasa_el_chequeo_de_la_sena() throws Exception {
        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated());

        em.flush();
        assertThatThrownBy(() -> jdbc.execute("SET CONSTRAINTS reserva_con_sena IMMEDIATE"))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("No se aparta un horario sin pago por adelantado");
    }

    /**
     * <b>El otro camino del dinero, y el que casi deja la mitad del calendario
     * incargable.</b> Una grabación de set no tiene inscripción que la cubra, así
     * que su plata es un {@code pago} apuntando a la reserva — y no puede apuntar a
     * algo que todavía no existe. Los dos entran en la misma transacción.
     */
    @Test
    void una_grabacion_con_su_sena_tiene_plata_detras() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);

        String creada = mvc.perform(
                altaConSena(cabina, grabacion, LUNES, "10:00", "11:30", quienPaga.getId()))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        em.flush();
        jdbc.execute("SET CONSTRAINTS reserva_con_sena IMMEDIATE");

        // Y la seña quedó como SENADO, no como PAGADO: es plata que entró contra un
        // total que todavía no se completó.
        //
        // ⚠️ La consulta pregunta por ESTA reserva y no por "el pago que tenga
        // id_reserva". Decía lo segundo, y funcionó hasta que la base de desarrollo
        // tuvo su primera reserva con seña cargada de verdad: ahí devolvió tres
        // filas y el caso reventó sin que nada del código hubiera cambiado. Es la
        // misma trampa que la cabecera de las suites SQL describe para las fechas
        // -- un caso no puede depender de que la base esté vacía.
        long idReserva = Long.parseLong(entreComas(creada, "\"idReserva\":"));

        assertThat(jdbc.queryForObject(
                "SELECT estado_pago FROM pago WHERE id_reserva = ?", String.class, idReserva))
                .isEqualTo("SENADO");
    }

    /** Saca un número del JSON sin traer un parser para un solo campo. */
    private String entreComas(String cuerpo, String clave) {
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return cuerpo.substring(desde, hasta).trim();
    }

    @Test
    void una_grabacion_sin_sena_no_pasa_el_chequeo() throws Exception {
        mvc.perform(alta(cabina, grabacion, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated());

        em.flush();
        assertThatThrownBy(() -> jdbc.execute("SET CONSTRAINTS reserva_con_sena IMMEDIATE"))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("No se aparta un horario sin pago por adelantado");
    }

    /** La seña se acredita contra la reserva recién creada, no contra una del pedido. */
    @Test
    void la_sena_apunta_a_la_reserva_que_se_acaba_de_crear() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(
                altaConSena(cabina, grabacion, LUNES, "10:00", "11:30", quienPaga.getId()))
                .andExpect(status().isCreated()));

        em.flush();
        assertThat(jdbc.queryForObject(
                "SELECT id_reserva FROM pago WHERE id_usuario = ?", Long.class, quienPaga.getId()))
                .isEqualTo(id);
    }

    /**
     * <b>El alta devuelve el pago de la seña</b>, y de eso depende el comprobante.
     *
     * <p>Es el hallazgo #5 de `docs/mejoras.md` después de `V21`. Antes el respaldo
     * viajaba adentro del alta como una ruta escrita a mano —{@code
     * "comprobantePath":"/comprobantes/9.pdf"}—, o sea un texto sin ningún archivo
     * atrás. Ahora es un archivo de verdad y no cabe en este JSON, así que lo que el
     * alta tiene que devolver es <b>a quién adjuntárselo</b>: sin este id, el
     * momento en que quien carga está mirando la transferencia se pierde, que es
     * justo lo que §9.9 vino a arreglar.
     *
     * <p>El adjuntar propiamente dicho se prueba en {@code ComprobanteTest}.
     */
    @Test
    void el_alta_con_sena_devuelve_el_pago_para_adjuntarle_el_comprobante() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);
        ResultActions respuesta = mvc.perform(
                altaConSena(cabina, grabacion, LUNES, "12:00", "13:30", quienPaga.getId()))
                .andExpect(status().isCreated());

        em.flush();
        long idReserva = idDe(respuesta);
        Long idPagoSena = jdbc.queryForObject(
                "SELECT id_pago FROM pago WHERE id_reserva = ?", Long.class, idReserva);

        // El id que volvió es el del pago de ESTA reserva, no cualquiera: si el
        // servicio devolviera otro, la pantalla adjuntaría el comprobante al pago
        // de otra persona y nadie se enteraría.
        assertThat(respuesta.andReturn().getResponse().getContentAsString())
                .contains("\"idPagoSena\":" + idPagoSena);
    }

    /**
     * Y sigue siendo <b>opcional</b>: una seña en efectivo no tiene comprobante, y
     * exigirlo dejaría media caja sin poder cargarse.
     */
    @Test
    void la_sena_sin_comprobante_entra_igual() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);
        mvc.perform(altaConSena(cabina, grabacion, LUNES, "14:00", "15:30", quienPaga.getId()))
                .andExpect(status().isCreated());
    }

    // == La devolución de la seña (V11) =======================================
    //
    // `V10` cerraba solo el nacimiento de la reserva. `V11` cierra la otra punta,
    // con la política decidida el 2026-08-17: **si se cancela una reserva, la seña
    // se devuelve.** La regla completa queda "toda reserva que OCUPA SU FRANJA
    // tiene plata detrás", con la definición canónica de `V1`.
    //
    // A diferencia de los dos casos de arriba, estos NO necesitan
    // `SET CONSTRAINTS`: los triggers de `V11` son inmediatos a propósito — al
    // anular o al reactivar ya existe todo lo que hay que mirar, y diferirlos
    // convertiría el 409 con el texto del trigger en un 500 al cerrar.

    @Test
    void no_se_puede_devolver_la_sena_de_una_reserva_que_sigue_vigente() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);
        mvc.perform(altaConSena(cabina, grabacion, LUNES, "10:00", "11:30", quienPaga.getId()))
                .andExpect(status().isCreated());
        em.flush();

        anularElPagoDe(quienPaga)
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString(
                        "primero hay que cancelar la reserva")));
    }

    /** El orden que la política habilita: primero se cancela, después se devuelve. */
    @Test
    void cancelada_la_reserva_la_sena_se_devuelve() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(
                altaConSena(cabina, grabacion, LUNES, "10:00", "11:30", quienPaga.getId()))
                .andExpect(status().isCreated()));

        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
        em.flush();

        anularElPagoDe(quienPaga).andExpect(status().isOk());
    }

    /**
     * <b>El esquive: cancelo, me devuelven la seña, y descancelo.</b> Dos pasos
     * legales que juntos rompen la regla — la misma familia de ataques que las
     * pruebas adversariales persiguen en los bloqueos y en el solapamiento.
     */
    @Test
    void una_reserva_cuya_sena_se_devolvio_no_se_puede_reactivar() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(
                altaConSena(cabina, grabacion, LUNES, "10:00", "11:30", quienPaga.getId()))
                .andExpect(status().isCreated()));

        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
        em.flush();
        anularElPagoDe(quienPaga).andExpect(status().isOk());

        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CONFIRMADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(org.hamcrest.Matchers.containsString(
                        "su sena fue devuelta")));
    }

    /**
     * Y que la regla no se vuelva contra sí misma: una reserva cuya seña sigue
     * viva se cancela y se descancela sin problema. Sin este caso, un trigger que
     * rechazara toda reactivación pasaría los tres de arriba igual.
     */
    @Test
    void una_reserva_con_su_sena_intacta_se_puede_descancelar() throws Exception {
        Usuario quienPaga = crear(Rol.USUARIO);
        long id = idDe(mvc.perform(
                altaConSena(cabina, grabacion, LUNES, "10:00", "11:30", quienPaga.getId()))
                .andExpect(status().isCreated()));

        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CONFIRMADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
    }

    /** Cancelar una clase no toca ningún pago: su plata es la inscripción. */
    @Test
    void cancelar_una_clase_no_choca_con_la_regla_de_la_sena() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, 8);
        long id = idDe(mvc.perform(altaConParticipantes(sala1, claseDj, LUNES, "10:00", "11:30",
                participante(alumno.getUsuario().getId(), inscripcion.getId())))
                .andExpect(status().isCreated()));

        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
    }

    private ResultActions anularElPagoDe(Usuario quienPaga) throws Exception {
        Long idPago = jdbc.queryForObject(
                "SELECT id_pago FROM pago WHERE id_usuario = ?", Long.class, quienPaga.getId());

        return mvc.perform(patch("/api/pagos/" + idPago + "/anulacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"motivo":"Se cancelo la reserva y se devolvio la sena"}
                        """));
    }

    // == Auditoría (V7) =======================================================

    @Test
    void mover_una_reserva_deja_firmado_quien_la_movio() throws Exception {
        Usuario staff = crear(Rol.STAFF);
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        mvc.perform(put("/api/reservas/" + id)
                .header("Authorization", credencialPara(staff))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s",
                         "horaInicio":"15:00","horaFin":"16:30"}
                        """.formatted(sala2, claseDj, LUNES)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.sala").value("Sala 2"));

        em.flush();
        em.clear();
        assertThat(jdbc.queryForObject(
                "SELECT id_usuario_modifico FROM reserva WHERE id_reserva = ?", Long.class, id))
                .as("V7 exige que la edición diga quién la hizo")
                .isEqualTo(staff.getId());
    }

    @Test
    void tomar_lista_queda_firmado() throws Exception {
        Usuario staff = crear(Rol.STAFF);
        Alumno alumno = alumnoNuevo();
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));
        long participacion = idParticipacionDe(
                anotar(id, alumno.getUsuario().getId(), null).andExpect(status().isCreated()));

        mvc.perform(patch("/api/reservas/participantes/" + participacion + "?estado=PRESENTE")
                .header("Authorization", credencialPara(staff)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoAsistencia").value("PRESENTE"));

        em.flush();
        em.clear();
        assertThat(jdbc.queryForObject(
                "SELECT id_usuario_modifico FROM reserva_participante WHERE id_participacion = ?",
                Long.class, participacion))
                .isEqualTo(staff.getId());
    }

    /**
     * La red de abajo: el historial de clases no se borra ni desde afuera de la
     * aplicación. La salida es CANCELADA.
     */
    @Test
    void una_reserva_no_se_puede_borrar_ni_por_sql() throws Exception {
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));
        em.flush();

        assertThatThrownBy(() -> jdbc.update("DELETE FROM reserva WHERE id_reserva = ?", id))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("No se borran filas de reserva");
    }

    // == Reprogramación: ninguna clase se pierde ==============================

    @Test
    void cargar_la_recuperacion_marca_la_original_como_reprogramada() throws Exception {
        long original = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"10:00",
                         "horaFin":"11:30","idReservaRecupera":%d,
                         "motivoReprogramacion":"Faltó el profesor"}
                        """.formatted(sala1, claseDj, LUNES.plusDays(7), original)))
                .andExpect(status().isCreated())
                // `$.reserva.` desde `V21`: el alta devuelve `ReservaCreada` —la
                // reserva y el id del pago de la seña—, porque el comprobante ya no
                // viaja adentro del JSON y la pantalla necesita a quién adjuntárselo.
                .andExpect(jsonPath("$.reserva.idReservaRecupera").value(original));

        mvc.perform(get("/api/reservas/" + original).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("REPROGRAMADA"));
    }

    /** Y como la original queda REPROGRAMADA, su franja se libera. */
    @Test
    void la_franja_de_la_clase_reprogramada_queda_libre() throws Exception {
        long original = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"10:00",
                         "horaFin":"11:30","idReservaRecupera":%d}
                        """.formatted(sala1, claseDj, LUNES.plusDays(7), original)))
                .andExpect(status().isCreated());

        mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30")).andExpect(status().isCreated());
    }

    /**
     * <b>El caso que destapó el {@code flush()} de {@code ReservaService}.</b>
     *
     * <p>Correr una clase una hora es la operación más común del módulo, y el
     * horario nuevo pisa el viejo. Hibernate ordena los INSERT antes que los
     * UPDATE, así que sin forzar la escritura del estado REPROGRAMADA <i>antes</i>
     * de insertar la recuperación, el EXCLUDE de solapamiento rechaza la
     * reserva nueva contra la vieja — que es la que se está reemplazando.
     *
     * <p>Las otras pruebas de reprogramación no lo detectan porque mueven la
     * clase a otra semana, donde las franjas no se tocan.
     */
    @Test
    void correr_una_clase_una_hora_no_choca_contra_su_propio_horario_viejo() throws Exception {
        long original = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"11:00",
                         "horaFin":"12:30","idReservaRecupera":%d,
                         "motivoReprogramacion":"Se corrió una hora"}
                        """.formatted(sala1, claseDj, LUNES, original)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.reserva.horaInicio").value("11:00:00"));
    }

    // == La agenda ============================================================

    @Test
    void la_agenda_trae_las_reservas_del_rango_con_sus_participantes() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));
        anotar(id, alumno.getUsuario().getId(), null).andExpect(status().isCreated());

        mvc.perform(get("/api/reservas?desde=" + LUNES + "&hasta=" + LUNES.plusDays(6))
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idReserva == " + id + ")]").exists())
                .andExpect(jsonPath("$[?(@.idReserva == " + id + ")].participantes.length()")
                        .value(1));
    }

    @Test
    void la_agenda_deja_afuera_las_canceladas_salvo_que_se_pidan() throws Exception {
        long id = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));
        mvc.perform(patch("/api/reservas/" + id + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff())).andExpect(status().isOk());

        String rango = "desde=" + LUNES + "&hasta=" + LUNES.plusDays(6);

        mvc.perform(get("/api/reservas?" + rango).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idReserva == " + id + ")]").doesNotExist());

        mvc.perform(get("/api/reservas?" + rango + "&incluirCanceladas=true")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idReserva == " + id + ")]").exists());
    }

    @Test
    void la_agenda_filtra_por_sala() throws Exception {
        long enSala1 = idDe(mvc.perform(alta(sala1, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));
        long enSala2 = idDe(mvc.perform(alta(sala2, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isCreated()));

        mvc.perform(get("/api/reservas?desde=" + LUNES + "&hasta=" + LUNES + "&idSala=" + sala1)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[?(@.idReserva == " + enSala1 + ")]").exists())
                .andExpect(jsonPath("$[?(@.idReserva == " + enSala2 + ")]").doesNotExist());
    }

    /**
     * El rango invertido devolvería una lista vacía, que se lee como "no hay nada
     * esa semana" en vez de como un pedido mal armado.
     */
    @Test
    void un_rango_invertido_se_rechaza() throws Exception {
        mvc.perform(get("/api/reservas?desde=" + LUNES + "&hasta=" + LUNES.minusDays(1))
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    /** Sin techo, una URL trae el historial entero. */
    @Test
    void un_rango_demasiado_largo_se_rechaza() throws Exception {
        mvc.perform(get("/api/reservas?desde=" + LUNES + "&hasta=" + LUNES.plusDays(200))
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest());
    }

    // == El catálogo ==========================================================

    @Test
    void las_salas_vienen_con_lo_que_se_puede_hacer_en_cada_una() throws Exception {
        mvc.perform(get("/api/salas").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(3))
                .andExpect(jsonPath("$[?(@.nombre == 'Sala 1')].usosPermitidos.length()").value(5))
                // La cabina de grabación sirve para grabar y para prácticas de DJ.
                .andExpect(jsonPath("$[?(@.nombre == 'Cabina de grabación')].usosPermitidos.length()")
                        .value(2));
    }

    /** El caso intermedio "se puede, pero ojo" tiene que llegar al front. */
    @Test
    void la_cabina_de_grabacion_avisa_que_no_sirve_para_una_clase_teorica() throws Exception {
        mvc.perform(get("/api/salas").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath(
                        "$[?(@.nombre == 'Cabina de grabación')].usosPermitidos[?(@.advertencia)]")
                        .exists());
    }

    @Test
    void los_tipos_de_uso_traen_su_color_para_el_calendario() throws Exception {
        mvc.perform(get("/api/tipos-uso").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(6))
                .andExpect(jsonPath("$[?(@.codigo == 'CLASE_DJ')].esClase").value(true))
                .andExpect(jsonPath("$[?(@.codigo == 'ALQUILER_CABINA')].esClase").value(false));
    }

    // == Not found ============================================================

    @Test
    void reservar_en_una_sala_que_no_existe_da_404() throws Exception {
        mvc.perform(alta(99999999L, claseDj, LUNES, "10:00", "11:30"))
                .andExpect(status().isNotFound());
    }

    @Test
    void pedir_una_reserva_que_no_existe_da_404() throws Exception {
        mvc.perform(get("/api/reservas/99999999").header("Authorization", comoStaff()))
                .andExpect(status().isNotFound());
    }

    // =========================================================================

    private MockHttpServletRequestBuilder alta(Long idSala, Long idTipoUso,
            LocalDate fecha, String desde, String hasta) {
        return altaCon(idSala, idTipoUso, fecha, desde, hasta, null);
    }

    private MockHttpServletRequestBuilder altaCon(Long idSala, Long idTipoUso,
            LocalDate fecha, String desde, String hasta, Long idProfesor) {
        return post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"idProfesor":%s,"fecha":"%s",
                         "horaInicio":"%s","horaFin":"%s"}
                        """.formatted(idSala, idTipoUso,
                        idProfesor == null ? "null" : idProfesor, fecha, desde, hasta));
    }

    /** Un alta que trae su gente: el paso 1 de la seña. */
    private MockHttpServletRequestBuilder altaConParticipantes(Long idSala, Long idTipoUso,
            LocalDate fecha, String desde, String hasta, String participantes) {
        return post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s",
                         "horaFin":"%s","participantes":[%s]}
                        """.formatted(idSala, idTipoUso, fecha, desde, hasta, participantes));
    }

    /** Un alta que trae su seña: el otro camino del dinero. */
    private MockHttpServletRequestBuilder altaConSena(Long idSala, Long idTipoUso,
            LocalDate fecha, String desde, String hasta, Long idUsuario) {
        return post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s",
                         "sena":{"idUsuario":%d,"monto":45000,"moneda":"ARS","medioPago":"EFECTIVO"}}
                        """.formatted(idSala, idTipoUso, fecha, desde, hasta, idUsuario));
    }

    private String participante(Long idUsuario, Long idInscripcion) {
        return """
                {"idUsuario":%s,"idInscripcion":%s}""".formatted(
                idUsuario == null ? "null" : idUsuario,
                idInscripcion == null ? "null" : idInscripcion);
    }

    private ResultActions anotar(long idReserva, Long idUsuario, Long idInscripcion)
            throws Exception {
        return mvc.perform(post("/api/reservas/" + idReserva + "/participantes")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"idInscripcion":%s}
                        """.formatted(idUsuario, idInscripcion == null ? "null" : idInscripcion)));
    }

    private long idDe(ResultActions resultado) throws Exception {
        return extraer(resultado, "\"idReserva\":");
    }

    private long idParticipacionDe(ResultActions resultado) throws Exception {
        return extraer(resultado, "\"idParticipacion\":");
    }

    private long extraer(ResultActions resultado, String clave) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return Long.parseLong(cuerpo.substring(desde, hasta).trim());
    }

    private Long idDeSala(String nombre) {
        return salas.listar(true).stream()
                .filter(s -> s.getNombreSala().equals(nombre))
                .findFirst().orElseThrow().getId();
    }

    private Long idDeTipo(String codigo) {
        return tiposDeUso.listar(true).stream()
                .filter(t -> t.getCodigo().equals(codigo))
                .findFirst().orElseThrow().getId();
    }

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    private Inscripcion inscripcionDe(Alumno alumno, int clases) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(Disciplina.DJ);
        inscripcion.setClasesContratadas((short) clases);
        inscripcion.setPrecioTotal(new BigDecimal("180000"));
        return inscripciones.save(inscripcion);
    }

    private Profesor profesorNuevo() {
        Profesor profesor = new Profesor();
        profesor.setUsuario(crear(Rol.USUARIO));
        return profesores.save(profesor);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Reserva" + rol.name());
        usuario.setEmail("reserva-" + UUID.randomUUID() + "@lajuanita.local");
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
