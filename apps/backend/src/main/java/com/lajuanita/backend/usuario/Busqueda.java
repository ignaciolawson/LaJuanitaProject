package com.lajuanita.backend.usuario;

/**
 * Arma el patrón de los buscadores de listado.
 *
 * <p>Existe por dos motivos concretos, los dos encontrados a los golpes:
 *
 * <ol>
 *   <li><b>Nunca devuelve null.</b> Pasar un parámetro nulo a una consulta con
 *       {@code LOWER(...) LIKE :texto} explota en Postgres con
 *       {@code function lower(bytea) does not exist}: sin valor, el motor no
 *       puede deducir el tipo del parámetro y lo liga como binario. Para "traer
 *       todo" se devuelve {@code "%"}, que hace verdadero cualquier LIKE.
 *   <li><b>Escapa los comodines.</b> Sin esto, alguien que busca "100%" o un
 *       nombre con guion bajo obtiene resultados absurdos, porque {@code %} y
 *       {@code _} son comodines de LIKE.
 * </ol>
 */
public final class Busqueda {

    private Busqueda() {
    }

    /** Carácter de escape que hay que declarar en la consulta con ESCAPE. */
    public static final char ESCAPE = '\\';

    public static String patron(String texto) {
        if (texto == null || texto.isBlank()) {
            return "%";
        }

        String escapado = texto.trim()
                .toLowerCase()
                // El backslash primero, o después se re-escaparían los que
                // agregamos nosotros.
                .replace("\\", "\\\\")
                .replace("%", "\\%")
                .replace("_", "\\_");

        return "%" + escapado + "%";
    }
}
