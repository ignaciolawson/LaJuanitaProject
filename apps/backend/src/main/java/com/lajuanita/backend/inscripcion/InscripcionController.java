package com.lajuanita.backend.inscripcion;

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

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.inscripcion.dto.AltaInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.EdicionInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.InscripcionResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * Módulo 1 — Inscripciones. El curso contratado de cada alumno.
 *
 * <p>Todo el módulo es de administración: {@code DIRECTIVO} lee y no escribe,
 * como en el resto del sistema.
 *
 * <p><b>Todavía no existe el portal del profesor.</b> El filtro
 * {@code idProfesor} sirve para que administración mire la agenda de uno, no
 * para que un profesor mire la suya: eso necesita que el propio profesor entre
 * al sistema, y esa pantalla llega con el Módulo 2. Cuando llegue, el
 * {@code id_profesor} que este módulo empieza a cargar es de dónde va a salir.
 */
@RestController
@RequestMapping("/api/inscripciones")
public class InscripcionController {

    private final InscripcionService inscripciones;

    public InscripcionController(InscripcionService inscripciones) {
        this.inscripciones = inscripciones;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<InscripcionResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) Long idAlumno,
            @RequestParam(required = false) Long idProfesor,
            @RequestParam(required = false) Disciplina disciplina,
            @RequestParam(required = false) EstadoInscripcion estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio));
        return Pagina.de(inscripciones.listar(
                buscar, idAlumno, idProfesor, disciplina, estado, paginado));
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public InscripcionResumen porId(@PathVariable Long id) {
        return inscripciones.porId(id);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public InscripcionResumen alta(@Valid @RequestBody AltaInscripcionRequest solicitud) {
        return inscripciones.alta(solicitud);
    }

    /**
     * Edición. Si el nivel baja, el motivo viaja en el cuerpo y el autor sale
     * del token: la firma que exige {@code V9} no se puede dictar desde el
     * cliente.
     */
    @PutMapping("/{id}")
    @PuedeOperar
    public InscripcionResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionInscripcionRequest solicitud,
            Authentication quienPide) {
        return inscripciones.editar(id, solicitud, Autoridades.idDe(quienPide));
    }

    /** Completar, pausar o cancelar. Nunca borra: el historial se conserva. */
    @PatchMapping("/{id}/estado")
    @PuedeOperar
    public InscripcionResumen cambiarEstado(@PathVariable Long id,
            @RequestParam EstadoInscripcion estado) {
        return inscripciones.cambiarEstado(id, estado);
    }
}
