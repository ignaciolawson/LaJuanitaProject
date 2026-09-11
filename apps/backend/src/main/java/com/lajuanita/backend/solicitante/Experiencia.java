package com.lajuanita.backend.solicitante;

import com.lajuanita.backend.inscripcion.Nivel;

/**
 * Cuánta experiencia trae quien pide un programa (`V29`, P64).
 *
 * <p><b>Es lo que el formulario PREGUNTA, no un nivel.</b> La landing no ofrece
 * inicial/intermedio/avanzado a propósito —<i>"en vez de obligar a la persona a
 * autodiagnosticarse antes de leer nada"</i>—, y P64 respeta eso: la ficha guarda
 * la respuesta tal cual, y el nivel se <b>sugiere</b> al inscribir, editable por
 * quien inscribe. Guardar acá el nivel ya traducido sería tomar la decisión en
 * la landing y esconderla.
 *
 * <p>Los valores son los del CHECK {@code solicitante_experiencia_valida}.
 */
public enum Experiencia {

    /** "Arranco de cero." */
    CERO,

    /** "Algo, por mi cuenta." */
    ALGO,

    /**
     * "Sí, ya toco/produzco."
     *
     * <p>Es también lo que manda el formulario de la mentoría, fijo: su público
     * <b>ya toca</b> (P67), así que no pregunta esto — pregunta hace cuánto, y
     * eso va a {@code detalle}.
     */
    TOCA;

    /**
     * El nivel con el que arranca el alta desde el buzón (P64 ⏳).
     *
     * <p><i>cero</i> → INICIAL, <i>algo</i> → INICIAL, <i>ya toca</i> →
     * INTERMEDIO. Es una <b>sugerencia</b>: el formulario del alta la muestra
     * elegida y quien inscribe la cambia si quiere (Q9). Está acá y no en la
     * pantalla porque es una decisión del negocio, y las dos pantallas que
     * inscriben tienen que arrancar del mismo valor.
     */
    public Nivel nivelSugerido() {
        return this == TOCA ? Nivel.INTERMEDIO : Nivel.INICIAL;
    }
}
