package com.lajuanita.backend.inscripcion;

/**
 * Nivel del curso que se está haciendo. Coincide con el CHECK
 * {@code inscripcion_nivel_valido}.
 *
 * <p><b>Por qué no reusa {@code NivelIngreso}</b>, que tiene estos mismos tres
 * valores: son dos escalas distintas que hoy coinciden. {@code alumno
 * .nivel_ingreso} es con qué nivel entró la persona al estudio —una sola vez,
 * en su ficha— y {@code inscripcion.nivel} es el nivel de <i>este</i> curso, que
 * cambia con cada inscripción. El esquema las modela separadas (son dos CHECK
 * distintos) y acá se sigue esa forma: unificarlas ata dos cosas que pueden
 * moverse por motivos distintos.
 *
 * <p>El orden no es decorativo: lo usa {@link #esRetrocesoDesde(Nivel)}, y tiene
 * que coincidir con el {@code CASE} de {@code verificar_baja_de_nivel_firmada}
 * en {@code V9}. Si acá se agrega un nivel, se agrega también allá.
 */
public enum Nivel {

    INICIAL(1),
    INTERMEDIO(2),
    AVANZADO(3);

    private final int orden;

    Nivel(int orden) {
        this.orden = orden;
    }

    /**
     * ¿Pasar de {@code anterior} a este nivel es bajar?
     *
     * <p>Poner o sacar el nivel <b>no</b> es retroceder: es completar una ficha.
     * Es la misma excepción que hace el trigger de {@code V9}, y por eso un
     * {@code anterior} nulo devuelve {@code false}.
     */
    public boolean esRetrocesoDesde(Nivel anterior) {
        return anterior != null && this.orden < anterior.orden;
    }
}
