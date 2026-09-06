package com.lajuanita.backend.sello;

/**
 * Espeja {@code release_tipo_valido}. Nullable en la tabla: puede no saberse al abrir la ficha.
 *
 * <p><b>Sólo EP y ÁLBUM llevan lista de temas</b> (P52): un single es el release
 * mismo —su nombre ya es el nombre del tema— y cargarlo de nuevo es escribir lo
 * mismo dos veces. Un remix, lo mismo.
 *
 * <p>⚠️ <b>Los números de abajo NO deciden nada.</b> Quien decide es
 * {@code verificar_rango_de_temas()} de `V26` §3, que los tiene escritos en SQL;
 * éstos existen para que la pantalla pueda avisar <i>"faltan 2 temas"</i>
 * <b>antes</b> de que alguien apriete publicar y se coma un 409. Es el mismo
 * reparto que {@code ContratoRepository.queRespaldanAlRelease} contra
 * {@code release_tiene_contrato()}, con la misma advertencia: <b>si se separan,
 * la pantalla cuenta mal y el trigger sigue siendo el que manda</b> — lo que se
 * rompe es el aviso, nunca la regla.
 */
public enum TipoRelease {

    SINGLE(null, null),
    EP(3, 6),
    REMIX(null, null),
    ALBUM(8, 15);

    private final Integer minimoDeTemas;
    private final Integer maximoDeTemas;

    TipoRelease(Integer minimoDeTemas, Integer maximoDeTemas) {
        this.minimoDeTemas = minimoDeTemas;
        this.maximoDeTemas = maximoDeTemas;
    }

    /** ¿Este formato tiene tracklist? Espeja el trigger {@code cancion_solo_en_ep_o_album}. */
    public boolean llevaTemas() {
        return minimoDeTemas != null;
    }

    /** {@code null} para los formatos que no llevan temas. */
    public Integer getMinimoDeTemas() {
        return minimoDeTemas;
    }

    /** {@code null} para los formatos que no llevan temas. */
    public Integer getMaximoDeTemas() {
        return maximoDeTemas;
    }
}
