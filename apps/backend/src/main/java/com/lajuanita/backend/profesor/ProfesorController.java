package com.lajuanita.backend.profesor;

import java.util.List;

import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.profesor.dto.ProfesorResumen;

/**
 * Los profesores, para asignarlos a una inscripción.
 *
 * <p><b>Es solo de lectura, y va a serlo un rato.</b> Un profesor se crea hoy
 * dándole la relación a un {@code usuario}, y esa pantalla todavía no existe: el
 * alta y la baja llegan con el Módulo 2, junto con la agenda del profesor. Este
 * endpoint existe porque sin él la inscripción no puede nombrar a su profe, y
 * {@code inscripcion.id_profesor} es justamente lo que sostiene el <i>"cada
 * profesor ve solo sus alumnos"</i> (P6).
 *
 * <p>Por defecto devuelve solo los activos: asignarle un curso a alguien que ya
 * no da clases es un error de carga que conviene no ofrecer. Con
 * {@code ?incluirInactivos=true} vuelven todos, que es lo que necesita una
 * pantalla que muestre inscripciones viejas.
 */
@RestController
@RequestMapping("/api/profesores")
public class ProfesorController {

    private final ProfesorRepository profesores;

    public ProfesorController(ProfesorRepository profesores) {
        this.profesores = profesores;
    }

    @GetMapping
    @PuedeLeerAdministracion
    @Transactional(readOnly = true)
    public List<ProfesorResumen> listar(
            @RequestParam(defaultValue = "false") boolean incluirInactivos) {
        return profesores.listar(incluirInactivos).stream().map(ProfesorResumen::de).toList();
    }
}
