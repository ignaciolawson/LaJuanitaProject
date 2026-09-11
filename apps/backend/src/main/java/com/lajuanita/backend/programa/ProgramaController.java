package com.lajuanita.backend.programa;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.programa.dto.EdicionProgramaRequest;
import com.lajuanita.backend.programa.dto.ProgramaResumen;

import jakarta.validation.Valid;

/**
 * El catálogo de programas: qué se vende, a cuánto, y cuántas clases trae
 * (`V28`, P63).
 *
 * <p>Tres filas y ningún alta: una fila por disciplina, y las disciplinas son
 * un CHECK de la base. Sumar una disciplina es una migración, y la fila del
 * catálogo va en ella. <b>No hay DELETE</b> y la base lo rechaza igual (`V28`
 * §3): se desactiva.
 *
 * <p>{@code DIRECTIVO} lo lee y no lo edita, como todo lo administrativo.
 */
@RestController
@RequestMapping("/api/programas")
public class ProgramaController {

    private final ProgramaService programas;

    public ProgramaController(ProgramaService programas) {
        this.programas = programas;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public List<ProgramaResumen> listar() {
        return programas.listar();
    }

    @PutMapping("/{id}")
    @PuedeOperar
    public ProgramaResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionProgramaRequest cambios) {
        return programas.editar(id, cambios);
    }
}
