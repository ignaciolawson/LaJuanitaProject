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
 *       {@code _} son comodines de LIKE. El carácter de escape es la barra
 *       invertida.
 * </ol>
 *
 * <p><b>Una consulta que use este patrón tiene que declarar
 * {@code ESCAPE '\'}</b>, como hacen {@code UsuarioRepository#buscar} y
 * {@code AlumnoRepository#buscar}. Postgres usa la barra invertida por defecto,
 * así que omitirlo funciona igual y por eso nadie lo notó durante meses; pero
 * escrito, el escapado deja de depender de un default del motor. Acá vivía una
 * constante {@code ESCAPE} que decía justamente eso y que ninguna consulta
 * referenciaba (SEC-09): se borró porque una anotación no puede interpolarla sin
 * romper el bloque de texto, y una instrucción que nadie cumple es peor que un
 * comentario.
 */
public final class Busqueda {

    private Busqueda() {
    }

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
