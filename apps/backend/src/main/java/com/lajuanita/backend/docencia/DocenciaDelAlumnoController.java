package com.lajuanita.backend.docencia;

import java.util.List;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.docencia.dto.MaterialResumen;
import com.lajuanita.backend.docencia.dto.NotaDeAlumno;

/**
 * El seguimiento de un alumno, visto desde administración.
 *
 * <p><b>Cuelga de {@code /api/alumnos/{id}} y no de {@code /api/me/profesor}</b>
 * porque no se mira desde ninguna relación: se mira desde el rol. Es el sexto
 * bloque de la ficha del alumno de §4 —"notas de profesores + materiales
 * entregados"— y el único que quedaba dibujado como "todavía no disponible".
 *
 * <p>Vive en el paquete {@code docencia} y no en {@code alumno} porque los datos
 * son de este dominio: quien cambie qué es una nota tiene que encontrar todo lo
 * que la lee sin salir del paquete. La ruta es del alumno; el dominio, de acá.
 *
 * <p><b>Es de solo lectura, y va a seguir siéndolo.</b> Administración lee las
 * notas para atender al alumno cuando el profesor no está; escribirlas o
 * corregirlas es del autor —la firma <i>es</i> el dato— y publicar un material es
 * del profesor que lo subió (§8: "el alumno lo ve solo si el profesor lo
 * habilitó"). Un PUT acá le sacaría el sentido a las dos reglas.
 */
@RestController
@RequestMapping("/api/alumnos/{idAlumno}")
public class DocenciaDelAlumnoController {

    private final DocenciaDelAlumnoService docencia;

    public DocenciaDelAlumnoController(DocenciaDelAlumnoService docencia) {
        this.docencia = docencia;
    }

    /** Todas las notas sobre el alumno, firmadas. Regla de §8. */
    @GetMapping("/notas")
    @PuedeLeerAdministracion
    public List<NotaDeAlumno> notas(@PathVariable Long idAlumno) {
        return docencia.notasDe(idAlumno);
    }

    /** Lo que le entregaron, incluido lo que todavía no se publicó. */
    @GetMapping("/materiales")
    @PuedeLeerAdministracion
    public List<MaterialResumen> materiales(@PathVariable Long idAlumno) {
        return docencia.materialesDe(idAlumno);
    }
}
