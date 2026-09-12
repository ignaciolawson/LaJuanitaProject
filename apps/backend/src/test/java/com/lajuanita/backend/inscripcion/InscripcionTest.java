package com.lajuanita.backend.inscripcion;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.time.Instant;
import java.time.LocalDate;
import java.time.OffsetDateTime;
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

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

import jakarta.persistence.EntityManager;

/**
 * Módulo 1 — {@code inscripcion}, la tabla de la que dependen los filtros del
 * listado de alumnos, el perfil y el "cada profesor ve solo sus alumnos".
 *
 * <p>Se escribe junto con el módulo y no después, que es la corrección que dejó
 * {@code AlumnoTest} (QA-01): el Módulo 1 se construyó sin tests propios y hubo
 * que agregarlos cuando el refactor ya estaba encima.
 *
 * <p><b>Qué se prueba acá que no se prueba en otro lado.</b> Buena parte de las
 * reglas de este módulo viven en la base, y {@code mvn test} no corre las suites
 * SQL. Los casos del final ejercitan esas reglas <i>a través de la aplicación</i>,
 * que es donde se rompen de verdad: que el mensaje llegue traducido, que la
 * cuenta de clases que muestra la pantalla sea la misma que la base impone, y
 * que la firma de una baja de nivel no se pueda saltear llamando la API.
 *
 * <p>Todo va {@link Transactional} para que las filas se deshagan al terminar,
 * igual que en el resto de la suite.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class InscripcionTest {

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
    private InscripcionService servicio;

    @Autowired
    private JdbcTemplate jdbc;

    @Autowired
    private EntityManager em;

    // == El curso cerrado: cuántas clases trae cada disciplina ================

    /**
     * §13 (P34): el curso de DJ son 8 clases de 1:30. Que la cantidad la ponga
     * el servidor y no el formulario es lo que hace que un alta por la API tenga
     * la misma regla que un alta por pantalla.
     */
    @Test
    void una_inscripcion_de_dj_sin_decir_clases_toma_las_ocho_del_curso() throws Exception {
        Alumno alumno = alumnoNuevo();

        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","nivel":"INICIAL","precioTotal":180000,%s}
                """.formatted(alumno.getId(), SENA)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.clasesContratadas").value(8))
                .andExpect(jsonPath("$.inscripcion.clasesConsumidas").value(0))
                .andExpect(jsonPath("$.inscripcion.clasesRestantes").value(8))
                .andExpect(jsonPath("$.inscripcion.estado").value("ACTIVA"))
                .andExpect(jsonPath("$.inscripcion.moneda").value("ARS"));
    }

    @Test
    void una_inscripcion_de_produccion_toma_las_dieciseis() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"PRODUCCION","precioTotal":320000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.clasesContratadas").value(16));
    }

    /** La mentoría se arma a medida: no hay número de fábrica que suponer. */
    @Test
    void una_mentoria_sin_decir_las_clases_se_rechaza() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"MENTORIA","precioTotal":90000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void una_mentoria_diciendo_las_clases_entra() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"MENTORIA","clasesContratadas":4,"precioTotal":90000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.clasesContratadas").value(4));
    }

    /**
     * <b>Desde `V28` el estándar sale del catálogo, no del enum.</b> Si Mica cambia
     * el 8 de DJ desde la pantalla, el próximo alta lo usa. Es el caso que
     * pinea que hay UNA definición: con el número todavía en {@code Disciplina},
     * esto entraría con 8.
     */
    @Test
    void el_estandar_es_el_del_catalogo_y_se_edita() throws Exception {
        jdbc.update("UPDATE programa SET clases_estandar = 10 WHERE disciplina = 'DJ'");

        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":100000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.clasesContratadas").value(10));
    }

    /**
     * Un programa desactivado no se ofrece: es lo que {@code activo} significa.
     * Sin esto la columna sería decorativa, que es peor que no tenerla.
     */
    @Test
    void un_programa_desactivado_no_se_inscribe() throws Exception {
        jdbc.update("UPDATE programa SET activo = FALSE WHERE disciplina = 'PRODUCCION'");

        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"PRODUCCION","precioTotal":100000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("desactivado")));
    }

    /** El estándar es un valor por defecto, no un techo: un curso se puede ampliar desde el alta. */
    @Test
    void las_clases_dichas_a_mano_le_ganan_al_estandar() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","clasesContratadas":12,"precioTotal":250000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.clasesContratadas").value(12));
    }

    @Test
    void cero_clases_se_rechaza() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","clasesContratadas":0,"precioTotal":1000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.clasesContratadas").isNotEmpty());
    }

    // == Una activa por disciplina (P3) =======================================

    /**
     * <i>"Podés estar haciendo DJ inicial y mentoría; no DJ inicial y DJ
     * avanzado."</i> Quien decide es el índice único parcial; el servicio existe
     * para que el mensaje nombre el problema.
     */
    @Test
    void un_alumno_no_puede_tener_dos_inscripciones_activas_de_la_misma_disciplina() throws Exception {
        Alumno alumno = alumnoNuevo();
        String cuerpo = """
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumno.getId());

        mvc.perform(alta(cuerpo)).andExpect(status().isCreated());

        mvc.perform(alta(cuerpo))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.disciplina").isNotEmpty());
    }

    /** La otra mitad de P3, que es la que hace falta que ande: dos disciplinas a la vez sí. */
    @Test
    void el_mismo_alumno_puede_cursar_dj_y_mentoria_a_la_vez() throws Exception {
        Alumno alumno = alumnoNuevo();

        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumno.getId())))
                .andExpect(status().isCreated());

        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"MENTORIA","clasesContratadas":4,"precioTotal":90000}
                """.formatted(alumno.getId())))
                .andExpect(status().isCreated());
    }

    /** Repetir un curso al año siguiente es exactamente lo que el índice parcial permite. */
    @Test
    void se_puede_volver_a_inscribir_en_dj_una_vez_completado_el_anterior() throws Exception {
        Alumno alumno = alumnoNuevo();
        // Con seña: completar exige que haya nacido activa (la escalera de V30).
        String cuerpo = """
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000,%s}
                """.formatted(alumno.getId(), SENA);

        long primera = idDe(mvc.perform(alta(cuerpo)).andExpect(status().isCreated()));

        mvc.perform(patch("/api/inscripciones/" + primera + "/estado?estado=COMPLETADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("COMPLETADA"));

        mvc.perform(alta(cuerpo)).andExpect(status().isCreated());
    }

    /**
     * Y el camino de vuelta: reactivar la vieja cuando ya hay otra activa choca
     * contra el mismo índice. Sale como 409 con su mensaje propio, no como 500.
     */
    @Test
    void reactivar_una_inscripcion_vieja_choca_si_ya_hay_otra_activa() throws Exception {
        Alumno alumno = alumnoNuevo();
        String cuerpo = """
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000,%s}
                """.formatted(alumno.getId(), SENA);

        long primera = idDe(mvc.perform(alta(cuerpo)).andExpect(status().isCreated()));
        mvc.perform(patch("/api/inscripciones/" + primera + "/estado?estado=COMPLETADA")
                .header("Authorization", comoStaff())).andExpect(status().isOk());
        mvc.perform(alta(cuerpo)).andExpect(status().isCreated());

        mvc.perform(patch("/api/inscripciones/" + primera + "/estado?estado=ACTIVA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail")
                        .value("Ese alumno ya tiene una inscripción abierta en esa disciplina (activa o preinscripta)."));
    }

    // == Plata ================================================================

    /**
     * Un precio en dólares sin la cotización del día no se puede reconstruir
     * después. Lo rechaza la base, y el mensaje llega traducido gracias al mapa
     * de {@code ManejadorDeErrores} — sin él este caso sale como
     * <i>"Ese email o ese teléfono ya están registrados"</i>.
     */
    @Test
    void un_precio_en_dolares_sin_cotizacion_se_rechaza_con_su_mensaje() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":300,"moneda":"USD"}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail")
                        .value("Un importe en dólares necesita la cotización del día."));
    }

    @Test
    void un_precio_en_dolares_con_cotizacion_entra() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":300,
                 "moneda":"USD","cotizacionDolar":1450.5}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.moneda").value("USD"));
    }

    /** Una beca es un precio, no una inscripción sin precio. */
    @Test
    void una_inscripcion_en_cero_es_valida() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":0}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.precioTotal").value(0));
    }

    // == El profesor a cargo (P6) =============================================

    @Test
    void la_inscripcion_lleva_el_profesor_asignado() throws Exception {
        Profesor profe = profesorNuevo("Tomás", "Ghezzi");

        mvc.perform(alta("""
                {"idAlumno":%d,"idProfesor":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumnoNuevo().getId(), profe.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.idProfesor").value(profe.getId()))
                .andExpect(jsonPath("$.inscripcion.profesor").value("Tomás Ghezzi"));
    }

    /** Se puede anotar a alguien y decidir después quién lo toma. */
    @Test
    void una_inscripcion_sin_profesor_asignado_es_valida() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.idProfesor").doesNotExist());
    }

    @Test
    void asignar_un_profesor_que_no_existe_da_404() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"idProfesor":99999999,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumnoNuevoId())))
                .andExpect(status().isNotFound());
    }

    @Test
    void inscribir_a_un_alumno_que_no_existe_da_404() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":99999999,"disciplina":"DJ","precioTotal":180000}
                """))
                .andExpect(status().isNotFound());
    }

    // == El nivel y su firma (V9) =============================================

    @Test
    void subir_de_nivel_no_necesita_firma() throws Exception {
        long id = inscribirDj(alumnoNuevo(), "INICIAL");

        mvc.perform(editar(id, """
                {"nivel":"AVANZADO","clasesContratadas":8,"precioTotal":180000,"moneda":"ARS"}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nivel").value("AVANZADO"));
    }

    /** Poner el nivel por primera vez es completar una ficha, no retroceder. */
    @Test
    void poner_el_nivel_por_primera_vez_no_es_retroceder() throws Exception {
        long id = inscribirDj(alumnoNuevo(), null);

        mvc.perform(editar(id, """
                {"nivel":"INICIAL","clasesContratadas":8,"precioTotal":180000,"moneda":"ARS"}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nivel").value("INICIAL"));
    }

    /**
     * Bajar de nivel es decirle a alguien "no estás para intermedio". Queda
     * firmado o no pasa.
     */
    @Test
    void bajar_de_nivel_sin_motivo_se_rechaza() throws Exception {
        long id = inscribirDj(alumnoNuevo(), "AVANZADO");

        mvc.perform(editar(id, """
                {"nivel":"INICIAL","clasesContratadas":8,"precioTotal":180000,"moneda":"ARS"}
                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void un_motivo_en_blanco_no_alcanza_como_firma() throws Exception {
        long id = inscribirDj(alumnoNuevo(), "AVANZADO");

        mvc.perform(editar(id, """
                {"nivel":"INICIAL","clasesContratadas":8,"precioTotal":180000,
                 "moneda":"ARS","motivoBajaNivel":"   "}
                """))
                .andExpect(status().isBadRequest());
    }

    /**
     * El caso completo: baja aceptada, y la firma guardada con el autor que sale
     * del token — no del cuerpo del pedido.
     */
    @Test
    void bajar_de_nivel_con_motivo_queda_firmado_por_quien_lo_pidio() throws Exception {
        Usuario staff = crear(Rol.STAFF);
        long id = inscribirDj(alumnoNuevo(), "AVANZADO");

        mvc.perform(put("/api/inscripciones/" + id)
                .header("Authorization", credencialPara(staff))
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nivel":"INTERMEDIO","clasesContratadas":8,"precioTotal":180000,
                         "moneda":"ARS","motivoBajaNivel":"No llegó con la práctica final"}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nivel").value("INTERMEDIO"));

        // El UPDATE tiene que llegar a la base: es ahí donde vive el trigger que
        // valida la firma, no en el servicio.
        em.flush();

        Inscripcion guardada = inscripciones.findById(id).orElseThrow();
        assertThat(guardada.getIdUsuarioBajaNivel())
                .as("el autor de la firma sale del token")
                .isEqualTo(staff.getId());
        assertThat(guardada.getFechaBajaNivel()).isNotNull();
        assertThat(guardada.getMotivoBajaNivel()).isEqualTo("No llegó con la práctica final");
    }

    /**
     * <b>La red de abajo.</b> El chequeo del servicio da un mensaje lindo, pero
     * no es lo que sostiene la regla: si mañana alguien lo borra, o toca la base
     * por otro camino, el trigger de {@code V9} sigue estando. Este caso pasa por
     * encima de la aplicación a propósito.
     */
    @Test
    void la_base_rechaza_una_baja_de_nivel_sin_firma_aunque_no_pase_por_el_servicio() throws Exception {
        long id = inscribirDj(alumnoNuevo(), "AVANZADO");
        em.flush();

        assertThatThrownBy(() -> jdbc.update(
                "UPDATE inscripcion SET nivel = 'INICIAL' WHERE id_inscripcion = ?", id))
                .isInstanceOf(DataAccessException.class)
                .hasMessageContaining("id_usuario_baja_nivel");
    }

    // == El alta con o sin seña (P59, §16 · Fase 6) ============================

    /**
     * Con seña nace ACTIVA y el pago entra SENADO apuntándole, en la misma
     * transacción, y el alta devuelve el id del pago para colgarle el
     * comprobante (el molde de {@code ReservaCreada}).
     */
    @Test
    void con_senia_nace_activa_y_el_pago_queda_senado() throws Exception {
        Alumno alumno = alumnoNuevo();

        String respuesta = mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000,%s}
                """.formatted(alumno.getId(), SENA)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.estado").value("ACTIVA"))
                .andExpect(jsonPath("$.inscripcion.vencePreinscripcion").doesNotExist())
                .andExpect(jsonPath("$.idPagoSena").isNumber())
                .andReturn().getResponse().getContentAsString();

        long idPago = Long.parseLong(respuesta.replaceAll(".*\"idPagoSena\":(\\d+).*", "$1"));
        assertThat(jdbc.queryForObject(
                "SELECT estado_pago FROM pago WHERE id_pago = ?", String.class, idPago))
                .isEqualTo("SENADO");
        assertThat(jdbc.queryForObject(
                "SELECT id_inscripcion FROM pago WHERE id_pago = ?", Long.class, idPago))
                .isEqualTo(idDe(respuesta));
    }

    /**
     * ⚠️ Sin seña NO es "sin plata": nace PREINSCRIPTA con 24 horas (P72), y sin
     * ninguna fila de pago — la deuda no se anota, se calcula. Es el cambio de
     * política de P59 sobre P33.
     */
    @Test
    void sin_senia_nace_preinscripta_con_plazo_y_sin_deuda_anotada() throws Exception {
        Alumno alumno = alumnoNuevo();

        long id = idDe(mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumno.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.estado").value("PREINSCRIPTA"))
                .andExpect(jsonPath("$.inscripcion.vencePreinscripcion").isNotEmpty())
                .andExpect(jsonPath("$.idPagoSena").doesNotExist()));

        OffsetDateTime vence = jdbc.queryForObject(
                "SELECT vence_preinscripcion FROM inscripcion WHERE id_inscripcion = ?",
                OffsetDateTime.class, id);
        assertThat(vence).isBetween(
                OffsetDateTime.now().plusHours(23), OffsetDateTime.now().plusHours(25));
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM pago WHERE id_inscripcion = ?", Long.class, id))
                .isZero();
    }

    /** Una beca no tiene qué señar: en cero nace activa sin seña (§13: cero es un precio). */
    @Test
    void en_cero_nace_activa_sin_senia() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":0}
                """.formatted(alumnoNuevoId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.inscripcion.estado").value("ACTIVA"));
    }

    /** La seña en dólares sin cotización se frena en el DTO, como en la reserva. */
    @Test
    void una_senia_en_dolares_sin_cotizacion_se_rechaza() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000,
                 "sena":{"monto":100,"moneda":"USD","medioPago":"EFECTIVO"}}
                """.formatted(alumnoNuevoId())))
                .andExpect(status().isBadRequest());
    }

    // == La preinscripción (`V30`, P59 · P60 · P72) ============================
    //
    // Hasta la Fase 6 ningún alta escribe PREINSCRIPTA —el alta desde el buzón
    // y la seña opcional del alta de inscripciones llegan ahí—, así que la
    // fixture nace por SQL, igual que la fila legada del caso 225 de la suite.
    // Lo que estos casos pinean es la escalera y el único camino a ACTIVA.

    /**
     * ⚠️ El caso central: activar a mano, sin que haya entrado un peso, es lo
     * que el {@code <select>} de estados permitía con un clic y P59 vino a
     * impedir. La base contesta con su propio texto.
     */
    @Test
    void una_preinscripta_no_se_activa_a_mano_sin_la_senia_cobrada() throws Exception {
        long id = preinscribirDj(alumnoNuevo());

        mvc.perform(patch("/api/inscripciones/" + id + "/estado?estado=ACTIVA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("cobrada la senia")));
    }

    /**
     * El camino que sí: registrar la seña (SENADO) la activa en el mismo
     * movimiento y el plazo se va con el estado (P72). Partirlo en dos deja
     * preinscripciones pagas que nadie activó, con el plazo corriendo sobre
     * plata que ya entró.
     */
    @Test
    void cobrar_la_senia_activa_la_preinscripcion_y_le_saca_el_plazo() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = preinscribirDj(alumno);

        mvc.perform(post("/api/pagos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                         "medioPago":"EFECTIVO","estadoPago":"SENADO"}
                        """.formatted(alumno.getUsuario().getId(), id)))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/inscripciones/" + id).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("ACTIVA"))
                .andExpect(jsonPath("$.vencePreinscripcion").doesNotExist());
    }

    /** Una deuda anotada no es plata cobrada (la lección de `V12`): no activa. */
    @Test
    void una_deuda_anotada_no_activa_la_preinscripcion() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = preinscribirDj(alumno);

        mvc.perform(post("/api/pagos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"idInscripcion":%d,"monto":90000,"moneda":"ARS",
                         "medioPago":"EFECTIVO","estadoPago":"DEBE"}
                        """.formatted(alumno.getUsuario().getId(), id)))
                .andExpect(status().isCreated());

        mvc.perform(get("/api/inscripciones/" + id).header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.estado").value("PREINSCRIPTA"))
                .andExpect(jsonPath("$.vencePreinscripcion").isNotEmpty());
    }

    /** La otra salida: cancelarla no pide plata, y también se lleva el plazo. */
    @Test
    void una_preinscripta_se_cancela_sin_cobrar_nada() throws Exception {
        long id = preinscribirDj(alumnoNuevo());

        mvc.perform(patch("/api/inscripciones/" + id + "/estado?estado=CANCELADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CANCELADA"))
                .andExpect(jsonPath("$.vencePreinscripcion").doesNotExist());
    }

    /**
     * La sexta regla del scheduler (P73, §17 · H3): la preinscripta con más de
     * tres semanas del alta se cancela sola y avisa a la persona <b>una vez</b>,
     * con la clave del hecho. La de diez días no se toca: entre las 24 hs y las
     * tres semanas manda Mica (P61).
     */
    @Test
    void una_preinscripta_abandonada_se_cancela_sola_a_las_tres_semanas() throws Exception {
        Alumno abandonada = alumnoNuevo();
        Alumno reciente = alumnoNuevo();
        long vieja = preinscribirDj(abandonada);
        long nueva = preinscribirDj(reciente);
        jdbc.update("UPDATE inscripcion SET fecha_creacion = now() - interval '22 days' WHERE id_inscripcion = ?", vieja);
        jdbc.update("UPDATE inscripcion SET fecha_creacion = now() - interval '10 days' WHERE id_inscripcion = ?", nueva);

        assertThat(servicio.cancelarLasAbandonadas()).isEqualTo(1);
        em.clear();

        assertThat(jdbc.queryForObject("SELECT estado FROM inscripcion WHERE id_inscripcion = ?",
                String.class, vieja)).isEqualTo("CANCELADA");
        assertThat(jdbc.queryForObject("SELECT estado FROM inscripcion WHERE id_inscripcion = ?",
                String.class, nueva)).isEqualTo("PREINSCRIPTA");

        // Le avisó a la persona, con la clave del hecho: correrlo de nuevo no
        // cancela nada más ni escribe un segundo aviso.
        assertThat(servicio.cancelarLasAbandonadas()).isZero();
        assertThat(jdbc.queryForObject(
                "SELECT count(*) FROM notificacion WHERE id_usuario_destino = ? AND tipo = 'PREINSCRIPCION_CANCELADA'",
                Integer.class, abandonada.getUsuario().getId())).isEqualTo(1);
    }

    /**
     * §17 · H3: "Lo que debo" del estado de cuenta es la lista de Deudores
     * acotada a la persona — la seña de la preinscripta aparece ahí aunque no
     * haya ninguna fila de pago (P72), y la del vecino no.
     */
    @Test
    void el_estado_de_cuenta_dice_la_senia_pendiente_con_la_definicion_de_deudores() throws Exception {
        Alumno alumno = alumnoNuevo();
        Alumno vecino = alumnoNuevo();
        long id = preinscribirDj(alumno);
        preinscribirDj(vecino);

        mvc.perform(get("/api/pagos/estado-de-cuenta/" + alumno.getUsuario().getId())
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.saldos.length()").value(0))
                .andExpect(jsonPath("$.pendientes.length()").value(1))
                .andExpect(jsonPath("$.pendientes[0].motivo").value("SIN_SENIAR"))
                .andExpect(jsonPath("$.pendientes[0].idInscripcion").value(id))
                .andExpect(jsonPath("$.pendientes[0].adeudado").value(180000.0));
    }

    /** (b) de la escalera: ni pausar ni completar lo que no empezó. */
    @Test
    void una_preinscripta_no_se_pausa() throws Exception {
        long id = preinscribirDj(alumnoNuevo());

        mvc.perform(patch("/api/inscripciones/" + id + "/estado?estado=PAUSADA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("solo puede activarse")));
    }

    /** (a): a la preinscripción se entra sólo al nacer. */
    @Test
    void una_activa_no_vuelve_a_preinscripta() throws Exception {
        long id = inscribirDj(alumnoNuevo(), null);

        mvc.perform(patch("/api/inscripciones/" + id + "/estado?estado=PREINSCRIPTA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        org.hamcrest.Matchers.containsString("se entra solo al crearla")));
    }

    /**
     * El índice único mira ACTIVA y PREINSCRIPTA desde `V30`: una preinscripta
     * ocupa el lugar de su disciplina aunque no curse, y el mensaje lo dice.
     */
    @Test
    void una_preinscripta_ocupa_el_lugar_de_su_disciplina() throws Exception {
        Alumno alumno = alumnoNuevo();
        preinscribirDj(alumno);

        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumno.getId())))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.disciplina").value(
                        org.hamcrest.Matchers.containsString("preinscripta")));
    }

    /** Y no cursa: no está entre las vigentes que lista el filtro por estado. */
    @Test
    void una_preinscripta_no_es_una_inscripcion_vigente() throws Exception {
        Alumno alumno = alumnoNuevo();
        preinscribirDj(alumno);

        mvc.perform(get("/api/inscripciones?idAlumno=" + alumno.getId() + "&estado=ACTIVA")
                .header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.totalElementos").value(0));
        mvc.perform(get("/api/inscripciones?idAlumno=" + alumno.getId() + "&estado=PREINSCRIPTA")
                .header("Authorization", comoStaff()))
                .andExpect(jsonPath("$.totalElementos").value(1));
    }

    // == Edición ==============================================================

    @Test
    void editar_cambia_profesor_notas_y_fecha_de_inicio() throws Exception {
        long id = inscribirDj(alumnoNuevo(), "INICIAL");
        Profesor profe = profesorNuevo("Nueva", "Profe");

        mvc.perform(editar(id, """
                {"idProfesor":%d,"nivel":"INICIAL","clasesContratadas":8,"precioTotal":180000,
                 "moneda":"ARS","fechaInicio":"2026-09-01","notas":"  arranca en septiembre  "}
                """.formatted(profe.getId())))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idProfesor").value(profe.getId()))
                .andExpect(jsonPath("$.fechaInicio").value("2026-09-01"))
                // El servicio recorta los espacios, igual que en alumno.
                .andExpect(jsonPath("$.notas").value("arranca en septiembre"));
    }

    /**
     * "Para dar más clases hay que ampliar la inscripción" dice el trigger de
     * {@code V9}. Esta es la salida que ese mensaje nombra.
     */
    @Test
    void se_pueden_ampliar_las_clases_contratadas() throws Exception {
        long id = inscribirDj(alumnoNuevo(), "INICIAL");

        mvc.perform(editar(id, """
                {"nivel":"INICIAL","clasesContratadas":10,"precioTotal":220000,"moneda":"ARS"}
                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesContratadas").value(10))
                .andExpect(jsonPath("$.clasesRestantes").value(10));
    }

    @Test
    void editar_una_inscripcion_que_no_existe_da_404() throws Exception {
        mvc.perform(editar(99999999L, """
                {"clasesContratadas":8,"precioTotal":180000,"moneda":"ARS"}
                """))
                .andExpect(status().isNotFound());
    }

    @Test
    void pedir_una_inscripcion_que_no_existe_da_404() throws Exception {
        mvc.perform(get("/api/inscripciones/99999999").header("Authorization", comoStaff()))
                .andExpect(status().isNotFound());
    }

    // == Listado ==============================================================

    @Test
    void el_listado_filtra_por_alumno() throws Exception {
        Alumno uno = alumnoNuevo();
        Alumno otro = alumnoNuevo();
        long deUno = inscribirDj(uno, "INICIAL");
        inscribirDj(otro, "INICIAL");

        mvc.perform(get("/api/inscripciones?idAlumno=" + uno.getId())
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].idInscripcion").value(deUno));
    }

    @Test
    void el_listado_filtra_por_disciplina() throws Exception {
        Alumno alumno = alumnoNuevo();
        inscribirDj(alumno, "INICIAL");
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"MENTORIA","clasesContratadas":4,"precioTotal":90000}
                """.formatted(alumno.getId()))).andExpect(status().isCreated());

        mvc.perform(get("/api/inscripciones?idAlumno=" + alumno.getId() + "&disciplina=MENTORIA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].disciplina").value("MENTORIA"));
    }

    /**
     * El filtro que va a sostener el "cada profesor ve solo sus alumnos" cuando
     * exista el portal del profesor.
     */
    @Test
    void el_listado_filtra_por_profesor() throws Exception {
        Profesor profe = profesorNuevo("Filtro", "Profe");
        mvc.perform(alta("""
                {"idAlumno":%d,"idProfesor":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumnoNuevo().getId(), profe.getId())))
                .andExpect(status().isCreated());
        inscribirDj(alumnoNuevo(), "INICIAL");

        mvc.perform(get("/api/inscripciones?idProfesor=" + profe.getId())
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].idProfesor").value(profe.getId()));
    }

    @Test
    void el_listado_filtra_por_estado() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = inscribirDj(alumno, "INICIAL");
        mvc.perform(patch("/api/inscripciones/" + id + "/estado?estado=PAUSADA")
                .header("Authorization", comoStaff())).andExpect(status().isOk());

        mvc.perform(get("/api/inscripciones?idAlumno=" + alumno.getId() + "&estado=ACTIVA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(0));
    }

    /** El buscador es sobre la persona, no sobre la inscripción. */
    @Test
    void el_buscador_encuentra_por_apellido_del_alumno() throws Exception {
        String apellido = "Zurdo" + UUID.randomUUID().toString().substring(0, 8);
        Alumno alumno = alumnoNuevo();
        alumno.getUsuario().setApellido(apellido);
        usuarios.save(alumno.getUsuario());
        inscribirDj(alumno, "INICIAL");

        mvc.perform(get("/api/inscripciones?buscar=" + apellido)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].apellido").value(apellido));
    }

    /** El mismo escape de comodines que protege al listado de alumnos (SEC-09). */
    @Test
    void un_buscador_con_porcentaje_no_trae_la_lista_entera() throws Exception {
        inscribirDj(alumnoNuevo(), "INICIAL");

        mvc.perform(get("/api/inscripciones?buscar=%25").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(0));
    }

    @Test
    void el_tamanio_de_pagina_esta_acotado() throws Exception {
        mvc.perform(get("/api/inscripciones?tamanio=5000").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tamanio").value(100));

        mvc.perform(get("/api/inscripciones?tamanio=0").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tamanio").value(20));
    }

    // == Las clases restantes, que es para lo que existe el módulo ============
    //
    // `reserva` y `reserva_participante` no tienen entidad todavía (llegan con el
    // Módulo 2), así que estos casos las cargan por SQL. No es un atajo: es la
    // única forma de probar hoy que la cuenta que muestra la pantalla dice lo
    // mismo que la regla que la base impone en `V9` §5. El día que exista el
    // Módulo 2, estos casos son el contrato que tiene que seguir cumpliendo.

    @Test
    void una_clase_dictada_descuenta_del_saldo() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = inscribirDj(alumno, "INICIAL");
        em.flush();

        darClase(alumno, id, "CONFIRMADA", "PRESENTE");

        mvc.perform(get("/api/inscripciones/" + id).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesConsumidas").value(1))
                .andExpect(jsonPath("$.clasesRestantes").value(7));
    }

    /**
     * §13: <i>"si no se dictó, se recupera y sigue habiendo 8"</i>. Una clase
     * cancelada no se le cobra a nadie.
     */
    @Test
    void una_clase_cancelada_no_descuenta() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = inscribirDj(alumno, "INICIAL");
        em.flush();

        darClase(alumno, id, "CANCELADA", "PENDIENTE");

        mvc.perform(get("/api/inscripciones/" + id).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesRestantes").value(8));
    }

    /** Lo mismo por el otro lado: al alumno lo sacaron de la clase. */
    @Test
    void un_participante_dado_de_baja_no_descuenta() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = inscribirDj(alumno, "INICIAL");
        em.flush();

        darClase(alumno, id, "CONFIRMADA", "CANCELADA");

        mvc.perform(get("/api/inscripciones/" + id).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesRestantes").value(8));
    }

    /**
     * <b>El caso que se lee al revés y es la regla.</b> Faltar sin avisar
     * consume la clase: la clase se dictó. Es lo que le da sentido a
     * {@code AUSENTE_JUSTIFICADO} como estado aparte.
     */
    @Test
    void el_ausente_si_consume_la_clase() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = inscribirDj(alumno, "INICIAL");
        em.flush();

        darClase(alumno, id, "CONFIRMADA", "AUSENTE");

        mvc.perform(get("/api/inscripciones/" + id).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesRestantes").value(7));
    }

    /**
     * La cuenta no puede quedar en negativo aunque alguien achique las clases
     * contratadas por debajo de lo ya dictado — que la base no impide.
     */
    @Test
    void achicar_las_clases_por_debajo_de_lo_dictado_no_deja_un_saldo_negativo() throws Exception {
        Alumno alumno = alumnoNuevo();
        long id = inscribirDj(alumno, "INICIAL");
        em.flush();
        darClase(alumno, id, "CONFIRMADA", "PRESENTE");

        mvc.perform(editar(id, """
                {"nivel":"INICIAL","clasesContratadas":1,"precioTotal":180000,"moneda":"ARS"}
                """)).andExpect(status().isOk());

        mvc.perform(get("/api/inscripciones/" + id).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.clasesConsumidas").value(1))
                .andExpect(jsonPath("$.clasesRestantes").value(0));
    }

    // =========================================================================

    /**
     * Carga una clase real por SQL y anota al alumno con cargo a su inscripción.
     *
     * <p><b>La fecha es fija y muy vieja, y eso es el arreglo de un caso que se
     * rompió solo el 2026-08-29.</b> Decía {@code LocalDate.now().minusDays(7)} con
     * la Sala 1 a las 10:00 clavadas, así que la franja que ocupaba <b>se movía un
     * día por día</b>: el día que ese "hace una semana" cayó sobre una reserva real
     * de la base de desarrollo, el {@code EXCLUDE reserva_sin_solapamiento} rechazó
     * el INSERT y cuatro casos empezaron a fallar sin que nadie hubiera tocado nada.
     * Volvía a pasar solo, en otra fecha impredecible, cada vez que el calendario
     * pisara otra reserva.
     *
     * <p>Es la misma familia de fragilidad que las suites SQL ya tienen escrita
     * —<i>nunca hardcodear IDs</i>—, del otro lado: acá lo que no se puede fijar es
     * <b>la franja</b>, porque hay una constraint que la hace única de verdad.
     *
     * <p><b>La fecha no cambia lo que estos casos prueban</b>: la cuenta de clases
     * consumidas ({@code contarClasesConsumidas} y `V9` §5) mira el estado de la
     * reserva y el de la asistencia, y <b>no mira ninguna fecha</b>. 2020 es
     * simplemente un año en el que este estudio no tenía sistema.
     */
    private static final LocalDate CLASE_VIEJA = LocalDate.of(2020, 1, 6);

    private void darClase(Alumno alumno, long idInscripcion,
            String estadoReserva, String estadoAsistencia) {

        Long idReserva = jdbc.queryForObject("""
                INSERT INTO reserva (id_sala, id_tipo_uso, fecha, hora_inicio, hora_fin, estado)
                VALUES ((SELECT id_sala FROM sala WHERE nombre_sala = 'Sala 1'),
                        (SELECT id_tipo_uso FROM tipo_uso WHERE codigo = 'CLASE_DJ'),
                        ?, '10:00', '11:30', ?)
                RETURNING id_reserva
                """, Long.class, CLASE_VIEJA, estadoReserva);

        jdbc.update("""
                INSERT INTO reserva_participante
                       (id_reserva, id_usuario, id_inscripcion, estado_asistencia)
                VALUES (?, ?, ?, ?)
                """, idReserva, alumno.getUsuario().getId(), idInscripcion, estadoAsistencia);
    }

    private MockHttpServletRequestBuilder alta(String cuerpo) throws Exception {
        return post("/api/inscripciones")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    private MockHttpServletRequestBuilder editar(long id, String cuerpo)
            throws Exception {
        return put("/api/inscripciones/" + id)
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo);
    }

    /**
     * Da de alta una inscripción de DJ <b>con su seña</b> y devuelve su id.
     *
     * <p>Con seña porque desde `V30` un alta sin ella nace PREINSCRIPTA, que no
     * cursa: los casos que usan este helper hablan de una inscripción activa.
     * Los que prueban la preinscripción llaman a {@link #preinscribirDj}.
     */
    private long inscribirDj(Alumno alumno, String nivel) throws Exception {
        String nivelJson = nivel == null ? "null" : "\"" + nivel + "\"";
        return idDe(mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","nivel":%s,"precioTotal":180000,%s}
                """.formatted(alumno.getId(), nivelJson, SENA)))
                .andExpect(status().isCreated()));
    }

    /** La seña de un alta, para pegar en un cuerpo: la mitad de 180.000. */
    private static final String SENA =
            "\"sena\":{\"monto\":90000,\"moneda\":\"ARS\",\"medioPago\":\"EFECTIVO\"}";

    /**
     * Nace preinscripta, por SQL: hasta la Fase 6 no hay alta que lo escriba.
     * Se flushea antes para que el alumno exista del lado de la base.
     */
    private long preinscribirDj(Alumno alumno) {
        em.flush();
        return jdbc.queryForObject("""
                INSERT INTO inscripcion (id_alumno, disciplina, clases_contratadas, precio_total,
                                         estado, vence_preinscripcion)
                VALUES (?, 'DJ', 8, 180000, 'PREINSCRIPTA', now() + interval '24 hours')
                RETURNING id_inscripcion
                """, Long.class, alumno.getId());
    }

    /** Sin parsear JSON: el id es lo único que hace falta y el DTO es plano. */
    private long idDe(ResultActions resultado) throws Exception {
        return idDe(resultado.andReturn().getResponse().getContentAsString());
    }

    private long idDe(String respuesta) {
        int desde = respuesta.indexOf("\"idInscripcion\":") + "\"idInscripcion\":".length();
        int hasta = respuesta.indexOf(',', desde);
        return Long.parseLong(respuesta.substring(desde, hasta).trim());
    }

    private Alumno alumnoNuevo() {
        Alumno alumno = new Alumno();
        alumno.setUsuario(crear(Rol.USUARIO));
        return alumnos.save(alumno);
    }

    /** Para el caso en que solo hace falta un id de alumno válido. */
    private long alumnoNuevoId() {
        return alumnoNuevo().getId();
    }

    private Profesor profesorNuevo(String nombre, String apellido) {
        Usuario persona = crear(Rol.USUARIO);
        persona.setNombre(nombre);
        persona.setApellido(apellido);
        usuarios.save(persona);

        Profesor profesor = new Profesor();
        profesor.setUsuario(persona);
        return profesores.save(profesor);
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Inscripcion" + rol.name());
        usuario.setEmail(emailNuevo());
        // No se loguea con esto: el test firma el token directamente.
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

    private String emailNuevo() {
        return "inscripcion-" + UUID.randomUUID() + "@lajuanita.local";
    }
}
