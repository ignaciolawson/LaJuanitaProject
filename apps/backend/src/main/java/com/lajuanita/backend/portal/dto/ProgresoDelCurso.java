package com.lajuanita.backend.portal.dto;

import java.time.LocalDate;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.EstadoInscripcion;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.profesor.Profesor;

/**
 * "Mi progreso": en qué nivel estoy y cuántas clases me quedan.
 *
 * <p><b>Las clases restantes se cuentan con la misma consulta que la pantalla de
 * administración</b> ({@code InscripcionService.clasesConsumidas}), no con una
 * propia. Es la misma razón por la que esa consulta tiene que decir lo mismo que
 * `V9` §5: si las dos cuentas se separan, el alumno lee que le quedan tres clases
 * y la base rechaza la próxima. Ahora son tres pantallas mirando una definición.
 *
 * <p><b>No lleva plata.</b> El precio y el saldo de este mismo curso están en Mi
 * estado de cuenta, que es la pantalla que habla de dinero; acá contestan otra
 * pregunta. Tampoco lleva {@code notas}, que es donde administración escribe lo
 * suyo sobre la inscripción.
 */
public record ProgresoDelCurso(
        Long idInscripcion,
        Disciplina disciplina,
        Nivel nivel,
        /** Null es válido: una inscripción puede no tener profe asignado. */
        String profesor,
        int clasesContratadas,
        int clasesConsumidas,
        int clasesRestantes,
        LocalDate fechaInicio,
        EstadoInscripcion estado) {

    public static ProgresoDelCurso de(Inscripcion inscripcion, int consumidas) {
        Profesor profesor = inscripcion.getProfesor();
        int contratadas = inscripcion.getClasesContratadas();

        return new ProgresoDelCurso(
                inscripcion.getId(),
                inscripcion.getDisciplina(),
                inscripcion.getNivel(),
                profesor == null ? null
                        : profesor.getUsuario().getNombre() + " " + profesor.getUsuario().getApellido(),
                contratadas,
                consumidas,
                // Nunca negativo, por lo mismo que en `InscripcionResumen`: "te
                // quedan -2 clases" no es información.
                Math.max(contratadas - consumidas, 0),
                inscripcion.getFechaInicio(),
                inscripcion.getEstado());
    }
}
