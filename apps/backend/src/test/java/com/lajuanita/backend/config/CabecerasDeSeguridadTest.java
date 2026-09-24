package com.lajuanita.backend.config;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

/**
 * Las cabeceras de seguridad que manda la API.
 *
 * <p>⚠️ <b>Existe por `CS-10`</b> (barrida de ciberseguridad de septiembre 2026).
 * Estas cabeceras estaban <b>heredadas de los defaults de Spring Security</b>:
 * {@code SeguridadConfig} no tocaba {@code .headers(...)}, así que llegaban
 * solas. Funcionaba — y <b>dependía de que nadie tocara esa línea</b>: un
 * {@code .headers(h -> h.disable())} futuro las apagaba sin que fallara nada.
 *
 * <p>La que más pesa es {@code X-Content-Type-Options: nosniff}, porque es lo que
 * cierra el caso que la Fase 3 dejó anotado: los archivos del sistema se sirven
 * con {@code Content-Disposition: inline}, así que un archivo <b>políglota</b>
 * —bytes de PDF al principio y HTML adentro— se re-interpretaría como documento
 * si el navegador tuviera permiso para adivinar el tipo. Con {@code nosniff}, el
 * {@code Content-Type} que declara el servidor es el único que vale.
 *
 * <p><b>Este archivo es la mitad que hace que declararlas sirva de algo.</b>
 * Declararlas sin un caso que las mire deja el mismo problema con otra cara: se
 * pueden volver a borrar en silencio.
 *
 * <p>Se mide contra {@code POST /api/auth/login} porque es público: no hace falta
 * credencial, así que el caso prueba las cabeceras y nada más. El cuerpo vacío da
 * 400, que alcanza — lo que se mira es lo que viaja al lado de la respuesta, no
 * la respuesta.
 */
@SpringBootTest
@AutoConfigureMockMvc
class CabecerasDeSeguridadTest {

    @Autowired
    private MockMvc mvc;

    @Test
    void la_api_manda_sus_cabeceras_de_seguridad() throws Exception {
        mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                // El navegador no adivina el tipo: es lo que sostiene el
                // `inline` con el que se sirven contratos y comprobantes.
                .andExpect(header().string("X-Content-Type-Options", "nosniff"))
                // Nadie mete la API en un iframe. `frame-ancestors` de la CSP es
                // la versión moderna y va en el proxy (SEC-07); esto es el piso.
                .andExpect(header().string("X-Frame-Options", "DENY"))
                // Ninguna respuesta de la API se guarda en un caché compartido:
                // acá viajan estados de cuenta, deudas y datos de alumnos.
                .andExpect(header().string("Cache-Control",
                        "no-cache, no-store, max-age=0, must-revalidate"));
    }
}
