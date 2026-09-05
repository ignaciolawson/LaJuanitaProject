package com.lajuanita.backend.sello;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.UUID;

import org.hamcrest.Matchers;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.ResultActions;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Módulo 7 — el sello discográfico.
 *
 * <p><b>La pregunta de esta suite es una sola: ¿se puede publicar un release sin
 * contrato?</b> Es la regla dura del módulo, la que el alcance declara confirmada
 * con el cliente, y la que <b>no existía en ninguna capa</b> hasta `V18` — ni CHECK,
 * ni trigger, ni servicio, ni pantalla. Como nadie la implementaba, nada podía
 * fallar: apareció releyendo el alcance contra lo construido, igual que la mitad de
 * §8 que encontró el Módulo 5.
 *
 * <p>Tiene tres puertas, y cada una su caso:
 *
 * <ol>
 *   <li>Publicar de frente sin contrato — lo para el trigger de `V18` §2.
 *   <li>Publicar con contrato y después sacarlo — lo para `V18` §3.
 *   <li>Cancelar para escaparse de esa protección y volver a entrar — lo para
 *       `V18` §1b, que es la mitad que faltaba de "los estados solo avanzan".
 * </ol>
 *
 * <p>La tercera es la que nadie había mirado, y estaba abierta <b>también en Mix &
 * Mastering</b>.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class SelloTest {

    /** Un PDF de mentira, pero con el encabezado bien: el sistema mira el contenido. */
    private static final byte[] PDF = "%PDF-1.4\ncontrato de prueba"
            .getBytes(StandardCharsets.US_ASCII);

    @Autowired private MockMvc mvc;
    @Autowired private JwtEncoder codificador;
    @Autowired private UsuarioRepository usuarios;

    // == La regla del módulo =================================================

    @Test
    void no_se_publica_un_release_sin_contrato() throws Exception {
        long release = releaseDe(artista());

        publicar(release, null)
                .andExpect(status().isConflict())
                // El texto sale del trigger y explica la salida: es lo que la
                // pantalla muestra, así que tiene que decir algo útil.
                .andExpect(jsonPath("$.detail").value(
                        Matchers.containsString("sin un contrato adjunto")));
    }

    @Test
    void con_el_contrato_cargado_se_publica() throws Exception {
        long artista = artista();
        long release = releaseDe(artista);
        cargarContrato(artista, release).andExpect(status().isCreated());

        publicar(release, null)
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PUBLICADO"))
                .andExpect(jsonPath("$.publicadoSinContrato").value(false))
                // Un release publicado sin fecha real es uno que salió y no dice
                // cuándo: se completa solo.
                .andExpect(jsonPath("$.fechaReal").isNotEmpty());
    }

    /**
     * <b>La mitad no obvia de la regla</b>, y no es una excepción inventada: `V1`
     * dejó {@code id_release} nullable con su propio comentario — un contrato puede
     * cubrir al artista en general. Es la misma forma que la seña de `V10`, donde el
     * dinero llega por un pago propio o por la inscripción que cubre la clase.
     */
    @Test
    void un_contrato_general_del_artista_respalda_sus_releases() throws Exception {
        long artista = artista();
        cargarContrato(artista, null).andExpect(status().isCreated());
        long release = releaseDe(artista);

        publicar(release, null).andExpect(status().isOk());
    }

    /** Y el contrato de OTRO artista no respalda nada de este. */
    @Test
    void el_contrato_de_otro_artista_no_sirve() throws Exception {
        cargarContrato(artista(), null).andExpect(status().isCreated());

        publicar(releaseDe(artista()), null).andExpect(status().isConflict());
    }

    /**
     * <b>La salida, que existe a propósito.</b> Un bloqueo sin excepción se esquiva
     * por afuera del sistema y ahí el sistema pasa a mentir — Ghezz ya avisó que con
     * gente cercana es flexible. Cuesta una frase, y queda firmada.
     */
    @Test
    void sin_contrato_se_publica_igual_escribiendo_el_motivo() throws Exception {
        long release = releaseDe(artista());

        publicar(release, "Contrato firmado en papel, lo escanea Ghezz la semana que viene")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("PUBLICADO"))
                .andExpect(jsonPath("$.publicadoSinContrato").value(true))
                .andExpect(jsonPath("$.motivoPublicacion").isNotEmpty())
                // El autor sale del token, no del cuerpo: una firma que el cliente
                // pudiera elegir no firma nada.
                .andExpect(jsonPath("$.publicadoPor").isNotEmpty());
    }

    /**
     * <b>`V18` §3, desde el módulo que la necesita.</b> El ataque son tres pasos,
     * calcado del que `V6` §6 cerró para el premaster: cargar, publicar, sacar el
     * contrato. Sin esta regla el catálogo queda con un release publicado y sin
     * ningún respaldo legal.
     */
    @Test
    void no_se_saca_el_contrato_que_respalda_un_release_publicado() throws Exception {
        long artista = artista();
        long release = releaseDe(artista);
        long contrato = idDe(cargarContrato(artista, release), "\"idContrato\":");
        publicar(release, null).andExpect(status().isOk());

        mvc.perform(delete("/api/contratos/" + contrato).header("Authorization", comoStaff()))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        Matchers.containsString("unico respaldo del release")));
    }

    /**
     * <b>La rama que tiene que DEJAR PASAR</b>, que es la mitad que `V16` enseñó a
     * no olvidarse: una regla que además rechaza de más es un bug, no una regla
     * estricta. Cargar el contrato correcto y sacar el equivocado es exactamente
     * cómo se corrige un PDF mal subido.
     */
    @Test
    void se_saca_un_contrato_si_queda_otro_sosteniendo_el_release() throws Exception {
        long artista = artista();
        long release = releaseDe(artista);
        long primero = idDe(cargarContrato(artista, release), "\"idContrato\":");
        publicar(release, null).andExpect(status().isOk());

        cargarContrato(artista, release).andExpect(status().isCreated());

        mvc.perform(delete("/api/contratos/" + primero).header("Authorization", comoStaff()))
                .andExpect(status().isNoContent());
    }

    /** Un contrato que no respalda nada publicado se saca sin drama: es un documento, no un asiento. */
    @Test
    void un_contrato_de_un_release_sin_publicar_se_puede_sacar() throws Exception {
        long artista = artista();
        long contrato = idDe(cargarContrato(artista, releaseDe(artista)), "\"idContrato\":");

        mvc.perform(delete("/api/contratos/" + contrato).header("Authorization", comoStaff()))
                .andExpect(status().isNoContent());
    }

    // == Los estados =========================================================

    @Test
    void el_estado_de_un_release_no_retrocede() throws Exception {
        long release = releaseDe(artista());
        cambiarEstado(release, "CONFIRMADO").andExpect(status().isOk());
        cambiarEstado(release, "EN_DISTRIBUCION").andExpect(status().isOk());

        cambiarEstado(release, "CONFIRMADO").andExpect(status().isConflict());
    }

    @Test
    void un_release_se_puede_cancelar_desde_donde_sea() throws Exception {
        long release = releaseDe(artista());

        cambiarEstado(release, "CANCELADO")
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.estado").value("CANCELADO"));
    }

    /**
     * <b>`V18` §1b, y el caso que encontró el agujero.</b> Al dejar CANCELADO fuera
     * de la escalera cae en el {@code ELSE 0}, así que cualquier estado tenía orden
     * mayor y salir de cancelado nunca se veía como un retroceso. Es el retroceso en
     * dos pasos que `V6` ya había cerrado en otras tablas — y con el sello habilita
     * algo concreto: cancelar para escaparse de la protección del contrato, sacarlo,
     * y volver a subir.
     */
    @Test
    void de_cancelado_no_se_vuelve() throws Exception {
        long release = releaseDe(artista());
        cambiarEstado(release, "CANCELADO").andExpect(status().isOk());

        cambiarEstado(release, "CONFIRMADO")
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value(
                        Matchers.containsString("no vuelve atras")));
    }

    /**
     * Publicar no es un valor del desplegable de estados: tiene su propia acción
     * porque tiene su propia regla. Ofrecerlo acá haría que la regla dura del módulo
     * se cruzara eligiendo una opción de una lista.
     */
    @Test
    void publicar_no_se_hace_desde_el_cambio_de_estado() throws Exception {
        cambiarEstado(releaseDe(artista()), "PUBLICADO")
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        Matchers.containsString("su propia acción")));
    }

    @Test
    void un_release_no_se_borra_ni_por_falta_de_endpoint() throws Exception {
        // No hay DELETE de release y no debería haberlo: `V18` §4 lo prohíbe en la
        // base y dar de baja es CANCELADO. Este caso fija que la ruta no exista.
        mvc.perform(delete("/api/releases/" + releaseDe(artista()))
                .header("Authorization", comoStaff()))
                .andExpect(status().isMethodNotAllowed());
    }

    // == El aviso de la pantalla =============================================

    /**
     * <b>Estos cuatro casos faltaban, y por eso el catálogo entero decía "Sin
     * contrato".</b>
     *
     * <p>Los veintipico de arriba atacan la regla dura y todos entran por el mismo
     * lado: publicar, sacar el contrato, cancelar. Ninguno miraba el listado — que no
     * decide nada, solo avisa — así que cuando {@code ReleaseService.listar} pasó a
     * mapear con el atajo que rellenaba el conteo en cero, no había nada rojo que
     * prenderse. El agujero nunca se abrió: el trigger de `V18` siguió rechazando
     * igual. Lo que se rompió fue el aviso, y un aviso que salta siempre es lo mismo
     * que no tenerlo.
     *
     * <p>La lección es la de §11 con el ámbar de esta misma pantalla: <b>un aviso que
     * no distingue deja de ser un aviso</b>. Por eso el segundo caso es el que
     * importa — con una consulta que devuelva uno para todos, el primero pasa igual.
     */
    @Test
    void el_listado_cuenta_el_contrato_de_cada_release() throws Exception {
        long artista = artista();
        long release = releaseDe(artista);
        cargarContrato(artista, release).andExpect(status().isCreated());

        listar()
                .andExpect(status().isOk())
                .andExpect(jsonPath(enElListado(release, "contratos")).value(1))
                .andExpect(jsonPath(enElListado(release, "tieneContrato")).value(true));
    }

    /**
     * El que de verdad ataca el bug: <b>dos releases del mismo artista y uno solo con
     * contrato</b>. Contar mal parejo —cero para todos, o uno para todos— pasa el
     * caso de arriba y muere acá.
     */
    @Test
    void el_listado_distingue_al_que_tiene_contrato_del_que_no() throws Exception {
        long artista = artista();
        long conContrato = releaseDe(artista);
        long sinContrato = releaseDe(artista);
        cargarContrato(artista, conContrato).andExpect(status().isCreated());

        listar()
                .andExpect(jsonPath(enElListado(conContrato, "contratos")).value(1))
                .andExpect(jsonPath(enElListado(sinContrato, "contratos")).value(0))
                .andExpect(jsonPath(enElListado(sinContrato, "tieneContrato")).value(false));
    }

    /**
     * El segundo camino del respaldo, que es el que una consulta escrita de apuro se
     * come: un contrato general del artista no apunta a ningún release y respalda a
     * todos los suyos. Es la misma definición que {@code release_tiene_contrato()}.
     */
    @Test
    void el_contrato_general_del_artista_cuenta_en_el_listado() throws Exception {
        long artista = artista();
        cargarContrato(artista, null).andExpect(status().isCreated());
        long release = releaseDe(artista);

        listar().andExpect(jsonPath(enElListado(release, "contratos")).value(1));
    }

    /**
     * Y el alta contesta lo mismo que el listado: <b>un release no nace en cero por
     * ser nuevo</b>: si su artista ya tiene contrato general, nace respaldado. Era el
     * mismo error, más chico porque la pantalla recarga después de crear.
     */
    @Test
    void un_release_nuevo_nace_respaldado_por_el_contrato_general_de_su_artista() throws Exception {
        long artista = artista();
        cargarContrato(artista, null).andExpect(status().isCreated());

        crearRelease(artista, "")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.contratos").value(1))
                .andExpect(jsonPath("$.tieneContrato").value(true));
    }

    // == El código correlativo ===============================================

    /**
     * <b>Por encima del más alto, nunca contando filas.</b> Los lanzamientos viejos
     * se cargan a mano (§15), así que el catálogo arranca poblado y desordenado: con
     * {@code count(*) + 1} el próximo código chocaría contra el índice único o se
     * metería en un hueco del medio.
     */
    @Test
    void el_codigo_sale_por_encima_del_mas_alto_que_exista() throws Exception {
        long artista = artista();
        crearRelease(artista, "\"codigoRelease\":\"LJ0900\",").andExpect(status().isCreated());

        crearRelease(artista, "")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.codigoRelease").value("LJ901"));
    }

    /** Un release de 2023 tiene el número que tuvo, no el que le tocaría hoy. */
    @Test
    void el_codigo_se_puede_escribir_a_mano_para_los_viejos() throws Exception {
        crearRelease(artista(), "\"codigoRelease\":\"LJ007\",")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.codigoRelease").value("LJ007"));
    }

    @Test
    void un_codigo_repetido_no_entra() throws Exception {
        long artista = artista();
        crearRelease(artista, "\"codigoRelease\":\"LJ555\",").andExpect(status().isCreated());

        crearRelease(artista, "\"codigoRelease\":\"lj555\",").andExpect(status().isBadRequest());
    }

    // == El archivo ==========================================================

    /**
     * <b>El primer archivo que entra al sistema</b>, y el que obligó a construir el
     * {@code StorageService} que tres módulos esquivaron. Sube, y vuelve a salir por
     * un endpoint que verifica quién pregunta.
     */
    @Test
    void el_contrato_sube_y_se_puede_bajar() throws Exception {
        long artista = artista();
        long contrato = idDe(cargarContrato(artista, null), "\"idContrato\":");

        mvc.perform(get("/api/contratos/" + contrato + "/archivo")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", "application/pdf"))
                // El nombre lo arma el sistema: no se guarda el original, y este le
                // sirve más a quien baja tres contratos seguidos.
                .andExpect(header().string("Content-Disposition",
                        Matchers.containsString("contrato-")));
    }

    /** El sistema mira el contenido, no la extensión: estos archivos se vuelven a servir. */
    @Test
    void un_archivo_que_no_es_pdf_no_entra_aunque_se_llame_pdf() throws Exception {
        mvc.perform(multipart("/api/contratos")
                .file(new MockMultipartFile("archivo", "contrato.pdf", "application/pdf",
                        new byte[] { 'M', 'Z', (byte) 0x90, 0x00 }))
                .param("idArtista", String.valueOf(artista()))
                .header("Authorization", comoStaff()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        Matchers.containsString("mira el contenido")));
    }

    /**
     * Ninguna FK lo impide: {@code id_artista} e {@code id_release} son dos columnas
     * sueltas, así que se puede colgar el contrato de Fulano del release de Mengano
     * y las dos fichas quedan mal en silencio. Es el mismo hueco que {@code PagoService}
     * cierra entre el pagador y lo que paga.
     */
    @Test
    void no_se_cuelga_un_contrato_del_release_de_otro_artista() throws Exception {
        cargarContrato(artista(), releaseDe(artista()))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value(
                        Matchers.containsString("no es de ese artista")));
    }

    // == Dónde sonó ==========================================================

    @Test
    void se_anota_donde_sono_y_la_radio_ordena_antes_que_la_playlist() throws Exception {
        long release = releaseDe(artista());
        anotarAparicion(release, "PLAYLIST", "Techno Bunker").andExpect(status().isCreated());
        anotarAparicion(release, "RADIO", "Radio Metro").andExpect(status().isCreated());

        mvc.perform(get("/api/releases/" + release + "/apariciones")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(2))
                // El orden sale de la columna generada de `V18`, no de un CASE en
                // Java: el Módulo 8 va a leer la misma jerarquía.
                .andExpect(jsonPath("$[0].tipoAparicion").value("RADIO"))
                .andExpect(jsonPath("$[1].tipoAparicion").value("PLAYLIST"));
    }

    /** Una sección vacía no es una falla: "si no lo usan, que no lo usen y fue". */
    @Test
    void un_release_sin_apariciones_devuelve_una_lista_vacia() throws Exception {
        mvc.perform(get("/api/releases/" + releaseDe(artista()) + "/apariciones")
                .header("Authorization", comoStaff()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    // == Permisos ============================================================

    /** §10: "profesores y alumnos sin acceso". */
    @Test
    void un_usuario_comun_no_ve_el_catalogo() throws Exception {
        mvc.perform(get("/api/releases")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    /** §10: "dirección solo consulta". */
    @Test
    void un_directivo_lee_el_catalogo_y_no_lo_escribe() throws Exception {
        String directivo = credencialPara(crear(Rol.DIRECTIVO));

        mvc.perform(get("/api/releases").header("Authorization", directivo))
                .andExpect(status().isOk());

        mvc.perform(post("/api/artistas").header("Authorization", directivo)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"nombreArtistico\":\"No deberia entrar\"}"))
                .andExpect(status().isForbidden());
    }

    /** Y un contrato no se baja sin permiso: tiene datos de un tercero. */
    @Test
    void un_usuario_comun_no_baja_un_contrato() throws Exception {
        long contrato = idDe(cargarContrato(artista(), null), "\"idContrato\":");

        mvc.perform(get("/api/contratos/" + contrato + "/archivo")
                .header("Authorization", credencialPara(crear(Rol.USUARIO))))
                .andExpect(status().isForbidden());
    }

    // =========================================================================

    private ResultActions listar() throws Exception {
        return mvc.perform(get("/api/releases").header("Authorization", comoStaff()));
    }

    /**
     * Un campo de UN release dentro del listado, buscado por id y no por posición.
     *
     * <p>Por índice, cualquier caso que cargue un release más reordena la página y
     * pone en rojo casos que no tienen nada que ver — el orden es por fecha estimada,
     * que acá es null en todos, así que desempata el id descendente.
     */
    private String enElListado(long release, String campo) {
        return "$.contenido[?(@.idRelease == %d)].%s".formatted(release, campo);
    }

    private long artista() throws Exception {
        ResultActions creado = mvc.perform(post("/api/artistas")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombreArtistico":"Artista %s","confirmado":true}
                        """.formatted(UUID.randomUUID())))
                .andExpect(status().isCreated());

        return idDe(creado, "\"idArtista\":");
    }

    private long releaseDe(long artista) throws Exception {
        return idDe(crearRelease(artista, "").andExpect(status().isCreated()), "\"idRelease\":");
    }

    private ResultActions crearRelease(long artista, String codigo) throws Exception {
        return mvc.perform(post("/api/releases")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"idArtista":%d,%s"nombreRelease":"Horizonte","tipoRelease":"SINGLE"}
                        """.formatted(artista, codigo)));
    }

    private ResultActions cargarContrato(long artista, Long release) throws Exception {
        var pedido = multipart("/api/contratos")
                .file(new MockMultipartFile("archivo", "contrato.pdf", "application/pdf", PDF))
                .param("idArtista", String.valueOf(artista))
                .header("Authorization", comoStaff());

        if (release != null) {
            pedido = pedido.param("idRelease", String.valueOf(release));
        }
        return mvc.perform(pedido);
    }

    private ResultActions publicar(long release, String motivo) throws Exception {
        String cuerpo = motivo == null ? "{}" : "{\"motivo\":\"" + motivo + "\"}";

        return mvc.perform(patch("/api/releases/" + release + "/publicacion")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content(cuerpo));
    }

    private ResultActions cambiarEstado(long release, String estado) throws Exception {
        return mvc.perform(patch("/api/releases/" + release + "/estado?estado=" + estado)
                .header("Authorization", comoStaff()));
    }

    private ResultActions anotarAparicion(long release, String tipo, String donde) throws Exception {
        return mvc.perform(post("/api/releases/" + release + "/apariciones")
                .header("Authorization", comoStaff())
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"tipoAparicion":"%s","donde":"%s"}
                        """.formatted(tipo, donde)));
    }

    private long idDe(ResultActions resultado, String clave) throws Exception {
        String cuerpo = resultado.andReturn().getResponse().getContentAsString();
        int desde = cuerpo.indexOf(clave) + clave.length();
        int hasta = cuerpo.indexOf(',', desde);
        return Long.parseLong(cuerpo.substring(desde, hasta).trim());
    }

    private String comoStaff() {
        return credencialPara(crear(Rol.STAFF));
    }

    private Usuario crear(Rol rol) {
        Usuario usuario = new Usuario();
        usuario.setNombre("Prueba");
        usuario.setApellido("Sello" + rol.name());
        usuario.setEmail("sello-" + UUID.randomUUID() + "@lajuanita.local");
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
