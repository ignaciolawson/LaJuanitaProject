package com.lajuanita.backend.solicitud;

import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDate;
import java.util.UUID;

import org.hamcrest.Matchers;
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
 * "No puedo ese día": el circuito de mover una clase, de punta a punta.
 *
 * <p>Lo que esta suite persigue, y que es distinto de lo que guarda la tabla:
 *
 * <ul>
 *   <li><b>Que aprobar MUEVA la clase, en el lugar.</b> Es la decisión de la que
 *       cuelga todo: la misma fila cambia de día, así que el pago que la respalda
 *       la sigue respaldando. Hay un caso que fuerza el chequeo diferido de `V10`
 *       después de mover un alquiler — si alguien cambiara esto por "crear una
 *       reserva nueva y marcar la vieja REPROGRAMADA", ese caso se cae, que es
 *       exactamente lo que tiene que pasar.
 *   <li><b>Que nadie mueva la clase de otro.</b> Los tres caminos —anotado,
 *       pagador, profesor de esa clase (P9)— tienen su caso, y la ajena contesta
 *       "no existe" y no "no podés".
 *   <li><b>Que un pedido resuelto no se reabra.</b> El trigger que lo sostiene lo
 *       puso `V13` sobre esta tabla <b>antes de que existiera nadie que escribiera
 *       en ella</b>; este es su primer escritor y su primera prueba.
 * </ul>
 *
 * <p>Las fechas son de 2030 y a las 22, como el resto de las suites de reserva:
 * lejos de lo que haya cargado a mano en la base de desarrollo, y fuera del
 * horario del estudio.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SolicitudReprogramacionTest {

    private static final LocalDate EL_DIA = LocalDate.of(2030, 4, 8);
    private static final LocalDate OTRO_DIA = LocalDate.of(2030, 4, 15);

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private AlumnoRepository alumnos;
    @Autowired private ProfesorRepository profesores;
    @Autowired private InscripcionRepository inscripciones;
    @Autowired private SalaRepository salas;
    @Autowired private TipoUsoRepository tiposDeUso;
    @Autowired private JdbcTemplate jdbc;
    @Autowired private EntityManager em;

    private Long sala1;
    private Long claseDj;
    private Long alquiler;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        claseDj = idDeTipo("CLASE_DJ");
        alquiler = idDeTipo("ALQUILER_CABINA");
    }

    // == Pedir ================================================================

    @Test
    void el_alumno_pide_mover_su_clase_y_queda_pendiente() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);

        mvc.perform(pedir(alumno.getUsuario(), clase, "Me cambiaron el turno del trabajo", OTRO_DIA))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.estado").value("PENDIENTE"))
                .andExpect(jsonPath("$.idReserva").value(clase))
                .andExpect(jsonPath("$.fechaAlternativaSolicitada").value(OTRO_DIA.toString()))
                // Si viene null falta el @Generated: la base puso la fecha y
                // Hibernate no la releyó.
                .andExpect(jsonPath("$.fechaSolicitud").isNotEmpty());
    }

    /** El día alternativo es opcional: se puede pedir sin proponer ninguno. */
    @Test
    void se_puede_pedir_sin_proponer_ningun_dia() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);

        mvc.perform(pedir(alumno.getUsuario(), clase, "Estoy con gripe", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fechaAlternativaSolicitada").doesNotExist());
    }

    /**
     * <b>P9, contestada el 2026-08-29.</b> El profesor pide con el mismo endpoint
     * que el alumno — y es el que más veces lo necesita. No es participante de su
     * propia clase ni la pagó: entra por el tercer camino.
     */
    @Test
    void el_profesor_de_la_clase_tambien_puede_pedir_moverla() throws Exception {
        Profesor profesor = profesorNuevo();
        long clase = unaClaseCon(profesor);

        mvc.perform(pedir(profesor.getUsuario(), clase, "Tengo una fecha ese día", null))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").value(profesor.getUsuario().getId()));
    }

    /**
     * La ajena contesta "no existe" y no "no podés": la segunda respuesta confirma
     * que la fila existe, que es lo que alguien probando ids quiere averiguar.
     */
    @Test
    void nadie_pide_mover_la_clase_de_otro() throws Exception {
        long clase = unaClaseDe(alumnoNuevo());

        mvc.perform(pedir(crear(Rol.USUARIO), clase, "quiero moverla", null))
                .andExpect(status().isNotFound());
    }

    /**
     * El alta no tiene campo para decir quién pide: sale del token. Si alguien le
     * agrega un {@code idUsuario} "por comodidad", se puede mover la clase de un
     * tercero.
     */
    @Test
    void el_pedido_queda_a_nombre_de_quien_lo_hace() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);

        mvc.perform(post("/api/me/reprogramaciones")
                .header("Authorization", credencialPara(alumno.getUsuario()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idReserva":%d,"motivo":"no puedo","idUsuario":%d}
                        """.formatted(clase, crear(Rol.USUARIO).getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idUsuario").value(alumno.getUsuario().getId()));
    }

    @Test
    void no_se_pide_mover_una_clase_que_ya_paso() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno, LocalDate.of(2020, 3, 2));

        mvc.perform(pedir(alumno.getUsuario(), clase, "no pude", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("ya pasó")));
    }

    @Test
    void no_se_pide_mover_una_clase_cancelada() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        cancelar(clase);

        mvc.perform(pedir(alumno.getUsuario(), clase, "igual la quiero mover", null))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("no hay nada que mover")));
    }

    @Test
    void no_se_piden_dos_cambios_de_la_misma_clase_a_la_vez() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);

        mvc.perform(pedir(alumno.getUsuario(), clase, "no puedo", null))
                .andExpect(status().isCreated());

        mvc.perform(pedir(alumno.getUsuario(), clase, "en serio no puedo", null))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("esperando respuesta")));
    }

    // == Resolver =============================================================

    /**
     * <b>El caso central: aprobar mueve la clase, y es la MISMA clase.</b> Mismo
     * id, otro día. Si esto se cambiara por "crear una reserva nueva y marcar la
     * vieja REPROGRAMADA", el id dejaría de coincidir y el pago quedaría atrás.
     */
    @Test
    void aprobar_mueve_la_clase_en_el_lugar() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", OTRO_DIA));

        mvc.perform(aprobar(pedido, sala1, OTRO_DIA, "22:00", "23:30"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("APROBADA"))
                .andExpect(jsonPath("$.idReserva").value(clase))
                .andExpect(jsonPath("$.fecha").value(OTRO_DIA.toString()))
                .andExpect(jsonPath("$.resueltaPor").isNotEmpty())
                .andExpect(jsonPath("$.fechaResolucion").isNotEmpty());

        mvc.perform(get("/api/reservas/" + clase).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fecha").value(OTRO_DIA.toString()))
                // Y sigue en pie: mover no es cancelar ni reprogramar en el sentido
                // de `V1` —esa palabra es la de la clase que no se dictó y se
                // recupera con otra fila (P2)—.
                .andExpect(jsonPath("$.estado").value("CONFIRMADA"));
    }

    /**
     * <b>Y la consecuencia que justifica moverla en el lugar: la plata ni se
     * entera.</b> Un alquiler entra con su seña; después de moverlo, el chequeo
     * diferido de `V10` sigue encontrando el pago detrás de la reserva.
     *
     * <p>El {@code SET CONSTRAINTS} es obligatorio y el {@code flush} antes también:
     * el chequeo corre al COMMIT y esta clase es {@code @Transactional}, así que sin
     * forzarlo el caso pasaría sin haber probado nada. Es la trampa que
     * {@code ReservaTest} documenta.
     *
     * <p>Si el circuito pasara a crear una reserva nueva, la vieja quedaría
     * REPROGRAMADA —y `V11` le devuelve la seña— mientras la nueva nace sin nada
     * detrás: <b>este caso falla</b>, que es para lo que está.
     */
    @Test
    void mover_un_alquiler_no_le_saca_la_sena() throws Exception {
        Usuario quienAlquila = crear(Rol.USUARIO);
        long reserva = idDeLaReserva(mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:00",
                         "participantes":[{"idUsuario":%d}],
                         "sena":{"idUsuario":%d,"monto":45000,"moneda":"ARS","medioPago":"EFECTIVO"}}
                        """.formatted(sala1, alquiler, EL_DIA,
                        quienAlquila.getId(), quienAlquila.getId())))
                .andExpect(status().isCreated()));

        long pedido = idDelPedido(pedir(quienAlquila, reserva, "me surgió algo", OTRO_DIA));
        mvc.perform(aprobar(pedido, sala1, OTRO_DIA, "22:00", "23:00"))
                .andExpect(status().isOk());

        em.flush();
        jdbc.execute("SET CONSTRAINTS reserva_con_sena IMMEDIATE");
    }

    /**
     * Aprobar sin mover nada dejaría el pedido resuelto, sin aviso —porque no hubo
     * movimiento— y a quien pidió esperando un cambio que nunca pasó.
     */
    @Test
    void no_se_aprueba_dejando_el_mismo_horario() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", null));

        mvc.perform(aprobar(pedido, sala1, EL_DIA, "22:00", "23:30"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("horario distinto")));
    }

    /**
     * Aprobar no manda aviso propio: <b>mover la clase ya avisa</b>, y dice de
     * dónde a dónde. Dos avisos por el mismo hecho entrenan a ignorarlos.
     */
    @Test
    void al_aprobar_llega_un_solo_aviso_y_es_el_de_que_se_movio() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", null));

        mvc.perform(aprobar(pedido, sala1, OTRO_DIA, "22:00", "23:30")).andExpect(status().isOk());

        mvc.perform(get("/api/me/notificaciones")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tipo").value("RESERVA_MOVIDA"));
    }

    @Test
    void rechazar_avisa_con_el_motivo_adentro() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", null));

        mvc.perform(patch("/api/reprogramaciones/" + pedido + "/rechazo")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"Esa semana no queda ninguna sala libre\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("RECHAZADA"));

        mvc.perform(get("/api/me/notificaciones")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].tipo").value("REPROGRAMACION_RECHAZADA"))
                .andExpect(jsonPath("$[0].contenido").value(
                        Matchers.containsString("no queda ninguna sala libre")));
    }

    @Test
    void rechazar_sin_motivo_no_va() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", null));

        mvc.perform(patch("/api/reprogramaciones/" + pedido + "/rechazo")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"   \"}"))
                .andExpect(status().isBadRequest());
    }

    @Test
    void un_pedido_resuelto_no_se_resuelve_dos_veces() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", null));

        mvc.perform(aprobar(pedido, sala1, OTRO_DIA, "22:00", "23:30")).andExpect(status().isOk());

        mvc.perform(aprobar(pedido, sala1, OTRO_DIA.plusDays(7), "22:00", "23:30"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.detail").value(Matchers.containsString("ya fue resuelto")));
    }

    /**
     * Lo mismo, contra la base y por SQL crudo.
     *
     * <p><b>El trigger lo puso `V13` sobre esta tabla sin que existiera nadie que
     * escribiera en ella</b>, así que hasta hoy no lo probaba nada. El esquive que
     * cierra: aprobar —lo que mueve la clase—, volver el pedido a PENDIENTE y
     * aprobarlo de nuevo, moviendo la clase una segunda vez sin que quede rastro
     * de la primera decisión.
     */
    @Test
    void la_base_impide_reabrir_un_pedido_resuelto() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", null));
        mvc.perform(aprobar(pedido, sala1, OTRO_DIA, "22:00", "23:30")).andExpect(status().isOk());
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE solicitud_reprogramacion SET estado = 'PENDIENTE' WHERE id_solicitud = ?", pedido))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("ya fue resuelta");
    }

    @Test
    void el_directivo_lee_la_bandeja_y_no_la_resuelve() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        long pedido = idDelPedido(pedir(alumno.getUsuario(), clase, "no puedo", null));
        String directivo = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/reprogramaciones").header("Authorization", directivo))
                .andExpect(status().isOk());

        mvc.perform(patch("/api/reprogramaciones/" + pedido + "/aprobacion")
                .header("Authorization", directivo)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:30"}
                        """.formatted(sala1, OTRO_DIA)))
                .andExpect(status().isForbidden());
    }

    @Test
    void cada_uno_ve_solo_lo_que_pidio() throws Exception {
        Alumno alumno = alumnoNuevo();
        long clase = unaClaseDe(alumno);
        mvc.perform(pedir(alumno.getUsuario(), clase, "no puedo", null)).andExpect(status().isCreated());

        mvc.perform(get("/api/me/reprogramaciones")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));

        mvc.perform(get("/api/me/reprogramaciones")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // == Helpers =============================================================

    private MockHttpServletRequestBuilder pedir(Usuario quienPide, long idReserva, String motivo,
            LocalDate fechaAlternativa) {

        return post("/api/me/reprogramaciones")
                .header("Authorization", credencialPara(quienPide))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idReserva":%d,"motivo":"%s","fechaAlternativa":%s}
                        """.formatted(idReserva, motivo,
                        fechaAlternativa == null ? "null" : "\"" + fechaAlternativa + "\""));
    }

    private MockHttpServletRequestBuilder aprobar(long idPedido, Long idSala, LocalDate fecha,
            String desde, String hasta) {

        return patch("/api/reprogramaciones/" + idPedido + "/aprobacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s"}
                        """.formatted(idSala, fecha, desde, hasta));
    }

    /** Una clase con su alumno anotado: la inscripción es la plata que la respalda. */
    private long unaClaseDe(Alumno alumno) throws Exception {
        return unaClaseDe(alumno, EL_DIA);
    }

    private long unaClaseDe(Alumno alumno, LocalDate fecha) throws Exception {
        Inscripcion inscripcion = inscripcionDe(alumno);
        return idDeLaReserva(mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:30",
                         "participantes":[{"idUsuario":%d,"idInscripcion":%d}]}
                        """.formatted(sala1, claseDj, fecha,
                        alumno.getUsuario().getId(), inscripcion.getId())))
                .andExpect(status().isCreated()));
    }

    /** Una clase con profesor y con alguien anotado, para el camino de P9. */
    private long unaClaseCon(Profesor profesor) throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno);
        return idDeLaReserva(mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"idProfesor":%d,"fecha":"%s",
                         "horaInicio":"22:00","horaFin":"23:30",
                         "participantes":[{"idUsuario":%d,"idInscripcion":%d}]}
                        """.formatted(sala1, claseDj, profesor.getId(), EL_DIA,
                        alumno.getUsuario().getId(), inscripcion.getId())))
                .andExpect(status().isCreated()));
    }

    private void cancelar(long idReserva) throws Exception {
        mvc.perform(patch("/api/reservas/" + idReserva + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());
    }

    private long idDeLaReserva(ResultActions resultado) throws Exception {
        return extraer(resultado, "\"idReserva\":");
    }

    private long idDelPedido(MockHttpServletRequestBuilder pedido) throws Exception {
        return extraer(mvc.perform(pedido).andExpect(status().isCreated()), "\"idSolicitud\":");
    }

    private long extraer(ResultActions resultado, String clave) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf(clave) + clave.length();
        return Long.parseLong(cuerpo.substring(desde, cuerpo.indexOf(',', desde)).trim());
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

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    private Inscripcion inscripcionDe(Alumno alumno) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(Disciplina.DJ);
        inscripcion.setClasesContratadas((short) 8);
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
        usuario.setApellido("Reprogramacion" + rol.name());
        usuario.setEmail("reprogramacion-" + UUID.randomUUID() + "@lajuanita.local");
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
