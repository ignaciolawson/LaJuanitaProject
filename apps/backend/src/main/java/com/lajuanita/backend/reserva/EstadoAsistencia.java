package com.lajuanita.backend.reserva;

/**
 * Si el participante fue a la clase. Coincide con el CHECK
 * {@code participante_asistencia_valida}.
 *
 * <p><b>Cuál consume la clase contratada y cuál no es la regla del negocio</b>,
 * y está en `V9` §5: consume todo salvo {@link #CANCELADA} —y salvo que la
 * reserva entera se haya caído—. Es decir: **{@link #AUSENTE} consume**. Faltar
 * sin avisar no devuelve la clase, y eso es exactamente lo que le da sentido a
 * {@link #AUSENTE_JUSTIFICADO} como estado aparte.
 */
public enum EstadoAsistencia {

    /** Todavía no se dictó, o nadie tomó lista. */
    PENDIENTE,

    PRESENTE,

    /** Faltó sin avisar. <b>Consume la clase.</b> */
    AUSENTE,

    /** Faltó avisando. Consume igual — la clase se dictó. */
    AUSENTE_JUSTIFICADO,

    /** Se lo sacó de esta clase. <b>No consume.</b> */
    CANCELADA
}
