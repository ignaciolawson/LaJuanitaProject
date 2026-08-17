package com.lajuanita.backend.venta;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.usuario.dto.Pagina;
import com.lajuanita.backend.venta.dto.AltaVentaRequest;
import com.lajuanita.backend.venta.dto.VentaResumen;

import jakarta.validation.Valid;

/**
 * Módulo 3, pantalla 6 — la venta de equipamiento.
 *
 * <p>Los permisos siguen la fila *"Registrar egreso"* de la matriz de §6, que es
 * la que le corresponde: <b>cargar</b> es ADMIN·STAFF y <b>leer</b> suma
 * DIRECTIVO. La matriz no tiene una fila propia para las ventas, y esta es la
 * lectura fiel de las que sí tiene — el DIRECTIVO ve todo lo financiero y no
 * escribe nada.
 */
@RestController
@RequestMapping("/api/ventas")
public class VentaEquipoController {

    private final VentaEquipoService ventas;

    public VentaEquipoController(VentaEquipoService ventas) {
        this.ventas = ventas;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<VentaResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return ventas.listar(buscar, desde, hasta, pagina, tamanio);
    }

    /**
     * Carga una venta, y su cobro si ya entró.
     *
     * <p><b>No hay PUT ni DELETE</b>, y no es un olvido: `V9` prohíbe borrar y
     * nadie pidió todavía la anulación. Ver {@link VentaEquipoService}.
     */
    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public VentaResumen registrar(@Valid @RequestBody AltaVentaRequest solicitud,
            Authentication quienPide) {
        return ventas.registrar(solicitud, Autoridades.idDe(quienPide));
    }
}
