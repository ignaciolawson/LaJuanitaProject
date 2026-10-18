package com.lajuanita.backend.web;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
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
 * Los errores que Spring genera por su cuenta, en el idioma del resto del
 * sistema.
 *
 * <p>Los mensajes propios de esta API están todos en español rioplatense y son
 * buenos ("No existe el alumno 9999.", "No tenés permiso para hacer esto."),
 * pero los que arma Spring salían en inglés y llegaban tal cual a la pantalla:
 * el cliente HTTP del front copia {@code detail} sin filtrar y las pantallas lo
 * muestran. Una administrativa que no es técnica veía
 * <i>"Failed to convert 'estado' with value: 'NOEXISTE'"</i>.
 *
 * <p>Se vuelve frecuente en cuanto haya filtros en la URL —el calendario del
 * Módulo 2 va a llevar fechas y salas en la query—, donde un enlace mal copiado
 * alcanza.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class ErroresEnEspanolTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private JwtEncoder codificador;

    @Autowired
    private UsuarioRepository usuarios;

    @Test
    void un_cuerpo_ilegible_se_explica_en_espanol() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\": \"alguien@lajuanita.local\""))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("No pudimos leer los datos del formulario."));
    }

    /**
     * Se prueba contra una ruta autenticada y no contra {@code /api/auth/registro}
     * —que es el ejemplo del informe— porque ahí la respuesta es 401 y no 405:
     * la seguridad solo abre el POST de esa ruta y corta antes de que el pedido
     * llegue al dispatcher. Está bien que así sea: abrir la ruta entera
     * expondría métodos que no existen.
     */
    @Test
    void el_metodo_equivocado_se_explica_en_espanol() throws Exception {
        mvc.perform(delete("/api/usuarios/1").header("Authorization", comoAdmin()))
                .andExpect(status().isMethodNotAllowed())
                .andExpect(jsonPath("$.detail").value("Esa dirección no acepta este tipo de pedido."));
    }

    /**
     * Y sin nombrar el parámetro interno: el mensaje viejo publicaba cómo se
     * llaman las cosas del otro lado.
     */
    @Test
    void un_parametro_con_el_tipo_equivocado_se_explica_en_espanol() throws Exception {
        String credencial = comoAdmin();

        mvc.perform(get("/api/alumnos/abc").header("Authorization", credencial))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ese dato no tiene un valor válido."));

        mvc.perform(get("/api/alumnos?estado=NOEXISTE").header("Authorization", credencial))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("Ese dato no tiene un valor válido."));
    }

    /**
     * El desagüe (ARQ-04). Todo lo que no resuelve ningún {@code @ExceptionHandler}
     * sale reenviado a {@code /error}, y ahí contestaba el
     * {@code BasicErrorController} de Spring con el OTRO formato:
     * {@code {"timestamp":…,"status":999,"error":"None"}} — sin {@code detail},
     * que es el único campo que el front lee. Medido contra la API corriendo, no
     * deducido.
     *
     * <p>Se pide {@code /error} directamente porque es lo que se puede pedir: es
     * {@code permitAll} —tiene que serlo, es un reenvío interno— así que este es
     * además el peor caso, el de alguien entrando de afuera sin ningún error
     * previo que contar.
     */
    @Test
    void el_desague_de_errores_tambien_contesta_en_el_formato_de_la_API() throws Exception {
        mvc.perform(get("/error"))
                .andExpect(jsonPath("$.detail").exists())
                .andExpect(jsonPath("$.title").exists())
                // Los dos campos del formato viejo, que es de lo que se trata
                // este hallazgo: no tienen que estar más.
                .andExpect(jsonPath("$.timestamp").doesNotExist())
                .andExpect(jsonPath("$.error").doesNotExist());
    }

    // -------------------------------------------------------------------------

    /**
     * Los errores propios de Spring MVC (barrida de textos del 2026-10-18). Con
     * ProblemDetail activado los contestaba Spring en inglés y nombrando cosas
     * internas: {@code "No static resource api/no-existe."} — el texto que llegó
     * a la pantalla en la §17 con un backend viejo — y {@code "Required parameter
     * 'desde' is not present."}.
     */
    @Test
    void una_ruta_que_no_existe_y_un_parametro_que_falta_se_explican_en_espanol() throws Exception {
        String credencial = comoAdmin();

        mvc.perform(get("/api/no-existe").header("Authorization", credencial))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.detail").value("No encontramos esa dirección."));

        mvc.perform(get("/api/reservas").header("Authorization", credencial))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.detail").value("No pudimos interpretar el pedido."));
    }

    /**
     * Un {@code @Size} sin {@code message} propio. Sin
     * {@code ValidationMessages.properties} el texto salía en el idioma de la
     * máquina: en el servidor, "size must be between 0 and 80" debajo del campo.
     */
    @Test
    void un_largo_maximo_sin_mensaje_propio_se_explica_en_espanol() throws Exception {
        String largo = "x".repeat(81);

        mvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/me/perfil")
                        .header("Authorization", comoAdmin())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"nombre\":\"" + largo + "\",\"apellido\":\"Prueba\",\"telefono\":null}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").value("Es demasiado largo: el máximo es 80 caracteres."));
    }

    private String comoAdmin() {
        Usuario admin = new Usuario();
        admin.setNombre("Prueba");
        admin.setApellido("Errores");
        admin.setEmail("errores-" + UUID.randomUUID() + "@lajuanita.local");
        admin.setPasswordHash("$2a$10$noSeUsaEnEsteTest000000000000000000000000000000000000");
        admin.setRol(Rol.ADMIN);
        usuarios.save(admin);

        Instant ahora = Instant.now();
        JwtClaimsSet reclamos = JwtClaimsSet.builder()
                .issuer("la-juanita")
                .issuedAt(ahora)
                .expiresAt(ahora.plusSeconds(3600))
                .subject(String.valueOf(admin.getId()))
                .claim("rol", admin.getRol().name())
                .build();

        return "Bearer " + codificador.encode(JwtEncoderParameters.from(
                JwsHeader.with(MacAlgorithm.HS256).build(), reclamos)).getTokenValue();
    }
}
