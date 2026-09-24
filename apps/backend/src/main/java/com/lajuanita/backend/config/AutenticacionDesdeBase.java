package com.lajuanita.backend.config;

import java.util.List;

import org.springframework.core.convert.converter.Converter;
import org.springframework.security.authentication.AbstractAuthenticationToken;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.server.resource.InvalidBearerTokenException;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Convierte el token en una autenticación, <b>leyendo el estado actual del
 * usuario de la base</b> en vez de creerle a los claims.
 *
 * <p>Existe por un agujero real y medido: antes las autoridades salían del claim
 * {@code rol}, que se escribió cuando se emitió el token y vale 8 horas. Con eso,
 * en la API corriendo:
 *
 * <ul>
 *   <li>un usuario <b>dado de baja</b> seguía leyendo el listado de alumnos y
 *       <b>creando filas nuevas</b> con su token viejo -- {@code /api/me} le daba
 *       401, pero los endpoints de negocio no;
 *   <li>un ADMIN <b>degradado a USUARIO</b> seguía operando como ADMIN;
 *   <li>alguien con <b>contraseña temporal sin cambiar</b> operaba igual, porque
 *       ese bloqueo vivía solo en el frontend.
 * </ul>
 *
 * <p>Los tres eran la misma causa: la autorización miraba una foto vieja. La
 * baja lógica ({@code usuario.activo = FALSE}) es la forma que este sistema
 * documenta para sacar a alguien -- tiene que sacarlo de verdad, no dentro de
 * ocho horas.
 *
 * <p><b>El costo:</b> una consulta por pedido autenticado. A esta escala (decenas
 * de personas, cientos de pedidos por día) es irrelevante, y es el precio de que
 * una baja tenga efecto inmediato. Si algún día molesta, la respuesta es cachear
 * con invalidación, <b>no</b> volver a confiar en el claim.
 */
@Component
public class AutenticacionDesdeBase implements Converter<Jwt, AbstractAuthenticationToken> {

    /**
     * Autoridad que reemplaza al rol cuando la persona todavía no eligió su
     * contraseña.
     *
     * <p>No es un rol del negocio: es un estado. Al no tener {@code ROLE_ADMIN}
     * ni ninguno de los otros, <b>no pasa ningún {@code @PreAuthorize}</b>, que
     * es lo que cierra el eje de administración entero.
     *
     * <p>⚠️ <b>Pero esta autoridad sola NO alcanza, y creer que sí fue el
     * hallazgo `CS-01`</b> (barrida de ciberseguridad de septiembre 2026). Acá
     * decía que con ella la persona sólo llegaba a {@code /api/me} y a
     * {@code /api/me/password} -- <i>"justo lo necesario para salir del estado,
     * y nada más"</i>-- y era falso: <b>los 32 mappings de {@code /api/me/**}
     * no llevan ninguna anotación de rol</b>, porque ahí la identidad sale del
     * token y no del rol, así que caían en {@code anyRequest().authenticated()}
     * <b>y esta autoridad lo satisface</b>. Quedaban 30 alcanzables de más, 11
     * de ellos de escritura.
     *
     * <p>Hoy la frase vuelve a ser cierta, <b>y la otra mitad de la razón está
     * en otro archivo</b>: {@code SeguridadConfig} tiene una regla explícita que
     * abre esas dos rutas —exactas, no por prefijo— y le cierra el resto del
     * portal a quien tenga esta autoridad. <b>Si esa regla se borra, esto vuelve
     * a mentir sin que falle nada</b>; lo que avisa es
     * {@code CredencialVigenteTest.con_password_temporal_sin_cambiar_tampoco_se_abre_el_portal}.
     */
    public static final String AUTORIDAD_PASSWORD_PENDIENTE = "ROLE_PASSWORD_PENDIENTE";

    private final UsuarioRepository usuarios;

    public AutenticacionDesdeBase(UsuarioRepository usuarios) {
        this.usuarios = usuarios;
    }

    @Override
    @Transactional(readOnly = true)
    public AbstractAuthenticationToken convert(Jwt token) {
        long idUsuario;
        try {
            idUsuario = Long.parseLong(token.getSubject());
        } catch (NumberFormatException e) {
            // Firma válida pero el `sub` no identifica a nadie.
            throw new InvalidBearerTokenException("La credencial no identifica a ningún usuario.");
        }

        Usuario usuario = usuarios.findById(idUsuario)
                .orElseThrow(() -> new InvalidBearerTokenException(
                        "La credencial no identifica a ningún usuario."));

        // Dado de baja: la credencial deja de valer en el acto, sin esperar a
        // que venza.
        if (!usuario.isActivo()) {
            throw new InvalidBearerTokenException("La cuenta está desactivada.");
        }

        return new JwtAuthenticationToken(token, autoridadesDe(usuario), token.getSubject());
    }

    private List<GrantedAuthority> autoridadesDe(Usuario usuario) {
        if (usuario.isDebeCambiarPassword()) {
            return List.of(new SimpleGrantedAuthority(AUTORIDAD_PASSWORD_PENDIENTE));
        }

        // El rol sale de la base, no del claim: un cambio de rol pega en el
        // pedido siguiente.
        return List.of(new SimpleGrantedAuthority("ROLE_" + usuario.getRol().name()));
    }
}
