package com.lajuanita.backend.inscripcion;

/**
 * Qué se cursa. Coincide con el CHECK {@code inscripcion_disciplina_valida}.
 *
 * <p>Cada una trae la cantidad de clases que el curso tiene <b>de fábrica</b>,
 * confirmada por el cliente el 2026-08-14 ({@code platform.md} §13, P34): el
 * curso es cerrado, de 1:30 semanal, y termina cuando se dictaron todas.
 *
 * <p><b>La mentoría no tiene número estándar</b>, y eso no es un olvido: se
 * arma a medida. Por eso {@link #clasesEstandar()} devuelve {@code null} ahí y
 * el alta obliga a decir cuántas son.
 */
public enum Disciplina {

    DJ(8),
    PRODUCCION(16),
    MENTORIA(null);

    private final Integer clasesEstandar;

    Disciplina(Integer clasesEstandar) {
        this.clasesEstandar = clasesEstandar;
    }

    /** Clases del curso cerrado, o {@code null} si la disciplina no tiene una. */
    public Integer clasesEstandar() {
        return clasesEstandar;
    }
}
