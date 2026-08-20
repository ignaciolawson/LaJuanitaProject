package com.lajuanita.backend.sello;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.sello.dto.AltaArtistaRequest;
import com.lajuanita.backend.sello.dto.ArtistaResumen;
import com.lajuanita.backend.sello.dto.ContratoResumen;

import jakarta.validation.Valid;

/**
 * Las fichas de los artistas.
 *
 * <p><b>El listado no pagina y es la misma decisión que `/api/profesores`</b>: lo
 * acota con cuánta gente firmó el sello, no cuánto crece el negocio, y alimenta el
 * selector del alta de un release. Paginar un selector lo empeora.
 *
 * <p><b>No hay DELETE ni baja.</b> Ver {@code ArtistaService}: `artista` no tiene
 * columna de estado y no se le inventa una desde el servicio.
 */
@RestController
@RequestMapping("/api/artistas")
public class ArtistaController {

    private final ArtistaService artistas;
    private final ContratoService contratos;

    public ArtistaController(ArtistaService artistas, ContratoService contratos) {
        this.artistas = artistas;
        this.contratos = contratos;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public List<ArtistaResumen> listar(@RequestParam(required = false) String buscar) {
        return artistas.listar(buscar);
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public ArtistaResumen porId(@PathVariable Long id) {
        return artistas.porId(id);
    }

    @GetMapping("/{id}/contratos")
    @PuedeLeerAdministracion
    public List<ContratoResumen> contratos(@PathVariable Long id) {
        return contratos.delArtista(id);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ArtistaResumen crear(@Valid @RequestBody AltaArtistaRequest pedido) {
        return artistas.crear(pedido);
    }

    @PutMapping("/{id}")
    @PuedeOperar
    public ArtistaResumen editar(@PathVariable Long id, @Valid @RequestBody AltaArtistaRequest pedido) {
        return artistas.editar(id, pedido);
    }
}
