package com.lajuanita.backend.usuario;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import java.util.UUID;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

/**
 * Registro público: {@code POST /api/auth/registro}.
 *
 * <p>Es el primer endpoint del sistema abierto a internet que ESCRIBE en la
 * base. El login solo lee; este crea filas. Merece la misma desconfianza.
 *
 * <p>Los tests van {@link Transactional} para que las cuentas que crean se
 * deshagan al terminar: si no, cada corrida dejaría basura en la base de
 * desarrollo y el índice único de email haría fallar la siguiente.
 */
@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class RegistroTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private UsuarioRepository usuarios;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    void una_persona_se_crea_la_cuenta_y_queda_logueada() throws Exception {
        String email = emailNuevo();

        mvc.perform(registro(email, "1155" + sufijo(), "unaClaveLarga"))
                .andExpect(status().isCreated())
                // Devuelve la credencial: no hay que volver a escribir todo
                // para entrar.
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.usuario.email").value(email))
                .andExpect(jsonPath("$.usuario.nombre").value("Ana"))
                .andExpect(jsonPath("$.usuario.apellido").value("Gómez"))
                // Se creó una CUENTA, no un alumno. Es toda la decisión de
                // arquitectura del sistema en una línea: quien alquila una
                // cabina tiene cuenta y nunca cursó nada.
                .andExpect(jsonPath("$.usuario.esAlumno").value(false))
                .andExpect(jsonPath("$.usuario.esProfesor").value(false))
                // Eligió su contraseña recién ahora: no hay nada que cambiar.
                .andExpect(jsonPath("$.usuario.debeCambiarPassword").value(false))
                .andExpect(jsonPath("$.usuario.passwordHash").doesNotExist());
    }

    @Test
    void la_contrasena_se_guarda_hasheada_y_nunca_en_texto_plano() throws Exception {
        String email = emailNuevo();

        mvc.perform(registro(email, "1155" + sufijo(), "unaClaveLarga"))
                .andExpect(status().isCreated());

        Usuario creado = usuarios.findByEmailIgnoreCase(email).orElseThrow();

        assertThat(creado.getPasswordHash()).startsWith("$2a$");
        assertThat(creado.getPasswordHash()).doesNotContain("unaClaveLarga");
        assertThat(passwordEncoder.matches("unaClaveLarga", creado.getPasswordHash())).isTrue();
    }

    /**
     * El test más importante del archivo. El endpoint es público: si aceptara
     * el rol del cuerpo, cualquiera con internet se daría ADMIN.
     */
    @Test
    void no_se_puede_pedir_un_rol_al_registrarse() throws Exception {
        String email = emailNuevo();

        mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Intruso","apellido":"Intruso","email":"%s",
                         "telefono":"1155%s","password":"unaClaveLarga","rol":"ADMIN"}
                        """.formatted(email, sufijo())))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.usuario.rol").value("USUARIO"));

        assertThat(usuarios.findByEmailIgnoreCase(email).orElseThrow().getRol()).isEqualTo(Rol.USUARIO);
    }

    /**
     * Deshace a propósito la protección contra enumeración que sí tiene el
     * login, y está decidido así: sin este aviso, quien se registró hace meses
     * queda trabado sin poder entrar ni registrarse de nuevo. Ver
     * {@link DatoDuplicadoException}.
     */
    @Test
    void un_email_ya_registrado_da_409_y_lo_dice_claramente() throws Exception {
        String email = emailNuevo();
        mvc.perform(registro(email, "1155" + sufijo(), "unaClaveLarga")).andExpect(status().isCreated());

        mvc.perform(registro(email, "1155" + sufijo(), "otraClaveLarga"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.email").isNotEmpty());
    }

    /** El email es único sin distinguir mayúsculas: el índice es sobre lower(). */
    @Test
    void un_email_ya_registrado_con_otra_capitalizacion_tambien_choca() throws Exception {
        String email = emailNuevo();
        mvc.perform(registro(email, "1155" + sufijo(), "unaClaveLarga")).andExpect(status().isCreated());

        mvc.perform(registro(email.toUpperCase(), "1155" + sufijo(), "otraClaveLarga"))
                .andExpect(status().isConflict());
    }

    @Test
    void un_telefono_ya_registrado_da_409() throws Exception {
        String telefono = "1155" + sufijo();
        mvc.perform(registro(emailNuevo(), telefono, "unaClaveLarga")).andExpect(status().isCreated());

        mvc.perform(registro(emailNuevo(), telefono, "otraClaveLarga"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.errores.telefono").isNotEmpty());
    }

    @Test
    void faltan_campos_obligatorios() throws Exception {
        mvc.perform(post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.nombre").isNotEmpty())
                .andExpect(jsonPath("$.errores.apellido").isNotEmpty())
                .andExpect(jsonPath("$.errores.email").isNotEmpty())
                .andExpect(jsonPath("$.errores.telefono").isNotEmpty())
                .andExpect(jsonPath("$.errores.password").isNotEmpty());
    }

    @Test
    void una_contrasena_demasiado_corta_se_rechaza() throws Exception {
        mvc.perform(registro(emailNuevo(), "1155" + sufijo(), "corta"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errores.password").isNotEmpty());
    }

    /** Registrarse no requiere credencial: si la exigiera, nadie podría empezar. */
    @Test
    void el_registro_es_publico() throws Exception {
        mvc.perform(registro(emailNuevo(), "1155" + sufijo(), "unaClaveLarga"))
                .andExpect(status().isCreated());
    }

    // -------------------------------------------------------------------------

    private org.springframework.test.web.servlet.RequestBuilder registro(
            String email, String telefono, String password) {
        return post("/api/auth/registro")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                        {"nombre":"Ana","apellido":"Gómez","email":"%s",
                         "telefono":"%s","password":"%s"}
                        """.formatted(email, telefono, password));
    }

    private String emailNuevo() {
        return "prueba-" + UUID.randomUUID() + "@lajuanita.local";
    }

    /** Sufijo numérico para no chocar con el índice único de teléfono. */
    private String sufijo() {
        return String.valueOf(System.nanoTime() % 100_000_000L);
    }
}
