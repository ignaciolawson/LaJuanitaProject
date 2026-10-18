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

    DJ("DJ"),
    PRODUCCION("Producción"),
    MENTORIA("Mentoría");

    private final String nombre;

    Disciplina(String nombre) {
        this.nombre = nombre;
    }

    /**
     * Cómo se le nombra a una persona, en todo texto que arme el servidor
     * (notificaciones, mensajes de error, el "qué salda" de un pago).
     *
     * <p>El enum crudo no se le muestra a nadie: <i>"se canceló tu preinscripción
     * a PRODUCCION"</i> le llegaba a un alumno hasta la barrida de textos del
     * 2026-10-18. Es la misma tabla que el front tiene en
     * {@code NOMBRE_DE_DISCIPLINA}; las dos existen porque cada lado escribe sus
     * propios textos.
     */
    public String nombre() {
        return nombre;
    }
}
