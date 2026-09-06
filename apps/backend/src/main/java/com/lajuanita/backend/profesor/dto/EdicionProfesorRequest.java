package com.lajuanita.backend.profesor.dto;

import jakarta.validation.constraints.Size;

/**
 * Editar la relación de profesor: su especialidad y si sigue dando clases.
 *
 * <p><b>{@code activo} es {@code Boolean} y no {@code boolean}</b>, como todo
 * booleano de un request en este proyecto: Jackson no puede completar el
 * constructor canónico de un record cuando la propiedad no viene, y un
 * formulario que omite una casilla —lo normal cuando está en falso— se comería
 * un 400 que no explica nada. Ausente se lee como "no lo toques".
 *
 * <p>⚠️ <b>Dar de baja a un profesor NO borra la fila</b>, y por eso esto es un
 * booleano y no un DELETE. {@code ProfesorRepository.existsByUsuarioId} —la
 * puerta del portal del profesor— pregunta por la existencia de la fila y no por
 * {@code activo}, justamente para que quien dejó de dar clases pueda seguir
 * viendo el historial de las que dictó. Borrarla le sacaría el acceso a su
 * propio pasado, y además dejaría clases apuntando a nadie.
 */
public record EdicionProfesorRequest(

        @Size(max = 150)
        String especialidad,

        Boolean activo) {
}
