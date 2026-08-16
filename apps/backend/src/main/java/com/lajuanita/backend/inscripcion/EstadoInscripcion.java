package com.lajuanita.backend.inscripcion;

/**
 * Estado de la inscripción. Coincide con el CHECK
 * {@code inscripcion_estado_valido}.
 *
 * <p>{@link #ACTIVA} es el estado que mira el índice único parcial
 * {@code inscripcion_una_activa_por_disciplina}: se puede tener DJ y mentoría a
 * la vez, nunca dos niveles de la misma disciplina (P3). Las demás no ocupan
 * lugar, así que un alumno puede acumular todas las {@link #COMPLETADA} que
 * quiera.
 */
public enum EstadoInscripcion {

    /** Cursando. Es la única que reserva el cupo de su disciplina. */
    ACTIVA,

    /** Se dictaron las clases contratadas. */
    COMPLETADA,

    /** Se dio de baja. El historial queda: acá nada se borra. */
    CANCELADA,

    /** Frenada por un tiempo, con las clases que le quedaban intactas. */
    PAUSADA
}
