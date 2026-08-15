package com.lajuanita.backend.alumno;

import static org.assertj.core.api.Assertions.assertThat;
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
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 1 — la lógica de {@code alumno}, que es el módulo que se está
 * construyendo.
 *
 * <p><b>Por qué existe este archivo (QA-01).</b> Los 86 tests anteriores cubrían
 * la autenticación de punta a punta y nada del Módulo 1: las dos únicas llamadas
 * a {@code POST /api/alumnos} vivían dentro de tests de permisos, donde el alta
 * era el medio para probar otra cosa. El camino {@code idUsuario} —el que existe
 * para sostener la decisión de {@code usuario} como identidad raíz— <b>no lo
 * ejecutaba ningún test</b>, y {@code editar}, {@code cambiarEstado} y los
 * parámetros del buscador tampoco.
 *
 * <p>La próxima tanda es {@code inscripcion}, que se construye encima de esto y
 * obliga a tocar {@link AlumnoService}. Sin estos casos, ese refactor se hace
 * con los tests en verde porque prueban otra cosa.
 *
 * <p>Todo va {@link Transactional} para que las filas se deshagan al terminar,
 * igual que en el resto de la suite: si no, cada corrida deja basura y el índice
 * único de email hace fallar la siguiente.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class AlumnoTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private AlumnoRepository alumnos;

    // == Los dos caminos del alta =============================================

    /**
     * Camino 2: Micaela carga a alguien de cero. Es el de la migración del
     * Notion en diciembre.
     */
    @Test
    void alta_con_cuenta_nueva_crea_la_cuenta_y_devuelve_la_password_temporal() throws Exception {
        String email = emailNuevo();

        mvc.perform(post("/api/alumnos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"usuarioNuevo":{"nombre":"Nadia","apellido":"Suárez","email":"%s"},
                         "nivelIngreso":"INICIAL","instagram":"@nadia.dj"}
                        """.formatted(email)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.alumno.email").value(email))
                .andExpect(jsonPath("$.alumno.nombre").value("Nadia"))
                .andExpect(jsonPath("$.alumno.nivelIngreso").value("INICIAL"))
                .andExpect(jsonPath("$.alumno.instagram").value("@nadia.dj"))
                // El estado por defecto lo pone la base, no el servicio.
                .andExpect(jsonPath("$.alumno.estadoAlumno").value("ACTIVO"))
                // Se muestra UNA sola vez, para pasarla por WhatsApp.
                .andExpect(jsonPath("$.passwordTemporal").isNotEmpty());

        Usuario creado = usuarios.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(creado.isDebeCambiarPassword())
                .as("una cuenta creada por administración obliga a cambiar la contraseña")
                .isTrue();
    }

    /**
     * Camino 1, y <b>el que ningún test ejecutaba nunca</b>: alguien que ya
     * tiene cuenta —se registró solo, quizá para alquilar una cabina— ahora se
     * inscribe. Es el caso que justifica que {@code usuario} sea la identidad
     * raíz y no {@code alumno}.
     */
    @Test
    void alta_de_alguien_que_ya_tenia_cuenta_no_crea_una_cuenta_nueva() throws Exception {
        Usuario existente = crear(Rol.USUARIO);
        // La credencial se pide ANTES de contar: `comoStaff()` crea su propio
        // usuario, así que pedirla después mueve el número que se está midiendo.
        String staff = comoStaff();
        long cuentasAntes = usuarios.count();

        mvc.perform(post("/api/alumnos")
                .header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"nivelIngreso":"INTERMEDIO"}
                        """.formatted(existente.getId())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.alumno.idUsuario").value(existente.getId()))
                .andExpect(jsonPath("$.alumno.email").value(existente.getEmail()))
                .andExpect(jsonPath("$.alumno.nivelIngreso").value("INTERMEDIO"))
                // No se creó cuenta, así que no hay contraseña que pasarle: la
                // persona ya tiene la suya y sigue entrando con esa.
                .andExpect(jsonPath("$.passwordTemporal").doesNotExist());

        assertThat(usuarios.count())
                .as("inscribir a quien ya tenía cuenta no debe crear una segunda")
                .isEqualTo(cuentasAntes);
    }

    /** Los dos caminos son excluyentes: ni los dos juntos, ni ninguno. */
    @Test
    void mandar_los_dos_caminos_a_la_vez_se_rechaza() throws Exception {
        Usuario existente = crear(Rol.USUARIO);

        mvc.perform(post("/api/alumnos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,
                         "usuarioNuevo":{"nombre":"Doble","apellido":"Camino","email":"%s"},
                         "nivelIngreso":"INICIAL"}
                        """.formatted(existente.getId(), emailNuevo())))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void no_mandar_ningun_camino_se_rechaza() throws Exception {
        mvc.perform(post("/api/alumnos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nivelIngreso":"INICIAL"}
                        """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").isNotEmpty());
    }

    @Test
    void inscribir_a_un_usuario_que_no_existe_da_404() throws Exception {
        mvc.perform(post("/api/alumnos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":99999999,"nivelIngreso":"INICIAL"}
                        """))
                .andExpect(status().isNotFound());
    }

    /**
     * La base ya lo impide con el UNIQUE sobre {@code alumno.id_usuario}; el
     * guardia del servicio existe para que salga un mensaje y no una violación
     * de constraint en la pantalla.
     */
    @Test
    void la_misma_persona_no_se_puede_dar_de_alta_dos_veces_como_alumno() throws Exception {
        Usuario existente = crear(Rol.USUARIO);
        String cuerpo = """
                {"idUsuario":%d,"nivelIngreso":"INICIAL"}
                """.formatted(existente.getId());

        mvc.perform(post("/api/alumnos").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isCreated());

        mvc.perform(post("/api/alumnos").header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON).content(cuerpo))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.idUsuario").isNotEmpty());
    }

    /**
     * La promesa transaccional del javadoc de {@link AlumnoService#alta}: <i>"si
     * el alta del alumno falla, la cuenta recién creada se deshace con ella y no
     * queda un usuario huérfano"</i>. Era una afirmación falsable que nada
     * falseaba.
     *
     * <p>Se fuerza el fallo con un email ya tomado, que es el único modo de
     * falla que el endpoint puede producir hoy en este camino.
     */
    @Test
    void si_el_alta_falla_no_queda_un_usuario_huerfano() throws Exception {
        Usuario yaExiste = crear(Rol.USUARIO);
        String staff = comoStaff();
        long cuentasAntes = usuarios.count();
        long alumnosAntes = alumnos.count();

        mvc.perform(post("/api/alumnos")
                .header("Authorization", staff)
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"usuarioNuevo":{"nombre":"Choca","apellido":"Email","email":"%s"},
                         "nivelIngreso":"INICIAL"}
                        """.formatted(yaExiste.getEmail())))
                .andExpect(status().isConflict());

        assertThat(usuarios.count())
                .as("un alta fallida no deja la cuenta a medio crear")
                .isEqualTo(cuentasAntes);
        assertThat(alumnos.count()).isEqualTo(alumnosAntes);
    }

    // == Edición y estado =====================================================

    @Test
    void editar_cambia_el_nivel_y_el_instagram_y_no_toca_a_la_persona() throws Exception {
        Long idAlumno = darDeAlta(crear(Rol.USUARIO), "INICIAL");

        mvc.perform(put("/api/alumnos/" + idAlumno)
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nivelIngreso":"AVANZADO","instagram":"  @nuevo.perfil  "}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.nivelIngreso").value("AVANZADO"))
                // El servicio recorta los espacios antes de guardar.
                .andExpect(jsonPath("$.instagram").value("@nuevo.perfil"));
    }

    /** Un instagram en blanco se guarda como null, no como cadena vacía. */
    @Test
    void editar_con_instagram_vacio_lo_deja_en_null() throws Exception {
        Long idAlumno = darDeAlta(crear(Rol.USUARIO), "INICIAL");

        mvc.perform(put("/api/alumnos/" + idAlumno)
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nivelIngreso":"INICIAL","instagram":"   "}
                        """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.instagram").doesNotExist());
    }

    /**
     * El endpoint que la pantalla sí usa y ningún test tocaba. Suspender
     * conserva todo el historial: es regla dura del módulo, y por eso ninguna FK
     * usa ON DELETE CASCADE.
     */
    @Test
    void cambiar_el_estado_del_alumno_no_lo_borra_ni_toca_su_cuenta() throws Exception {
        Usuario persona = crear(Rol.USUARIO);
        Long idAlumno = darDeAlta(persona, "INICIAL");

        mvc.perform(patch("/api/alumnos/" + idAlumno + "/estado?estado=SUSPENDIDO")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoAlumno").value("SUSPENDIDO"))
                // Suspender al alumno no da de baja a la persona: son dos ejes
                // distintos, igual que el rol y la relación de negocio.
                .andExpect(jsonPath("$.usuarioActivo").value(true));

        assertThat(alumnos.findById(idAlumno))
                .as("suspender no borra la fila")
                .isPresent();

        mvc.perform(patch("/api/alumnos/" + idAlumno + "/estado?estado=ACTIVO")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estadoAlumno").value("ACTIVO"));
    }

    @Test
    void un_estado_que_no_existe_se_rechaza() throws Exception {
        Long idAlumno = darDeAlta(crear(Rol.USUARIO), "INICIAL");

        mvc.perform(patch("/api/alumnos/" + idAlumno + "/estado?estado=EGRESADO")
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest());
    }

    @Test
    void editar_un_alumno_que_no_existe_da_404() throws Exception {
        mvc.perform(put("/api/alumnos/99999999")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nivelIngreso":"INICIAL"}
                        """))
                .andExpect(status().isNotFound());
    }

    // == Buscador, filtro y paginado ==========================================

    /**
     * Ningún test pasaba nunca {@code ?buscar=}, así que
     * {@link com.lajuanita.backend.usuario.Busqueda#patron} <b>nunca se ejecutaba
     * con un patrón real</b> — solo con null. Esa clase existe por dos bugs
     * encontrados a los golpes, y los dos podían volver sin que nada se pusiera
     * rojo.
     */
    @Test
    void el_buscador_encuentra_por_apellido() throws Exception {
        String apellido = "Zurdo" + UUID.randomUUID().toString().substring(0, 8);
        Usuario persona = crear(Rol.USUARIO);
        persona.setApellido(apellido);
        usuarios.save(persona);
        darDeAlta(persona, "INICIAL");

        mvc.perform(get("/api/alumnos?buscar=" + apellido)
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(1))
                .andExpect(jsonPath("$.contenido[0].apellido").value(apellido));
    }

    /**
     * <b>El caso que protege a {@code Busqueda}.</b> El {@code %} es un comodín
     * de LIKE: sin escaparlo, buscar "100%" trae la lista entera en vez de nada.
     * Un buscador que ignora en silencio lo que se le pide es peor que uno que
     * no encuentra.
     */
    @Test
    void un_buscador_con_porcentaje_no_trae_la_lista_entera() throws Exception {
        darDeAlta(crear(Rol.USUARIO), "INICIAL");

        mvc.perform(get("/api/alumnos?buscar=%25")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(0));
    }

    /** El guion bajo es el otro comodín, y el que nadie recuerda. */
    @Test
    void un_buscador_con_guion_bajo_tampoco_hace_de_comodin() throws Exception {
        darDeAlta(crear(Rol.USUARIO), "INICIAL");

        mvc.perform(get("/api/alumnos?buscar=_")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalElementos").value(0));
    }

    /**
     * Buscar sin texto tiene que traer todo. Es el caso que rompía con
     * {@code function lower(bytea) does not exist}: sin valor, el driver no
     * puede deducir el tipo del parámetro y lo liga como binario.
     */
    @Test
    void buscar_sin_texto_trae_todo_y_no_explota() throws Exception {
        darDeAlta(crear(Rol.USUARIO), "INICIAL");

        mvc.perform(get("/api/alumnos?buscar=").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido").isArray());
    }

    @Test
    void el_filtro_por_estado_deja_afuera_a_los_demas() throws Exception {
        Long suspendido = darDeAlta(crear(Rol.USUARIO), "INICIAL");
        mvc.perform(patch("/api/alumnos/" + suspendido + "/estado?estado=SUSPENDIDO")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk());

        mvc.perform(get("/api/alumnos?estado=SUSPENDIDO").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.idAlumno == " + suspendido + ")]").exists());

        mvc.perform(get("/api/alumnos?estado=INACTIVO").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.contenido[?(@.idAlumno == " + suspendido + ")]").doesNotExist());
    }

    /**
     * El listado pagina en el servidor, y el tamaño está acotado: pedir 5000
     * filas no puede convertirse en traerlas.
     */
    @Test
    void el_tamanio_de_pagina_esta_acotado() throws Exception {
        mvc.perform(get("/api/alumnos?tamanio=5000").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tamanio").value(100));

        mvc.perform(get("/api/alumnos?tamanio=0").header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.tamanio").value(20));
    }

    /** {@code GET /api/alumnos/{id}}, que tampoco tenía un solo test. */
    @Test
    void se_puede_pedir_un_alumno_por_id() throws Exception {
        Usuario persona = crear(Rol.USUARIO);
        Long idAlumno = darDeAlta(persona, "INICIAL");

        mvc.perform(get("/api/alumnos/" + idAlumno).header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idAlumno").value(idAlumno))
                .andExpect(jsonPath("$.email").value(persona.getEmail()));
    }

    @Test
    void pedir_un_alumno_que_no_existe_da_404() throws Exception {
        mvc.perform(get("/api/alumnos/99999999").header("Authorization", comoStaff()))
                .andExpect(status().isNotFound());
    }

    // =========================================================================

    /** Da de alta por el camino {@code idUsuario} y devuelve el id del alumno. */
    private Long darDeAlta(Usuario persona, String nivel) throws Exception {
        String respuesta = mvc.perform(post("/api/alumnos")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idUsuario":%d,"nivelIngreso":"%s"}
                        """.formatted(persona.getId(), nivel)))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();

        // Sin parsear JSON: el id es lo único que hace falta y el DTO es plano.
        int desde = respuesta.indexOf("\"idAlumno\":") + "\"idAlumno\":".length();
        int hasta = respuesta.indexOf(',', desde);
        return Long.valueOf(respuesta.substring(desde, hasta).trim());
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Alumno" + rol.name());
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
        return "alumno-" + UUID.randomUUID() + "@lajuanita.local";
    }
}
