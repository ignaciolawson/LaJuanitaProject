package com.lajuanita.backend.inscripcion;

/**
 * Qué se cursa. Coincide con el CHECK {@code inscripcion_disciplina_valida} —y
 * con el de {@code programa}, que es la tabla que desde `V28` dice cuántas
 * clases trae cada una y a cuánto.
 *
 * <p>Hasta `V28` este enum cargaba la cantidad de clases de fábrica (DJ 8,
 * Producción 16, mentoría sin estándar — §13, P34), y el front tenía una copia
 * para mostrarla. Eran dos definiciones de un dato que además nadie podía
 * cambiar sin un deploy. Ahora vive en una fila de {@code programa} que Mica
 * edita, y esto volvió a ser lo que es: la lista de valores del CHECK.
 */
public enum Disciplina {

    DJ,
    PRODUCCION,
    MENTORIA
}
