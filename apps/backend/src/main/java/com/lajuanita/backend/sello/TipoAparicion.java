package com.lajuanita.backend.sello;

/**
 * Dónde sonó un release (P25). Espeja {@code aparicion_tipo_valido}.
 *
 * <p><b>El orden de "popularidad" NO está acá</b>, y no es un olvido: vive en
 * {@code aparicion_release.orden_relevancia}, una columna generada. Si estuviera
 * en este enum —como un campo, o peor, como el orden de declaración— el tablero
 * del Módulo 8 tendría que traerse las filas a Java para ordenarlas, o escribir su
 * propio CASE en SQL. Es la deuda que este proyecto ya paga una vez, con
 * {@code contarClasesConsumidas} contra `V9` §5.
 *
 * <p>Se carga a mano y no hay ninguna integración con plataformas: eso está fuera
 * del alcance y se confirmó en la misma frase que confirmó la sección (§15).
 */
public enum TipoAparicion {
    RADIO,
    SET,
    PLAYLIST,
    OTRO
}
