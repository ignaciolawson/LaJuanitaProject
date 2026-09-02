package com.lajuanita.backend.docencia;

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
 * Módulo 5 — el portal del profesor.
 *
 * <p><b>La pregunta de esta suite es una sola, igual que en {@code PortalTest}:
 * ¿puede un profesor ver o tocar algo que no es suyo?</b> Y acá pesa más que en
 * el portal del alumno por dos razones: la regla vive en Java —no hay trigger que
 * la sostenga, y está decidido así en la cabecera de `V14`— y lo que protege son
 * <b>notas privadas sobre personas</b>. Un filtro que falta no rompe nada: la
 * pantalla anda igual y muestra de más.
 *
 * <p>Por eso casi todos los casos son en pares: un profesor mira lo suyo, otro
 * mira lo del primero por el mismo endpoint.
 *
 * <p>Fechas de 2028, como el resto: la base de desarrollo tiene carga a mano y el
 * EXCLUDE de solapamiento mira todo lo que hay, no solo lo que este test creó.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class DocenciaTest {

    private static final LocalDate CLASE = LocalDate.of(2028, 6, 5);

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
    private Long sala2;
    private Long claseDj;

    @BeforeEach
    void catalogo() {
        sala1 = idDeSala("Sala 1");
        sala2 = idDeSala("Sala 2");
        claseDj = idDeTipo("CLASE_DJ");
    }

    // == Mis alumnos: los dos caminos ========================================

    /** Camino 1: la asignación. Vale desde el día uno, sin ninguna clase dada. */
    @Test
    void veo_al_alumno_que_tiene_una_inscripcion_conmigo() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        inscripcionDe(alumno, yo);

        mvc.perform(get("/api/me/profesor/alumnos").header("Authorization", credencialPara(yo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].idAlumno").value(alumno.getId()))
                // Nadie le puso semáforo todavía, y eso NO es "va bien".
                .andExpect(jsonPath("$[0].estadoSeguimiento").doesNotExist())
                .andExpect(jsonPath("$[0].clasesRestantes").value(8));
    }

    /**
     * <b>Camino 2: el suplente.</b> Quien toma una clase que no es suya necesita
     * poder dejar la nota de esa sesión —es el momento en que más falta hace— y
     * por la asignación no aparecería nunca.
     */
    @Test
    void veo_al_alumno_de_una_clase_que_di_aunque_no_sea_mi_inscripcion() throws Exception {
        Profesor titular = profesorNuevo();
        Profesor suplente = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, titular);

        cargarClase(suplente, alumno, inscripcion, sala1, "10:00", "11:30");

        mvc.perform(get("/api/me/profesor/alumnos").header("Authorization", credencialPara(suplente)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].idAlumno").value(alumno.getId()));
    }

    @Test
    void no_veo_al_alumno_de_otro_profesor() throws Exception {
        Profesor otro = profesorNuevo();
        inscripcionDe(alumnoNuevo(), otro);

        mvc.perform(get("/api/me/profesor/alumnos")
                .header("Authorization", credencialPara(profesorNuevo())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    /** Ser profesor es una relación, no un rol: un ADMIN sin la fila no entra. */
    @Test
    void el_que_no_da_clases_no_entra_aunque_sea_admin() throws Exception {
        mvc.perform(get("/api/me/profesor/alumnos")
                .header("Authorization", credencialPara(crear(Rol.ADMIN))))
                .andExpect(status().isForbidden());
    }

    // == Notas privadas ======================================================

    /**
     * <b>La regla dura del módulo.</b> Dos profesores, el mismo alumno, una nota
     * cada uno: cada uno ve la suya y solo la suya. Es literalmente la razón por
     * la que hoy Ghezz lleva un Excel paralelo — nadie escribe lo que piensa en un
     * campo que otro puede abrir.
     */
    @Test
    void las_notas_de_un_profesor_no_las_ve_el_otro() throws Exception {
        Profesor uno = profesorNuevo();
        Profesor dos = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        inscripcionDe(alumno, uno);
        inscripcionDe(alumno, dos, Disciplina.PRODUCCION);

        anotar(uno, alumno, "le cuesta la mezcla");
        anotar(dos, alumno, "viene muy bien con Ableton");

        mvc.perform(get("/api/me/profesor/alumnos/" + alumno.getId() + "/notas")
                .header("Authorization", credencialPara(uno)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].contenido").value("le cuesta la mezcla"));

        mvc.perform(get("/api/me/profesor/alumnos/" + alumno.getId() + "/notas")
                .header("Authorization", credencialPara(dos)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].contenido").value("viene muy bien con Ableton"));
    }

    @Test
    void no_puedo_anotar_sobre_el_alumno_de_otro() throws Exception {
        Alumno ajeno = alumnoNuevo();
        inscripcionDe(ajeno, profesorNuevo());

        mvc.perform(post("/api/me/profesor/notas")
                .header("Authorization", credencialPara(profesorNuevo()))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idAlumno":%d,"contenido":"algo"}
                        """.formatted(ajeno.getId())))
                // "No existe" y no "no podés": la segunda respuesta confirma que
                // ese alumno existe y que es de otro profesor.
                .andExpect(status().isNotFound());
    }

    /**
     * <b>`V1` §8.3 — y este caso es el que encontró que la regla ya existía.</b>
     *
     * <p>Se escribió esperando el mensaje de un trigger nuevo que este módulo iba
     * a agregar, y recibió el del baseline: la regla estaba desde el primer día.
     * El trigger duplicado se sacó de `V14` (ver su cabecera), y el caso quedó —
     * probando la regla vieja, que era lo único que hacía falta.
     *
     * <p>Una nota sobre Juan colgada de la clase de Ana no rompe ninguna consulta
     * y arruina justo lo que este módulo viene a arreglar: es la nota de una
     * persona apareciendo en el historial de otra.
     */
    @Test
    void una_nota_no_se_cuelga_de_la_clase_de_otro_alumno() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno juan = alumnoNuevo();
        Alumno ana = alumnoNuevo();
        Inscripcion deJuan = inscripcionDe(juan, yo);
        Inscripcion deAna = inscripcionDe(ana, yo);

        // Horarios distintos: `V9` no deja al mismo profesor en dos salas a la
        // vez, y acá las dos clases son suyas.
        cargarClase(yo, juan, deJuan, sala1, "12:00", "13:30");
        long participacionDeAna = idDeParticipacion(
                cargarClase(yo, ana, deAna, sala2, "14:00", "15:30"));

        mvc.perform(post("/api/me/profesor/notas")
                .header("Authorization", credencialPara(yo))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idAlumno":%d,"idParticipacion":%d,"contenido":"lo del martes"}
                        """.formatted(juan.getId(), participacionDeAna)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("no corresponde al alumno")));
    }

    @Test
    void la_nota_de_una_clase_trae_la_fecha_de_esa_clase() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, yo);
        long participacion = idDeParticipacion(
                cargarClase(yo, alumno, inscripcion, sala1, "14:00", "15:30"));

        mvc.perform(post("/api/me/profesor/notas")
                .header("Authorization", credencialPara(yo))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idAlumno":%d,"idParticipacion":%d,"contenido":"cerró bien la mezcla"}
                        """.formatted(alumno.getId(), participacion)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.fechaDeLaClase").value(CLASE.toString()))
                .andExpect(jsonPath("$.fechaCreacion").isNotEmpty());
    }

    // == Seguimiento =========================================================

    /**
     * Uno por par profesor-alumno: alguien puede venir bien en DJ y trabado en
     * producción, y un estado único obligaría a que un profesor pise al otro.
     */
    @Test
    void el_semaforo_es_de_cada_profesor_sobre_cada_alumno() throws Exception {
        Profesor uno = profesorNuevo();
        Profesor dos = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        inscripcionDe(alumno, uno);
        inscripcionDe(alumno, dos, Disciplina.PRODUCCION);

        fijarSeguimiento(uno, alumno, "VA_BIEN", null).andExpect(status().isOk());
        fijarSeguimiento(dos, alumno, "REQUIERE_ATENCION", "faltó tres veces")
                .andExpect(status().isOk());

        mvc.perform(get("/api/me/profesor/alumnos").header("Authorization", credencialPara(uno)))
                .andExpect(jsonPath("$[0].estadoSeguimiento").value("VA_BIEN"));

        mvc.perform(get("/api/me/profesor/alumnos").header("Authorization", credencialPara(dos)))
                .andExpect(jsonPath("$[0].estadoSeguimiento").value("REQUIERE_ATENCION"))
                .andExpect(jsonPath("$[0].observaciones").value("faltó tres veces"));
    }

    /** Ponerlo y moverlo son el mismo gesto: hay uno solo, así que es un PUT. */
    @Test
    void mover_el_semaforo_no_crea_un_segundo_seguimiento() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        inscripcionDe(alumno, yo);

        fijarSeguimiento(yo, alumno, "VA_BIEN", null).andExpect(status().isOk());
        fijarSeguimiento(yo, alumno, "EN_PAUSA", "paró por trabajo").andExpect(status().isOk());
        em.flush();

        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM seguimiento_alumno WHERE id_alumno = ?",
                Integer.class, alumno.getId())).isEqualTo(1);
    }

    /**
     * `V14` §2 — *"con fecha de cambio"* tiene que ser verdad.
     *
     * <p><b>Este caso no se puede escribir como "actualizo dos veces y comparo".</b>
     * {@code now()} en Postgres es la hora de la TRANSACCIÓN, no del statement, y
     * esta clase es {@code @Transactional}: dos updates seguidos darían exactamente
     * el mismo valor y el caso pasaría sin probar nada. Por eso se ensucia la fecha
     * a mano con una fecha vieja y se verifica que el trigger la haya movido.
     */
    @Test
    void cambiar_el_estado_actualiza_la_fecha() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        inscripcionDe(alumno, yo);
        fijarSeguimiento(yo, alumno, "VA_BIEN", null).andExpect(status().isOk());
        em.flush();

        jdbc.update("UPDATE seguimiento_alumno SET fecha_actualizacion = '2020-01-01'"
                + " WHERE id_alumno = ?", alumno.getId());

        fijarSeguimiento(yo, alumno, "REQUIERE_ATENCION", "se colgó con la entrega")
                .andExpect(status().isOk());
        em.flush();

        assertThat(jdbc.queryForObject(
                "SELECT fecha_actualizacion > '2021-01-01' FROM seguimiento_alumno"
                        + " WHERE id_alumno = ?",
                Boolean.class, alumno.getId())).isTrue();
    }

    // == Material ============================================================

    /**
     * ⚠️ <b>Este caso reemplaza a {@code subir_sin_alumno_lo_marca_grupal}, que
     * defendía el agujero</b> (`mejoras.md` §12 · C2).
     *
     * <p>Aquél afirmaba que un material sin alumno quedaba "grupal", y grupal
     * <b>no filtraba por nada</b>: le llegaba a todos los alumnos del estudio,
     * incluidos los que nunca tuvieron a ese profesor. Estaba en verde y era
     * correcto respecto de lo que el código hacía — lo que faltaba era que alguien
     * decidiera qué tenía que hacer.
     *
     * <p>Ahora <b>todo material es de un curso</b>: sin {@code idInscripcion} el
     * alta se rechaza en vez de inventar un destinatario.
     */
    @Test
    void el_material_es_de_un_curso_y_sin_curso_no_entra() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, yo);

        mvc.perform(subir(yo, """
                {"idInscripcion":%d,"titulo":"Sample pack del curso",
                 "urlExterna":"https://drive.google.com/x"}
                """.formatted(curso.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idInscripcion").value(curso.getId().intValue()))
                .andExpect(jsonPath("$.idAlumno").value(alumno.getId().intValue()))
                // Sin clase: es material de todo el curso, que §18 · P41 admite.
                .andExpect(jsonPath("$.idReserva").doesNotExist())
                .andExpect(jsonPath("$.visibleAlumno").value(true))
                .andExpect(jsonPath("$.fechaSubida").isNotEmpty());

        mvc.perform(subir(yo, """
                {"titulo":"Sin curso","urlExterna":"https://drive.google.com/y"}
                """))
                .andExpect(status().isBadRequest());
    }

    /**
     * <b>No se le puede subir material al curso de un alumno ajeno.</b> Con el
     * modelo viejo esto ni siquiera se podía preguntar: el material grupal no
     * tenía destinatario, así que no había a quién no pertenecer.
     */
    @Test
    void no_puedo_subir_material_al_curso_de_un_alumno_que_no_es_mio() throws Exception {
        Profesor yo = profesorNuevo();
        Profesor otro = profesorNuevo();
        Alumno suyo = alumnoNuevo();
        Inscripcion curso = inscripcionDe(suyo, otro);

        mvc.perform(subir(yo, """
                {"idInscripcion":%d,"titulo":"No es mi alumno",
                 "urlExterna":"https://drive.google.com/z"}
                """.formatted(curso.getId())))
                .andExpect(status().isNotFound());
    }

    /**
     * <b>El material de una clase concreta</b> (§18 · P41: <i>"de esa clase"</i>).
     *
     * <p>El profesor elige la clase y el sistema deriva el resto —de qué curso es
     * y para quién—, que es la misma forma que estrenó `V22` con el descuento.
     */
    @Test
    void el_material_puede_colgar_de_la_clase_que_fue() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, yo);
        long clase = idDeReserva(cargarClase(yo, alumno, curso, sala1, "10:00", "11:30"));

        mvc.perform(subir(yo, """
                {"idInscripcion":%d,"idReserva":%d,"titulo":"Grabacion de la sesion",
                 "urlExterna":"https://drive.google.com/x"}
                """.formatted(curso.getId(), clase)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idReserva").value((int) clase))
                .andExpect(jsonPath("$.clase").isNotEmpty())
                .andExpect(jsonPath("$.curso").value("DJ"));
    }

    /**
     * ⚠️ <b>La regla que hace que las dos columnas sirvan de algo.</b> Sin ella se
     * puede colgar material de la inscripción de Juan sobre una clase de Ana: las
     * dos columnas serían válidas por separado y la fila mentiría igual. Es el
     * mismo agujero que `V1` §8.2 cierra del otro lado.
     */
    @Test
    void una_clase_de_otro_alumno_no_es_de_este_curso() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno juan = alumnoNuevo();
        Alumno ana = alumnoNuevo();
        Inscripcion deJuan = inscripcionDe(juan, yo);
        Inscripcion deAna = inscripcionDe(ana, yo);

        cargarClase(yo, juan, deJuan, sala1, "12:00", "13:30");
        long claseDeAna = idDeReserva(cargarClase(yo, ana, deAna, sala2, "14:00", "15:30"));

        mvc.perform(subir(yo, """
                {"idInscripcion":%d,"idReserva":%d,"titulo":"No es de esta clase",
                 "urlExterna":"https://drive.google.com/x"}
                """.formatted(deJuan.getId(), claseDeAna)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("no es de ese curso")));
    }

    /**
     * <b>Y el trigger de `V23` §5 es el que sostiene la regla</b>, no el
     * pre-chequeo del servicio. Se lo ataca con SQL crudo por lo mismo que en
     * `ReservaTest`: si mañana alguien afloja el servicio, esto sigue rechazando.
     */
    @Test
    void el_trigger_rechaza_la_clase_ajena_aunque_se_escriba_a_mano() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno juan = alumnoNuevo();
        Alumno ana = alumnoNuevo();
        Inscripcion deJuan = inscripcionDe(juan, yo);
        Inscripcion deAna = inscripcionDe(ana, yo);

        cargarClase(yo, juan, deJuan, sala1, "12:00", "13:30");
        long claseDeAna = idDeReserva(cargarClase(yo, ana, deAna, sala2, "14:00", "15:30"));

        long material = idDe(mvc.perform(subir(yo, """
                {"idInscripcion":%d,"titulo":"Del curso","urlExterna":"https://drive.google.com/x"}
                """.formatted(deJuan.getId()))), "\"idMaterial\":");

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE material SET id_reserva = ? WHERE id_material = ?", claseDeAna, material))
                .hasMessageContaining("no es de ese curso");
    }

    /** Ataja el error real: pegar el nombre del archivo en vez de su URL. */
    @Test
    void un_link_que_no_parece_un_link_se_rechaza() throws Exception {
        mvc.perform(subir(profesorNuevo(), """
                {"titulo":"Apunte","urlExterna":"apunte-final-v3.pdf"}
                """))
                .andExpect(status().isBadRequest());
    }

    /**
     * ⚠️ <b>Antes se llamaba "ve lo suyo Y LO GRUPAL", y ese "y lo grupal" era el
     * agujero</b>: el material sin destinatario llegaba a todos los alumnos del
     * estudio. Este caso lo ataca desde el lado que más importa —<b>el material de
     * un profesor que no es suyo</b>— porque es el que nadie miraba.
     */
    @Test
    void el_alumno_ve_lo_de_sus_cursos_y_nada_mas() throws Exception {
        Profesor yo = profesorNuevo();
        Profesor ajeno = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Alumno companiero = alumnoNuevo();
        Alumno deOtroProfe = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, yo);
        Inscripcion delCompaniero = inscripcionDe(companiero, yo);
        Inscripcion ajena = inscripcionDe(deOtroProfe, ajeno);

        mvc.perform(subir(yo, """
                {"idInscripcion":%d,"titulo":"Tu correccion","urlExterna":"https://drive.google.com/a"}
                """.formatted(curso.getId()))).andExpect(status().isCreated());
        mvc.perform(subir(yo, """
                {"idInscripcion":%d,"titulo":"La del companiero","urlExterna":"https://drive.google.com/b"}
                """.formatted(delCompaniero.getId()))).andExpect(status().isCreated());
        // El que antes se colaba: material de un profesor que este alumno no tuvo
        // nunca. Con `es_grupal` no hacía falta ni que fuera de otro profesor para
        // que llegara — bastaba con no elegir alumno.
        mvc.perform(subir(ajeno, """
                {"idInscripcion":%d,"titulo":"De un profe ajeno","urlExterna":"https://drive.google.com/g"}
                """.formatted(ajena.getId()))).andExpect(status().isCreated());

        mvc.perform(get("/api/me/materiales")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].titulo").value("Tu correccion"))
                .andExpect(jsonPath("$[?(@.titulo=='La del companiero')]").isEmpty())
                .andExpect(jsonPath("$[?(@.titulo=='De un profe ajeno')]").isEmpty());
    }

    /** La regla dura: el material se ve solo si el profesor lo habilitó. */
    @Test
    void lo_que_el_profesor_no_publico_no_lo_ve_el_alumno() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, yo);

        mvc.perform(subir(yo, """
                {"idInscripcion":%d,"titulo":"Todavia no","urlExterna":"https://drive.google.com/x",
                 "visibleAlumno":false}
                """.formatted(curso.getId()))).andExpect(status().isCreated());

        // El profesor sí lo ve: necesita saber qué tiene preparado.
        mvc.perform(get("/api/me/profesor/materiales").header("Authorization", credencialPara(yo)))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].visibleAlumno").value(false));

        mvc.perform(get("/api/me/materiales")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void publicarlo_despues_lo_hace_visible() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, yo);

        long id = idDe(mvc.perform(subir(yo, """
                {"idInscripcion":%d,"titulo":"Listo para el martes","urlExterna":"https://drive.google.com/x",
                 "visibleAlumno":false}
                """.formatted(curso.getId()))), "\"idMaterial\":");

        mvc.perform(patch("/api/me/profesor/materiales/" + id + "/visibilidad?visible=true")
                .header("Authorization", credencialPara(yo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.visibleAlumno").value(true));

        mvc.perform(get("/api/me/materiales")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(jsonPath("$.length()").value(1));
    }

    // == Mi agenda y el aviso automático =====================================

    @Test
    void mi_agenda_trae_mis_clases_con_sus_alumnos() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        cargarClase(yo, alumno, inscripcionDe(alumno, yo), sala1, "16:00", "17:30");

        mvc.perform(get("/api/me/profesor/agenda")
                .param("desde", CLASE.toString())
                .param("hasta", CLASE.toString())
                .header("Authorization", credencialPara(yo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].participantes.length()").value(1));
    }

    @Test
    void mi_historial_cuenta_clases_y_no_liquida_nada() throws Exception {
        Profesor yo = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, yo);
        cargarClase(yo, alumno, inscripcion, sala1, "18:00", "19:30");
        cargarClase(yo, alumno, inscripcion, sala2, "20:00", "21:30");

        mvc.perform(get("/api/me/profesor/clases")
                .param("desde", CLASE.toString())
                .param("hasta", CLASE.toString())
                .header("Authorization", credencialPara(yo)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clases").value(2))
                // Dos clases del mismo alumno son UNA persona atendida.
                .andExpect(jsonPath("$.alumnosAtendidos").value(1))
                // P20 sigue abierta: acá no hay ni tarifa ni total.
                .andExpect(jsonPath("$.total").doesNotExist())
                .andExpect(jsonPath("$.aCobrar").doesNotExist());
    }

    /**
     * *"Las notificaciones de cambio de sala llegan solas"* — regla dura de §8.
     * Le llega al alumno y al profesor: el que se presenta en la sala equivocada
     * es cualquiera de los dos.
     */
    @Test
    void mover_una_clase_de_sala_le_avisa_al_alumno_y_al_profesor() throws Exception {
        Profesor profe = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, profe);
        long idReserva = idDe(cargarClase(profe, alumno, inscripcion, sala1, "20:00", "21:30"),
                "\"idReserva\":");

        mvc.perform(put("/api/reservas/" + idReserva)
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"idProfesor":%d,"fecha":"%s",
                         "horaInicio":"20:00","horaFin":"21:30"}
                        """.formatted(sala2, claseDj, profe.getId(), CLASE)))
                .andExpect(status().isOk());

        mvc.perform(get("/api/me/notificaciones")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].tipo").value("RESERVA_MOVIDA"))
                // El aviso se basta solo: dice de dónde a dónde.
                .andExpect(jsonPath("$[0].contenido").value(
                        org.hamcrest.Matchers.containsString("Sala 1")))
                .andExpect(jsonPath("$[0].contenido").value(
                        org.hamcrest.Matchers.containsString("Sala 2")));

        mvc.perform(get("/api/me/notificaciones").header("Authorization", credencialPara(profe)))
                .andExpect(jsonPath("$.length()").value(1));
    }

    /**
     * Y el otro lado, que es el que hace útil al aviso: editar sin mover nada no
     * notifica. Un aviso por cada edición entrena a la gente a ignorarlos.
     */
    @Test
    void corregir_una_nota_de_la_reserva_no_le_avisa_a_nadie() throws Exception {
        Profesor profe = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion inscripcion = inscripcionDe(alumno, profe);
        long idReserva = idDe(cargarClase(profe, alumno, inscripcion, sala1, "09:00", "10:30"),
                "\"idReserva\":");

        mvc.perform(put("/api/reservas/" + idReserva)
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"idProfesor":%d,"fecha":"%s",
                         "horaInicio":"09:00","horaFin":"10:30","notas":"llevar auriculares"}
                        """.formatted(sala1, claseDj, profe.getId(), CLASE)))
                .andExpect(status().isOk());

        mvc.perform(get("/api/me/notificaciones")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(jsonPath("$.length()").value(0));
    }

    // == Lo que ve administración ============================================

    /**
     * <b>La otra mitad de la regla de §8</b>, y la que faltaba en el sistema:
     * <i>"sus notas privadas no las ven ni el alumno ni otros profesores.
     * Administración sí"</i>.
     *
     * <p>El par completo son este caso y
     * {@link #las_notas_de_un_profesor_no_las_ve_el_otro}: el mismo alumno, las
     * mismas dos notas, y dos respuestas distintas según quién pregunta. Si un día
     * alguien "unifica" las dos consultas, uno de los dos casos cae.
     */
    @Test
    void administracion_ve_las_notas_de_todos_los_profesores() throws Exception {
        Profesor uno = profesorNuevo();
        Profesor dos = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        inscripcionDe(alumno, uno);
        inscripcionDe(alumno, dos, Disciplina.PRODUCCION);

        anotar(uno, alumno, "le cuesta la mezcla");
        anotar(dos, alumno, "viene muy bien con Ableton");

        mvc.perform(get("/api/alumnos/" + alumno.getId() + "/notas")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                // Firmadas: tres notas de tres profesores sin autor no se leen.
                .andExpect(jsonPath("$[0].profesor").isNotEmpty())
                .andExpect(jsonPath("$[1].profesor").isNotEmpty());
    }

    /** La primera mitad de la misma regla: el alumno no ve lo que se anotó de él. */
    @Test
    void el_alumno_no_ve_sus_propias_notas() throws Exception {
        Alumno alumno = alumnoNuevo();
        Profesor profe = profesorNuevo();
        inscripcionDe(alumno, profe);
        anotar(profe, alumno, "le cuesta la mezcla");

        mvc.perform(get("/api/alumnos/" + alumno.getId() + "/notas")
                .header("Authorization", credencialPara(alumno.getUsuario())))
                .andExpect(status().isForbidden());
    }

    /** Y tampoco las ve un profesor entrando por la puerta de administración. */
    @Test
    void un_profesor_no_entra_por_la_puerta_de_administracion() throws Exception {
        Alumno alumno = alumnoNuevo();
        Profesor profe = profesorNuevo();
        inscripcionDe(alumno, profe);

        mvc.perform(get("/api/alumnos/" + alumno.getId() + "/notas")
                .header("Authorization", credencialPara(profe)))
                .andExpect(status().isForbidden());
    }

    /**
     * Administración ve también lo que el profesor dejó preparado sin publicar.
     * Que el alumno no lo vea es una decisión sobre cuándo entregarlo, no un
     * secreto contra el estudio — y la ficha lo muestra diciendo en qué estado
     * está.
     */
    @Test
    void administracion_ve_el_material_todavia_no_publicado() throws Exception {
        Profesor profe = profesorNuevo();
        Alumno alumno = alumnoNuevo();
        Inscripcion curso = inscripcionDe(alumno, profe);

        mvc.perform(subir(profe, """
                {"idInscripcion":%d,"titulo":"Proyecto para la clase 4",
                 "urlExterna":"https://drive.google.com/x","visibleAlumno":false}
                """.formatted(curso.getId())))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/alumnos/" + alumno.getId() + "/materiales")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].visibleAlumno").value(false));
    }

    /**
     * Un id que no existe contesta 404 y no una lista vacía: acá no hay nada que
     * ocultarle a quien pregunta —ya puede ver la ficha de cualquier alumno— y una
     * lista vacía se leería como "este alumno no tiene notas", que es falso.
     */
    @Test
    void las_notas_de_un_alumno_que_no_existe_son_404() throws Exception {
        mvc.perform(get("/api/alumnos/999999/notas").header("Authorization", comoStaff()))
                .andExpect(status().isNotFound());
    }

    // =========================================================================

    /**
     * ⚠️ La inscripción ya no viaja en el pedido —desde §12 · C1 la deriva el
     * servidor del tipo de uso—, pero el parámetro se queda: es lo que obliga a
     * que el curso exista antes de cargar la clase, que es lo que §17 · P39 pide.
     */
    private ResultActions cargarClase(Profesor profesor, Alumno alumno, Inscripcion inscripcion,
            Long idSala, String desde, String hasta) throws Exception {

        return mvc.perform(post("/api/reservas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idSala":%d,"idTipoUso":%d,"idProfesor":%d,"fecha":"%s",
                         "horaInicio":"%s","horaFin":"%s",
                         "participantes":[{"idUsuario":%d}]}
                        """.formatted(idSala, claseDj, profesor.getId(), CLASE, desde, hasta,
                        alumno.getUsuario().getId())))
                .andExpect(status().isCreated());
    }

    private long idDeReserva(ResultActions resultado) throws Exception {
        return idDe(resultado, "\"idReserva\":");
    }

    private ResultActions fijarSeguimiento(Profesor profesor, Alumno alumno,
            String estado, String observaciones) throws Exception {

        String cuerpo = observaciones == null
                ? "{\"estado\":\"" + estado + "\"}"
                : "{\"estado\":\"" + estado + "\",\"observaciones\":\"" + observaciones + "\"}";

        return mvc.perform(put("/api/me/profesor/alumnos/" + alumno.getId() + "/seguimiento")
                .header("Authorization", credencialPara(profesor))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo));
    }

    private void anotar(Profesor profesor, Alumno alumno, String texto) throws Exception {
        mvc.perform(post("/api/me/profesor/notas")
                .header("Authorization", credencialPara(profesor))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idAlumno":%d,"contenido":"%s"}
                        """.formatted(alumno.getId(), texto)))
                .andExpect(status().isCreated());
    }

    private org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder subir(
            Profesor profesor, String cuerpo) {

        return post("/api/me/profesor/materiales")
                .header("Authorization", credencialPara(profesor))
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private long idDeParticipacion(ResultActions clase) throws Exception {
        return idDe(clase, "\"idParticipacion\":");
    }

    private long idDe(ResultActions resultado, String clave) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return Long.parseLong(cuerpo.substring(desde, hasta).trim());
    }

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    private Profesor profesorNuevo() {
        Profesor profesor = new Profesor();
        profesor.setUsuario(crear(Rol.USUARIO));
        return profesores.save(profesor);
    }

    private Inscripcion inscripcionDe(Alumno alumno, Profesor profesor) {
        return inscripcionDe(alumno, profesor, Disciplina.DJ);
    }

    private Inscripcion inscripcionDe(Alumno alumno, Profesor profesor, Disciplina disciplina) {
        Inscripcion inscripcion = new Inscripcion();
        inscripcion.setAlumno(alumno);
        inscripcion.setProfesor(profesor);
        inscripcion.setDisciplina(disciplina);
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

    private String credencialPara(Profesor profesor) {
        return credencialPara(profesor.getUsuario());
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Docencia" + rol.name());
        usuario.setEmail("docencia-" + UUID.randomUUID() + "@lajuanita.local");
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
