package com.lajuanita.backend.usuario;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.config.RegistroDeEventos;
import com.lajuanita.backend.usuario.dto.AltaUsuarioRequest;
import com.lajuanita.backend.usuario.dto.EdicionUsuarioRequest;
import com.lajuanita.backend.usuario.dto.RegistroRequest;
import com.lajuanita.backend.usuario.dto.UsuarioCreado;
import com.lajuanita.backend.usuario.dto.UsuarioResumen;

/**
 * Altas, bajas y modificaciones de la identidad de login.
 *
 * <p>Hay dos caminos para que exista una cuenta, y son distintos a propósito:
 *
 * <ul>
 *   <li>{@link #registrar} — la persona se crea la cuenta sola desde el
 *       formulario público. Elige su contraseña. Es el caso normal.
 *   <li>{@link #altaPorAdministracion} — Micaela la crea. El sistema genera una
 *       contraseña temporal y marca la cuenta para que la cambie al entrar.
 *       Es el caso de los alumnos que ya existen en el Notion y de quien se
 *       anota por WhatsApp.
 * </ul>
 *
 * <p>Ninguno de los dos crea un {@code alumno}: eso es una relación aparte, que
 * se agrega después. Alguien que alquila una cabina tiene cuenta y no es alumno.
 */
@Service
public class UsuarioService {

    private final UsuarioRepository usuarios;
    private final PasswordEncoder passwordEncoder;
    private final GeneradorDePassword generadorDePassword;
    private final RegistroDeEventos eventos;

    public UsuarioService(UsuarioRepository usuarios,
            PasswordEncoder passwordEncoder,
            GeneradorDePassword generadorDePassword,
            RegistroDeEventos eventos) {
        this.usuarios = usuarios;
        this.passwordEncoder = passwordEncoder;
        this.generadorDePassword = generadorDePassword;
        this.eventos = eventos;
    }

    /**
     * Registro público. Devuelve la entidad ya persistida para que quien llama
     * le emita la credencial y la persona quede logueada sin un segundo paso.
     */
    @Transactional
    public Usuario registrar(RegistroRequest solicitud) {
        verificarQueNoEsteRepetido(solicitud.email(), solicitud.telefono(), null);

        Usuario usuario = new Usuario();
        usuario.setNombre(solicitud.nombre().trim());
        usuario.setApellido(solicitud.apellido().trim());
        usuario.setEmail(solicitud.email().trim());
        usuario.setTelefono(normalizar(solicitud.telefono()));
        // El rol NO sale de la solicitud. Este endpoint es público: aceptar un
        // rol del cliente sería regalar una forma de darse ADMIN a uno mismo.
        usuario.setRol(Rol.USUARIO);

        // Eligió su propia contraseña recién ahora, así que no hay nada que
        // forzarle a cambiar ni nada que pueda vencer.
        usuario.marcarPasswordElegida(passwordEncoder.encode(solicitud.password()));

        Usuario guardado = usuarios.save(usuario);
        eventos.cuentaCreada(guardado.getId(), guardado.getEmail(), "registro publico");
        return guardado;
    }

    /**
     * Alta hecha por administración, con contraseña temporal.
     *
     * @param puedeAsignarRoles si es {@code false} (quien da el alta es STAFF y
     *                          no ADMIN), el rol pedido se ignora y la cuenta
     *                          queda como {@code USUARIO}. Micaela puede cargar
     *                          alumnos; no puede fabricarse un compañero ADMIN.
     */
    @Transactional
    public UsuarioCreado altaPorAdministracion(AltaUsuarioRequest solicitud, boolean puedeAsignarRoles) {
        verificarQueNoEsteRepetido(solicitud.email(), solicitud.telefono(), null);

        String passwordTemporal = generadorDePassword.generar();

        Usuario usuario = new Usuario();
        usuario.setNombre(solicitud.nombre().trim());
        usuario.setApellido(solicitud.apellido().trim());
        usuario.setEmail(solicitud.email().trim());
        usuario.setTelefono(normalizar(solicitud.telefono()));
        usuario.setRol(rolPermitido(solicitud.rol(), puedeAsignarRoles));

        // La contraseña la conocen dos personas y viajó por un chat. Se cambia
        // sí o sí en el primer ingreso, y vence si eso no pasa (V8).
        usuario.marcarPasswordTemporal(passwordEncoder.encode(passwordTemporal));

        Usuario guardado = usuarios.save(usuario);
        eventos.cuentaCreada(guardado.getId(), guardado.getEmail(), "alta por administracion");
        return new UsuarioCreado(UsuarioResumen.de(guardado), passwordTemporal);
    }

    /**
     * Le da una contraseña temporal nueva a alguien que perdió la suya.
     *
     * <p>Es el camino que tres lugares del repo daban por existente —el README,
     * el comentario de {@code EdicionUsuarioRequest} y el mensaje que ve el
     * usuario final en {@code DatoDuplicadoException}— y que no estaba escrito.
     * Sin él, quien olvida la contraseña queda afuera <b>para siempre</b>: no hay
     * mail, así que no hay "olvidé mi contraseña" posible, y las dos salidas que
     * quedaban eran un UPDATE a mano sobre la base de producción o compartir la
     * cuenta de otro.
     *
     * <p>Pasa por el mismo guardia que editar y desactivar: <b>sin eso, un STAFF
     * le resetea la contraseña a un ADMIN y se queda con el sistema</b>, que es
     * reabrir por otra puerta el agujero que la auditoría del 12/08 cerró.
     *
     * @return la contraseña nueva, visible una sola vez, igual que en el alta.
     */
    @Transactional
    public UsuarioCreado resetearPassword(Long id, boolean esAdmin, Long idDeQuienPide) {
        Usuario usuario = buscar(id);
        verificarQuePuedeTocarEstaCuenta(usuario, esAdmin);

        String passwordTemporal = generadorDePassword.generar();
        usuario.marcarPasswordTemporal(passwordEncoder.encode(passwordTemporal));

        eventos.passwordReseteada(idDeQuienPide, usuario.getId());
        return new UsuarioCreado(UsuarioResumen.de(usuario), passwordTemporal);
    }

    @Transactional
    public UsuarioResumen editar(Long id, EdicionUsuarioRequest solicitud, boolean puedeAsignarRoles,
            Long idDeQuienPide) {
        Usuario usuario = buscar(id);
        verificarQuePuedeTocarEstaCuenta(usuario, puedeAsignarRoles);

        verificarQueNoEsteRepetido(solicitud.email(), solicitud.telefono(), id);

        usuario.setNombre(solicitud.nombre().trim());
        usuario.setApellido(solicitud.apellido().trim());
        usuario.setEmail(solicitud.email().trim());
        usuario.setTelefono(normalizar(solicitud.telefono()));

        if (solicitud.rol() != null && puedeAsignarRoles) {
            verificarQueNoSeSaqueElRolASiMismo(usuario, solicitud.rol(), idDeQuienPide);

            if (solicitud.rol() != usuario.getRol()) {
                eventos.rolCambiado(idDeQuienPide, usuario.getId(),
                        usuario.getRol().name(), solicitud.rol().name());
            }
            usuario.setRol(solicitud.rol());
        }

        return UsuarioResumen.de(usuario);
    }

    /**
     * El hermano de "no podés desactivar tu propia cuenta", para el otro campo
     * con el que uno se saca del sistema.
     *
     * <p>Medido contra la API el 2026-08-13: el único ADMIN se puso
     * {@code rol: USUARIO} a sí mismo, la API contestó 200, y el pedido
     * siguiente vino 403 porque la autorización relee el rol de la base (que es
     * lo correcto y es la razón de ser de {@code AutenticacionDesdeBase}). Como
     * además solo un ADMIN otorga roles, no quedaba nadie capaz de deshacerlo:
     * se recuperó con un UPDATE a mano en la base.
     *
     * <p>Con esto, la invariante "siempre queda al menos un ADMIN activo" se
     * sostiene sola y no hace falta contar filas: un ADMIN puede degradar o
     * desactivar a otro, pero nunca a sí mismo, así que el último no se puede ir.
     */
    private void verificarQueNoSeSaqueElRolASiMismo(Usuario objetivo, Rol rolPedido, Long idDeQuienPide) {
        if (objetivo.getId().equals(idDeQuienPide) && rolPedido != objetivo.getRol()) {
            throw new OperacionNoPermitidaException("No podés cambiarte el rol a vos mismo.");
        }
    }

    /**
     * Baja y alta lógica. Nada se borra en este sistema: un usuario inactivo
     * conserva su historial de pagos y reservas, y simplemente no puede entrar.
     */
    @Transactional
    public UsuarioResumen cambiarActivo(Long id, boolean activo, boolean esAdmin, Long idDeQuienPide) {
        Usuario usuario = buscar(id);
        verificarQuePuedeTocarEstaCuenta(usuario, esAdmin);

        // Desactivarse a uno mismo deja a la persona afuera en el pedido
        // siguiente, y si era el único ADMIN, al sistema sin administrador.
        if (usuario.getId().equals(idDeQuienPide) && !activo) {
            throw new OperacionNoPermitidaException("No podés desactivar tu propia cuenta.");
        }

        if (usuario.isActivo() != activo) {
            eventos.cuentaActivada(idDeQuienPide, usuario.getId(), activo);
        }

        usuario.setActivo(activo);
        return UsuarioResumen.de(usuario);
    }

    /**
     * Las cuentas administrativas solo las toca un ADMIN.
     *
     * <p>Sin esto, Micaela (STAFF) podía editar y desactivar la cuenta de un
     * ADMIN o un DIRECTIVO. No es hipotético: en la auditoría del 2026-08-12 un
     * STAFF desactivó al ADMIN y lo dejó sin poder entrar. Como además solo un
     * ADMIN puede otorgar roles, eso alcanzaba para dejar el sistema sin nadie
     * capaz de administrarlo.
     */
    private void verificarQuePuedeTocarEstaCuenta(Usuario objetivo, boolean esAdmin) {
        if (objetivo.getRol().esAdministrativo() && !esAdmin) {
            throw new OperacionNoPermitidaException(
                    "Solo un administrador puede modificar cuentas con permisos de administración.");
        }
    }

    @Transactional(readOnly = true)
    public Page<UsuarioResumen> listar(String buscar, Pageable paginado) {
        return usuarios.buscar(Busqueda.patron(buscar), paginado).map(UsuarioResumen::de);
    }

    @Transactional(readOnly = true)
    public UsuarioResumen porId(Long id) {
        return UsuarioResumen.de(buscar(id));
    }

    // -------------------------------------------------------------------------

    private Usuario buscar(Long id) {
        return usuarios.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + id + "."));
    }

    /**
     * @param idQueSeEstaEditando el id a excluir de la búsqueda, para que editar
     *                            a alguien sin cambiarle el email no choque
     *                            contra su propia fila.
     */
    private void verificarQueNoEsteRepetido(String email, String telefono, Long idQueSeEstaEditando) {
        usuarios.findByEmailIgnoreCase(email.trim())
                .filter(otro -> !otro.getId().equals(idQueSeEstaEditando))
                .ifPresent(otro -> {
                    throw DatoDuplicadoException.email();
                });

        String telefonoNormalizado = normalizar(telefono);
        if (telefonoNormalizado != null) {
            usuarios.findByTelefono(telefonoNormalizado)
                    .filter(otro -> !otro.getId().equals(idQueSeEstaEditando))
                    .ifPresent(otro -> {
                        throw DatoDuplicadoException.telefono();
                    });
        }
    }

    /**
     * El teléfono es único solo cuando no es nulo (índice parcial en la base).
     * Un string vacío que llegue del formulario tiene que volverse NULL, o dos
     * altas sin teléfono chocarían entre sí.
     */
    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }

    private Rol rolPermitido(Rol pedido, boolean puedeAsignarRoles) {
        if (pedido == null || !puedeAsignarRoles) {
            return Rol.USUARIO;
        }
        return pedido;
    }
}
