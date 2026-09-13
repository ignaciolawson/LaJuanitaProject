package com.lajuanita.backend.cliente;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.cliente.dto.ClienteResumen;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * {@code /api/clientes} — la pantalla de Clientes (P77 · 3). Sólo lectura, y
 * para quien administra: es la lista de todos los que le pagaron al estudio,
 * con su contacto.
 */
@RestController
@RequestMapping("/api/clientes")
public class ClienteController {

    private final ClienteService clientes;

    public ClienteController(ClienteService clientes) {
        this.clientes = clientes;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<ClienteResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio));
        return Pagina.de(clientes.listar(buscar, paginado));
    }
}
