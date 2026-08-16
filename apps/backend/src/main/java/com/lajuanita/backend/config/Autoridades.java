package com.lajuanita.backend.config;

import org.springframework.security.core.Authentication;

/**
 * Preguntas sobre las autoridades de quien está pidiendo, en un solo lugar.
 *
 * <p>Vive al lado de {@link PuedeOperar} y {@link PuedeLeerAdministracion} y por
 * el mismo motivo que ellas: <b>una regla de autorización se escribe una sola
 * vez.</b> {@code esAdmin} estaba copiada carácter por carácter en
 * {@code UsuarioController} y {@code AlumnoController} (ARQ-06), y no es un
 * helper cualquiera: decide si se puede otorgar un rol y si se puede tocar una
 * cuenta administrativa. Con dos copias no pasaba nada; el Módulo 2 agregaba la
 * tercera y la cuarta, que es donde se cuelan las omisiones.
 *
 * <p>Esto <b>no autoriza nada por sí solo</b>: es una pregunta, no un guardia.
 * Quien decide es el servicio, que recibe la respuesta y aplica la regla
 * (ver {@code UsuarioService#verificarQuePuedeTocarEstaCuenta}).
 */
public final class Autoridades {

    private Autoridades() {
    }

    /**
     * ¿Es ADMIN?
     *
     * <p>Solo un ADMIN puede otorgar o cambiar roles. Micaela (STAFF) da de
     * alta alumnos todo el día, pero no puede fabricarse un compañero con
     * permisos de administración.
     *
     * <p>Se lee de las autoridades y no del claim del token: las autoridades
     * las arma {@code AutenticacionDesdeBase} releyendo el usuario de la base en
     * cada pedido, así que un cambio de rol vale en el pedido siguiente.
     *
     * <p>Compara contra {@code "ROLE_ADMIN"} con {@code equals} y no busca por
     * prefijo: Spring Security 7 suma sus propias autoridades a la lista
     * ({@code FACTOR_BEARER}), y una comparación laxa acá empieza a mirar
     * cosas que no son roles.
     */
    public static boolean esAdmin(Authentication quienPide) {
        return quienPide.getAuthorities().stream()
                .anyMatch(autoridad -> autoridad.getAuthority().equals("ROLE_ADMIN"));
    }

    /**
     * Quién está pidiendo, por id.
     *
     * <p>El nombre de la autenticación es el {@code sub} del token, que
     * {@code TokenService} escribió con el id del usuario. Sale de ahí y nunca
     * del cuerpo ni de la URL: es lo que sostiene tanto "nadie puede sacarse a
     * sí mismo del sistema" como la firma de una baja de nivel — una firma que
     * el cliente pudiera elegir no firma nada.
     *
     * <p>Estaba como método privado en {@code UsuarioController} y subió acá al
     * necesitarla el segundo controller, que es el mismo camino que ya recorrió
     * {@link #esAdmin} (ARQ-06).
     */
    public static Long idDe(Authentication quienPide) {
        return Long.valueOf(quienPide.getName());
    }
}
