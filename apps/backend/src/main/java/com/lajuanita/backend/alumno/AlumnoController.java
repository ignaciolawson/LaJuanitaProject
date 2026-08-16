package com.lajuanita.backend.alumno;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.alumno.AlumnoService.AltaAlumnoResultado;
import com.lajuanita.backend.alumno.dto.AltaAlumnoRequest;
import com.lajuanita.backend.alumno.dto.AlumnoResumen;
import com.lajuanita.backend.alumno.dto.EdicionAlumnoRequest;
import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * Módulo 1 — Gestión de Alumnos. Reemplaza el Notion de Micaela.
 *
 * <p>La disciplina, el nivel, el precio y el profesor asignado <b>no están acá</b>:
 * viven en {@code inscripcion}, que tiene su propio controller desde el
 * 2026-08-16. Un alumno puede cursar DJ y producción a la vez, así que ninguno
 * de esos cuatro es un campo del alumno.
 *
 * <p>Por lo mismo, "el profesor ve solo sus alumnos" tampoco sale de acá: esa
 * relación es {@code inscripcion.id_profesor}.
 */
@RestController
@RequestMapping("/api/alumnos")
public class AlumnoController {

    private final AlumnoService alumnos;

    public AlumnoController(AlumnoService alumnos) {
        this.alumnos = alumnos;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<AlumnoResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) EstadoAlumno estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio));
        return Pagina.de(alumnos.listar(buscar, estado, paginado));
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public AlumnoResumen porId(@PathVariable Long id) {
        return alumnos.porId(id);
    }

    /**
     * Alta. Acepta una persona que ya tiene cuenta o una cuenta a crear, y en
     * el segundo caso devuelve la contraseña temporal para pasarle.
     */
    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public AltaAlumnoResultado alta(@Valid @RequestBody AltaAlumnoRequest solicitud,
            Authentication quienPide) {
        return alumnos.alta(solicitud, Autoridades.esAdmin(quienPide));
    }

    @PutMapping("/{id}")
    @PuedeOperar
    public AlumnoResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionAlumnoRequest solicitud) {
        return alumnos.editar(id, solicitud);
    }

    /** Desactivar o suspender. Conserva todo el historial. */
    @PatchMapping("/{id}/estado")
    @PuedeOperar
    public AlumnoResumen cambiarEstado(@PathVariable Long id, @RequestParam EstadoAlumno estado) {
        return alumnos.cambiarEstado(id, estado);
    }

}
