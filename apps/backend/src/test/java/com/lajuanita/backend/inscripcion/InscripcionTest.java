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
                {"idAlumno":%d,"disciplina":"DJ","nivel":"INICIAL","precioTotal":180000}
                """.formatted(alumno.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.clasesContratadas").value(8))
                .andExpect(jsonPath("$.clasesConsumidas").value(0))
                .andExpect(jsonPath("$.clasesRestantes").value(8))
                .andExpect(jsonPath("$.estado").value("ACTIVA"))
                .andExpect(jsonPath("$.moneda").value("ARS"));
    }

    @Test
    void una_inscripcion_de_produccion_toma_las_dieciseis() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"PRODUCCION","precioTotal":320000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.clasesContratadas").value(16));
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
                .andExpect(jsonPath("$.clasesContratadas").value(4));
    }

    /** El estándar es un valor por defecto, no un techo: un curso se puede ampliar desde el alta. */
    @Test
    void las_clases_dichas_a_mano_le_ganan_al_estandar() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","clasesContratadas":12,"precioTotal":250000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.clasesContratadas").value(12));
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
        String cuerpo = """
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumno.getId());

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
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumno.getId());

        long primera = idDe(mvc.perform(alta(cuerpo)).andExpect(status().isCreated()));
        mvc.perform(patch("/api/inscripciones/" + primera + "/estado?estado=COMPLETADA")
                .header("Authorization", comoStaff())).andExpect(status().isOk());
        mvc.perform(alta(cuerpo)).andExpect(status().isCreated());

        mvc.perform(patch("/api/inscripciones/" + primera + "/estado?estado=ACTIVA")
                .header("Authorization", comoStaff()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail")
                        .value("Ese alumno ya tiene una inscripción activa en esa disciplina."));
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
                .andExpect(jsonPath("$.moneda").value("USD"));
    }

    /** Una beca es un precio, no una inscripción sin precio. */
    @Test
    void una_inscripcion_en_cero_es_valida() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":0}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.precioTotal").value(0));
    }

    // == El profesor a cargo (P6) =============================================

    @Test
    void la_inscripcion_lleva_el_profesor_asignado() throws Exception {
        Profesor profe = profesorNuevo("Tomás", "Ghezzi");

        mvc.perform(alta("""
                {"idAlumno":%d,"idProfesor":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumnoNuevo().getId(), profe.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idProfesor").value(profe.getId()))
                .andExpect(jsonPath("$.profesor").value("Tomás Ghezzi"));
    }

    /** Se puede anotar a alguien y decidir después quién lo toma. */
    @Test
    void una_inscripcion_sin_profesor_asignado_es_valida() throws Exception {
        mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","precioTotal":180000}
                """.formatted(alumnoNuevo().getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idProfesor").doesNotExist());
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

    /** Carga una clase real por SQL y anota al alumno con cargo a su inscripción. */
    private void darClase(Alumno alumno, long idInscripcion,
            String estadoReserva, String estadoAsistencia) {

        Long idReserva = jdbc.queryForObject("""
                INSERT INTO reserva (id_sala, id_tipo_uso, fecha, hora_inicio, hora_fin, estado)
                VALUES ((SELECT id_sala FROM sala WHERE nombre_sala = 'Sala 1'),
                        (SELECT id_tipo_uso FROM tipo_uso WHERE codigo = 'CLASE_DJ'),
                        ?, '10:00', '11:30', ?)
                RETURNING id_reserva
                """, Long.class, LocalDate.now().minusDays(7), estadoReserva);

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

    /** Da de alta una inscripción de DJ y devuelve su id. */
    private long inscribirDj(Alumno alumno, String nivel) throws Exception {
        String nivelJson = nivel == null ? "null" : "\"" + nivel + "\"";
        return idDe(mvc.perform(alta("""
                {"idAlumno":%d,"disciplina":"DJ","nivel":%s,"precioTotal":180000}
                """.formatted(alumno.getId(), nivelJson)))
                .andExpect(status().isCreated()));
    }

    /** Sin parsear JSON: el id es lo único que hace falta y el DTO es plano. */
    private long idDe(ResultActions resultado) throws Exception {
        String respuesta = resultado.andReturn().getResponse().getContentAsString();
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
