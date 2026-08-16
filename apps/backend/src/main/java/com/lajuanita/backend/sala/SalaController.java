package com.lajuanita.backend.sala;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.sala.dto.SalaResumen;
import com.lajuanita.backend.sala.dto.TipoUsoResumen;

/**
 * Las salas y los tipos de uso: el catálogo con el que se arma el calendario.
 *
 * <p>Solo lectura. Los datos los carga `V2` y la pantalla para editarlos —que
 * tendría sentido el día que compren una silla para la cabina de grabación— no
 * está pedida todavía.
 *
 * <p>Son dos rutas y un solo controller porque son la misma pregunta partida en
 * dos: <i>qué columnas tiene la grilla y de qué colores se pinta</i>.
 */
@RestController
public class SalaController {

    private final SalaService catalogo;

    public SalaController(SalaService catalogo) {
        this.catalogo = catalogo;
    }

    /** Las salas, con qué se puede hacer en cada una. */
    @GetMapping("/api/salas")
    @PuedeLeerAdministracion
    public List<SalaResumen> salas(@RequestParam(defaultValue = "false") boolean incluirInactivas) {
        return catalogo.listarSalas(incluirInactivas);
    }

    @GetMapping("/api/tipos-uso")
    @PuedeLeerAdministracion
    public List<TipoUsoResumen> tiposDeUso(
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return catalogo.listarTiposDeUso(incluirInactivos);
    }
}
