package com.lajuanita.backend.docencia;

/**
 * Cómo viene un alumno, según su profesor.
 *
 * <p>Los tres valores son los que pidió el alcance (§8) y los que sostiene el
 * CHECK de `V1`. <b>Son tres a propósito y no cinco</b>: esto no es una nota
 * —para eso está {@link NotaProfesor}— sino un semáforo que se mira de un
 * vistazo sobre una lista de alumnos. Con más valores deja de leerse.
 *
 * <p>Cada cambio queda fechado, y eso no lo escribe la aplicación sino un
 * trigger (`V14` §2): el dato se lee como <i>"desde cuándo este alumno requiere
 * atención"</i>, así que un sello desactualizado es la diferencia entre "hace
 * tres días" y "hace cuatro meses".
 */
public enum EstadoSeguimiento {

    /** Al día, sin nada para señalar. */
    VA_BIEN,

    /** Algo para mirar: faltas, ritmo, algo que conversar con administración. */
    REQUIERE_ATENCION,

    /**
     * Frenó, pero no se fue.
     *
     * <p>Es del seguimiento y no del alumno: {@code alumno.estado_alumno} y
     * {@code inscripcion.estado} son otras dos cosas. Un profesor puede marcar
     * "en pausa" a alguien cuya inscripción sigue activa — de hecho es el caso
     * que más importa, porque es el que hay que ir a buscar.
     */
    EN_PAUSA
}
