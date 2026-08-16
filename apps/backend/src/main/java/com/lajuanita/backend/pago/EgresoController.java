package com.lajuanita.backend.pago;

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
import com.lajuanita.backend.pago.dto.AltaEgresoRequest;
import com.lajuanita.backend.pago.dto.EgresoResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * Módulo 3, pantalla 5 — la plata que sale.
 *
 * <p>Ruta propia y controller propio aunque el service viva en el mismo paquete:
 * {@code /api/egresos} es otra cosa que {@code /api/pagos} y la matriz de §6 les
 * da permisos distintos de lectura — la caja la ve el DIRECTIVO, y el listado de
 * egresos también.
 */
@RestController
@RequestMapping("/api/egresos")
public class EgresoController {

    private final EgresoService egresos;

    public EgresoController(EgresoService egresos) {
        this.egresos = egresos;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<EgresoResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return egresos.listar(buscar, desde, hasta, pagina, tamanio);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public EgresoResumen registrar(@Valid @RequestBody AltaEgresoRequest solicitud,
            Authentication quienPide) {
        return egresos.registrar(solicitud, Autoridades.idDe(quienPide));
    }
}
