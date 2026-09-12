package com.lajuanita.backend.inscripcion;

import java.util.Set;

/**
 * Estado de la inscripción. Coincide con el CHECK
 * {@code inscripcion_estado_valido}.
 *
 * <p>{@link #ACTIVA} y {@link #PREINSCRIPTA} son los estados que mira el índice
 * único parcial {@code inscripcion_una_activa_por_disciplina}: se puede tener
 * DJ y mentoría a la vez, nunca dos niveles de la misma disciplina (P3), ni una
 * preinscripción encima de un curso abierto. Las demás no ocupan lugar, así que
 * un alumno puede acumular todas las {@link #COMPLETADA} que quiera.
 */
public enum EstadoInscripcion {

    /**
     * Anotada y sin señar todavía (`V30`, P59 · P60 · P72). Tiene 24 horas
     * ({@code vence_preinscripcion}) y <b>no cursa</b>: no está en
     * {@link #VIGENTES}, así que no cuenta como alumno en el listado ni en el
     * tablero. Se sale sólo a {@link #ACTIVA} —cuando entra un pago cobrado, ver
     * {@code Inscripcion#pasarA}— o a {@link #CANCELADA}; al vencer <b>no</b> se
     * cancela sola, avisa (P61). No hay cupo, así que no aparta nada: es la
     * inscripción diciendo "todavía no es formal".
     */
    PREINSCRIPTA,

    /** Cursando. Junto con la preinscripta, ocupa el lugar de su disciplina. */
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

    /**
     * Las que ocupan el lugar de su disciplina: lo que el índice único parcial
     * {@code inscripcion_una_activa_por_disciplina} mira desde `V30`. Es una
     * lista distinta de {@link #VIGENTES} a propósito — PAUSADA cursa y no
     * ocupa (§12 · C1 lo encontró); PREINSCRIPTA ocupa y no cursa. Si las dos
     * se escriben como una, una de las dos definiciones miente.
     */
    public static final Set<EstadoInscripcion> ABIERTAS = Set.of(ACTIVA, PREINSCRIPTA);
}
