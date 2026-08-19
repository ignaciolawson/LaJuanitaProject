package com.lajuanita.backend.portal;

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
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.sala.SalaRepository;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 4 — el portal, y la única pregunta que esta suite hace:
 * <b>¿alguien puede ver algo que no es suyo?</b>
 *
 * <p>Todo lo demás del portal es composición de cosas que ya tienen sus tests. Lo
 * que no existía en el sistema hasta este módulo es el <b>alcance por
 * identidad</b>: hasta acá todo se autorizaba por rol, que es una pregunta sobre
 * quién sos y no sobre qué filas te tocan. Un rol mal puesto se ve enseguida —una
 * pantalla entera que no abre—; un filtro por identidad que falta no se ve nunca,
 * porque la pantalla anda igual y de más.
 *
 * <p>Por eso casi todos los casos son en pares: uno mira lo suyo y el otro mira
 * lo del vecino con el mismo endpoint.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class PortalTest {

    private static final LocalDate CLASE = LocalDate.of(2028, 4, 3);

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;
    @Autowired private AlumnoRepository alumnos;
    @Autowired private InscripcionRepository inscripciones;
    @Autowired private SalaRepository salas;
    @Autowired private TipoUsoRepository tiposDeUso;

    private Long sala1;
    private Long sala2;
    private Long claseDj;
    private Long alquiler;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        sala2 = idDeSala("Sala 2");
        claseDj = idDeTipo("CLASE_DJ");
        alquiler = idDeTipo("ALQUILER_CABINA");
    }

    // == Mis reservas =========================================================

    /**
     * El primero de los dos caminos por los que una reserva es tuya: estar anotado
     * en ella.
     */
    @Test
    void veo_mi_clase_y_no_la_del_companiero() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno);
        Usuario otro = crear(Rol.USUARIO);

        cargarClase(alumno.getUsuario().getId(), inscripcion.getId(), "10:00", "11:30");

        mvc.perform(misReservas(alumno.getUsuario()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tipoUso").value("Clase de DJ"))
                // La asistencia arranca en PENDIENTE: nadie tomó lista todavía.
                .andExpect(jsonPath("$[0].miAsistencia").value("PENDIENTE"));

        mvc.perform(misReservas(otro))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    /**
     * El segundo camino, y el que se olvidaría fácil: un alquiler de cabina no
     * tiene por qué tener a nadie anotado —su plata es un pago apuntando a la
     * reserva— y el que lo pagó tiene que verlo entre lo suyo.
     *
     * <p>Son los mismos dos caminos que `V12` usa para encontrar la plata detrás
     * de una reserva, y eso no es casualidad: es la misma pregunta.
     */
    @Test
    void la_cabina_que_pague_tambien_es_mia() throws Exception {
        Usuario quienAlquila = crear(Rol.USUARIO);

        cargarAlquiler(quienAlquila.getId(), "12:00", "13:00");

        mvc.perform(misReservas(quienAlquila))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tipoUso").value("Alquiler de cabina"))
                // No estoy anotado como participante: la reserva es mía por la plata.
                .andExpect(jsonPath("$[0].miAsistencia").doesNotExist());
    }

    /**
     * Lo que el portal <b>no</b> muestra de una reserva, y por lo que existe un DTO
     * propio en vez de reusar el de administración: los otros participantes y las
     * notas internas.
     */
    @Test
    void mi_clase_no_nombra_a_los_otros_alumnos_ni_trae_las_notas_internas() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno);
        cargarClase(alumno.getUsuario().getId(), inscripcion.getId(), "15:00", "16:30");

        mvc.perform(misReservas(alumno.getUsuario()))
                .andExpect(jsonPath("$[0].participantes").doesNotExist())
                .andExpect(jsonPath("$[0].notas").doesNotExist());
    }

    // == Mi progreso ==========================================================

    /**
     * "Mi progreso" cuenta con la misma consulta que la pantalla de administración
     * ({@code InscripcionService.clasesConsumidas}). Si algún día se separan, el
     * alumno lee que le quedan clases y la base rechaza la próxima.
     */
    @Test
    void mi_progreso_descuenta_la_clase_que_tome() throws Exception {
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno);

        mvc.perform(get("/api/me/cursos").header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].clasesContratadas").value(8))
                .andExpect(jsonPath("$[0].clasesRestantes").value(8))
                // Ni el precio ni las notas: eso es de otra pantalla.
                .andExpect(jsonPath("$[0].precioTotal").doesNotExist())
                .andExpect(jsonPath("$[0].notas").doesNotExist());

        cargarClase(alumno.getUsuario().getId(), inscripcion.getId(), "17:00", "18:30");

        mvc.perform(get("/api/me/cursos").header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(jsonPath("$[0].clasesConsumidas").value(1))
                .andExpect(jsonPath("$[0].clasesRestantes").value(7));
    }

    /** Tener cuenta y ser alumno son cosas distintas (P18): sin cursos, lista vacía. */
    @Test
    void el_que_no_cursa_nada_ve_una_lista_vacia_y_no_un_error() throws Exception {
        mvc.perform(get("/api/me/cursos").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // == Mi estado de cuenta ==================================================

    @Test
    void mi_estado_de_cuenta_es_el_mio_y_no_acepta_que_le_pidan_otro() throws Exception {
        Usuario yo = crear(Rol.USUARIO);

        mvc.perform(get("/api/me/estado-de-cuenta").header("Authorization", credencialPara(yo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idUsuario").value(yo.getId()));

        // No hay forma de pedir el de otro: la ruta no toma id. Si algún día
        // alguien agrega /api/me/estado-de-cuenta/{id}, este caso no lo detecta —
        // lo que lo detecta es que PortalController no reciba identidades.
        mvc.perform(get("/api/me/estado-de-cuenta/" + crear(Rol.USUARIO).getId())
                .header("Authorization", credencialPara(yo)))
                .andExpect(status().isNotFound());
    }

    // == Mis notificaciones ===================================================

    @Test
    void no_se_marca_como_leida_la_notificacion_de_otro() throws Exception {
        Usuario quienPide = crear(Rol.USUARIO);
        long idSolicitud = pedirYRechazar(quienPide);

        String cuerpo = mvc.perform(get("/api/me/notificaciones")
                .header("Authorization", credencialPara(quienPide)))
                .andExpect(jsonPath("$.length()").value(1))
                .andReturn().getResponse().getContentAsString();
        long idNotificacion = Long.parseLong(entre(cuerpo, "\"idNotificacion\":"));

        mvc.perform(patch("/api/me/notificaciones/" + idNotificacion + "/lectura")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isNotFound());

        mvc.perform(patch("/api/me/notificaciones/" + idNotificacion + "/lectura")
                .header("Authorization", credencialPara(quienPide)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leida").value(true));

        // Y el contador es el de cada uno.
        mvc.perform(get("/api/me/notificaciones/sin-leer")
                .header("Authorization", credencialPara(quienPide)))
                .andExpect(content -> org.assertj.core.api.Assertions
                        .assertThat(content.getResponse().getContentAsString()).isEqualTo("0"));

        // (la solicitud rechazada sigue existiendo, no se borró para avisar)
        org.assertj.core.api.Assertions.assertThat(idSolicitud).isPositive();
    }

    // == Mi perfil ============================================================

    /**
     * <b>El email y el rol no son campos de este formulario</b>, y mandarlos no
     * hace nada: el DTO no los tiene. El email es la credencial con la que se
     * entra y no hay forma de verificar uno nuevo —no hay infraestructura de
     * correo—, así que cambiarlo mal deja a la persona afuera de su propia
     * cuenta. Y el rol, obviamente, sería hacerse ADMIN a sí mismo.
     */
    @Test
    void edito_mis_datos_y_no_mi_email_ni_mi_rol() throws Exception {
        Usuario yo = crear(Rol.USUARIO);

        mvc.perform(put("/api/me/perfil")
                .header("Authorization", credencialPara(yo))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Camila","apellido":"Rios","telefono":"11 5555 5555",
                         "email":"otra@ejemplo.com","rol":"ADMIN"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nombre").value("Camila"))
                .andExpect(jsonPath("$.telefono").value("11 5555 5555"))
                .andExpect(jsonPath("$.email").value(yo.getEmail()))
                .andExpect(jsonPath("$.rol").value("USUARIO"));
    }

    @Test
    void no_me_puedo_dejar_sin_nombre() throws Exception {
        mvc.perform(put("/api/me/perfil")
                .header("Authorization", credencialPara(crear(Rol.USUARIO)))
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombre\":\"  \",\"apellido\":\"Rios\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").isNotEmpty());
    }

    // == Pedir una sala =======================================================

    /**
     * El catálogo del portal ofrece solo lo que se puede pedir (P17). La marca sale
     * del catálogo, así que este caso también protege la fila de `V13` que la
     * puso.
     */
    @Test
    void el_catalogo_del_portal_no_ofrece_lo_que_arma_administracion() throws Exception {
        mvc.perform(get("/api/me/catalogo").header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.usos[?(@.codigo=='ALQUILER_CABINA')]").isNotEmpty())
                .andExpect(jsonPath("$.usos[?(@.codigo=='GRABACION_SET')]").isNotEmpty())
                .andExpect(jsonPath("$.usos[?(@.codigo=='CLASE_DJ')]").isEmpty())
                // M&M tampoco: no es clase, y aun así no se pide por acá.
                .andExpect(jsonPath("$.usos[?(@.codigo=='MIX_MASTERING')]").isEmpty())
                .andExpect(jsonPath("$.salas.length()").value(3));
    }

    /**
     * <b>La disponibilidad no es la agenda.</b> Dice qué franjas están tomadas y
     * nada más: quién tiene clase con quién es información de los otros alumnos.
     */
    @Test
    void la_disponibilidad_no_dice_de_quien_es_la_franja() throws Exception {
        Alumno alumno = alumnoNuevo();
        cargarClase(alumno.getUsuario().getId(), inscripcionDe(alumno).getId(), "10:00", "11:30");

        mvc.perform(get("/api/me/disponibilidad")
                .param("idSala", String.valueOf(sala1))
                .param("desde", CLASE.toString())
                .param("hasta", CLASE.toString())
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].motivo").value("RESERVADA"))
                .andExpect(jsonPath("$[0].horaInicio").value("10:00:00"))
                .andExpect(jsonPath("$[0].profesor").doesNotExist())
                .andExpect(jsonPath("$[0].participantes").doesNotExist())
                .andExpect(jsonPath("$[0].tipoUso").doesNotExist());
    }

    // =========================================================================

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder misReservas(
            Usuario quien) {
        return get("/api/me/reservas")
                .param("desde", CLASE.toString())
                .param("hasta", CLASE.toString())
                .header("Authorization", credencialPara(quien));
    }

    /** Una clase con su alumno adentro: es la única forma de que `V10` la deje entrar. */
    private void cargarClase(Long idUsuario, Long idInscripcion, String desde, String hasta)
            throws Exception {
        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s",
                         "participantes":[{"idUsuario":%d,"idInscripcion":%d}]}
                        """.formatted(sala1, claseDj, CLASE, desde, hasta, idUsuario, idInscripcion)))
                .andExpect(status().isCreated());
    }

    /** Un alquiler con su seña: el otro camino del dinero, sin nadie anotado. */
    private void cargarAlquiler(Long idUsuario, String desde, String hasta) throws Exception {
        mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"%s","horaFin":"%s",
                         "sena":{"idUsuario":%d,"monto":15000,"moneda":"ARS","medioPago":"EFECTIVO"}}
                        """.formatted(sala2, alquiler, CLASE, desde, hasta, idUsuario)))
                .andExpect(status().isCreated());
    }

    /** Pide una sala y se la rechazan, que es lo que deja una notificación. */
    private long pedirYRechazar(Usuario quienPide) throws Exception {
        String cuerpo = mvc.perform(post("/api/me/solicitudes")
                .header("Authorization", credencialPara(quienPide))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"fecha":"%s","horaInicio":"22:00","horaFin":"23:00"}
                        """.formatted(sala1, alquiler, LocalDate.now().plusDays(20))))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        long id = Long.parseLong(entre(cuerpo, "\"idSolicitud\":"));

        mvc.perform(patch("/api/solicitudes-reserva/" + id + "/rechazo")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"respuesta\":\"esa noche no abrimos\"}"))
                .andExpect(status().isOk());

        return id;
    }

    private String entre(String cuerpo, String clave) {
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return cuerpo.substring(desde, hasta).trim();
    }

    private Alumno alumnoNuevo() {
        Usuario persona = crear(Rol.USUARIO);
        Alumno alumno = new Alumno();
        alumno.setUsuario(persona);
        return alumnos.save(alumno);
    }

    private Inscripcion inscripcionDe(Alumno alumno) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setDisciplina(Disciplina.DJ);
        inscripcion.setClasesContratadas((short) 8);
        inscripcion.setPrecioTotal(new BigDecimal("400000"));
        return inscripciones.save(inscripcion);
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
        usuario.setApellido("Portal" + rol.name());
        usuario.setEmail("portal-" + UUID.randomUUID() + "@lajuanita.local");
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
