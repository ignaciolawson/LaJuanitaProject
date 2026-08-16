package com.lajuanita.backend.sala;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.sala.dto.AltaBloqueoRequest;
import com.lajuanita.backend.sala.dto.BloqueoResumen;

import jakarta.validation.Valid;

/**
 * Módulo 2, pantalla 3 — bloqueo de sala.
 *
 * <p>Mantenimiento, un evento, una refacción: la sala deja de aceptar reservas
 * mientras dure. Es una de las reglas duras del alcance (§5) y la única que
 * todavía no tenía por dónde entrar — la tabla existe desde `V1` y los dos
 * triggers que la hacen valer también, pero no había forma de cargar una fila.
 *
 * <p>Escribir es {@code @PuedeOperar} (ADMIN·STAFF), como manda la matriz de §5:
 * el DIRECTIVO ve qué salas están fuera de servicio y no las bloquea.
 */
@RestController
@RequestMapping("/api/bloqueos")
public class BloqueoSalaController {

    private final BloqueoSalaService bloqueos;

    public BloqueoSalaController(BloqueoSalaService bloqueos) {
        this.bloqueos = bloqueos;
    }

    /** Por defecto los que todavía tienen efecto. Bajá {@code desde} para el histórico. */
    @GetMapping
    @PuedeLeerAdministracion
    public List<BloqueoResumen> listar(
            @RequestParam(required = false)
            @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) Long idSala) {

        return bloqueos.listar(desde, idSala);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public BloqueoResumen alta(@Valid @RequestBody AltaBloqueoRequest solicitud,
            Authentication quienPide) {
        return bloqueos.alta(solicitud, Autoridades.idDe(quienPide));
    }

    /** Desbloquear. Acá sí se borra: un bloqueo no es historial de nada. */
    @DeleteMapping("/{id}")
    @PuedeOperar
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void eliminar(@PathVariable Long id) {
        bloqueos.eliminar(id);
    }
}
