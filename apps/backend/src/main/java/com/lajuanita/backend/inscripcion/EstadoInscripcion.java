package com.lajuanita.backend.inscripcion;

import java.util.Set;

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
    PAUSADA;

    /**
     * Qué significa que alguien <b>esté cursando</b> algo hoy.
     *
     * <p>Lo usa el filtro por disciplina y nivel del listado de alumnos, que es
     * la herramienta del día a día: filtrar por "DJ" tiene que traer a quien está
     * haciendo DJ, no a quien lo terminó el año pasado. La pregunta histórica
     * —<i>"¿quién hizo DJ alguna vez?"</i>— la contesta la pantalla de
     * Inscripciones, que filtra por estado explícitamente.
     *
     * <p><b>{@link #PAUSADA} cuenta, y es la parte que se discute.</b> Una
     * inscripción pausada sigue siendo un curso empezado con clases sin dar:
     * dejar a esa persona afuera de la lista de DJ la esconde justo de quien
     * tiene que ir a buscarla. {@link #COMPLETADA} y {@link #CANCELADA} no
     * cuentan — una terminó y la otra no va a pasar.
     *
     * <p>Decidido con Ignacio el 2026-08-16.
     */
    public static final Set<EstadoInscripcion> VIGENTES = Set.of(ACTIVA, PAUSADA);
}
