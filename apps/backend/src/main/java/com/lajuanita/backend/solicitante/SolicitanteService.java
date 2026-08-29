package com.lajuanita.backend.solicitante;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.pago.dto.MotivoRequest;
import com.lajuanita.backend.solicitante.dto.AltaSolicitanteRequest;
import com.lajuanita.backend.solicitante.dto.ConversionRealizada;
import com.lajuanita.backend.solicitante.dto.SolicitanteResumen;
import com.lajuanita.backend.usuario.OperacionNoPermitidaException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.UsuarioService;
import com.lajuanita.backend.usuario.dto.AltaUsuarioRequest;
import com.lajuanita.backend.usuario.dto.Pagina;
import com.lajuanita.backend.usuario.dto.UsuarioCreado;
import com.lajuanita.backend.usuario.dto.UsuarioResumen;

/**
 * El circuito de una ficha del buzón: alguien completa un formulario en la
 * landing, y administración la convierte en cuenta o la descarta.
 *
 * <h2>Las dos mitades y sus dos permisos</h2>
 *
 * <p>{@link #recibir} <b>no tiene permiso ninguno</b>: es el primer endpoint de
 * escritura público del sistema fuera del registro. Todo lo demás es
 * administración, como el resto del proyecto.
 *
 * <h2>Por qué la conversión tiene dos caminos y no uno</h2>
 *
 * <p>El caso obvio es crear la cuenta. El otro —<b>la persona ya la tenía</b>— no
 * es un borde raro: un alumno que cursa hace un año y pide la cabina desde la
 * landing llega exactamente así. Con un solo camino, esa ficha choca contra
 * {@code usuario_email_unico} y queda trabada para siempre, o peor, se descarta
 * como si el pedido no valiera.
 *
 * <p>Los dos terminan igual —la ficha CONVERTIDA apuntando a una cuenta— porque
 * para el buzón son el mismo hecho: <b>ya hay a quién cargarle el curso</b>. Lo
 * único que cambia es si hay una contraseña que pasar por WhatsApp, y eso viaja
 * explícito en {@link ConversionRealizada}.
 *
 * <h2>Lo que este servicio NO hace, decidido y no olvidado</h2>
 *
 * <p><b>No escribe una notificación por cada ficha que entra.</b> §9.4 usa el par
 * "tabla + notificación que la anuncia" de `V13` como modelo, y acá la segunda
 * mitad se dejó afuera a propósito: <b>este es el único escritor público del
 * sistema</b>, así que un aviso por formulario es un aviso por cada bot que pase,
 * multiplicado por cada ADMIN y STAFF que haya. Es exactamente el modo de falla
 * que {@code AvisoService} tiene escrito en su cabecera — la bandeja se convierte
 * en ruido y entonces el aviso que importa pasa desapercibido.
 *
 * <p>Y no hace falta para lo que el buzón tiene que garantizar: §9.4 dice que lo
 * que evita perder gente es <b>que quede la lista</b>, no que suene algo. Si con
 * el uso resulta que hay que avisar, la forma correcta ya existe y es la otra:
 * un aviso del disparador automático —<i>"hay 3 fichas sin contestar hace más de
 * 48 horas"</i>—, que es un aviso por hecho y no uno por formulario.
 */
@Service
public class SolicitanteService {

    private final SolicitanteRepository fichas;
    private final UsuarioRepository usuarios;
    private final UsuarioService cuentas;

    public SolicitanteService(SolicitanteRepository fichas,
            UsuarioRepository usuarios,
            UsuarioService cuentas) {
        this.fichas = fichas;
        this.usuarios = usuarios;
        this.cuentas = cuentas;
    }

    // == Lo que llega de la landing ==========================================

    /**
     * Entra una ficha. Endpoint público, sin autenticación.
     *
     * <p><b>Nada de lo que llega acá decide nada</b>: no crea cuenta, no reserva
     * ninguna franja, no toca plata. Es una anotación para que alguien llame. Esa
     * es la propiedad que hace que un endpoint público sea aceptable — el precio
     * de que lo abusen es tabla ocupada, no estado del negocio cambiado.
     *
     * <p>El límite por IP lo pone {@code FiltroDeFrecuencia}, antes de la cadena
     * de seguridad.
     */
    @Transactional
    public SolicitanteResumen recibir(AltaSolicitanteRequest formulario) {
        Solicitante ficha = new Solicitante();
        ficha.setNombre(formulario.nombre().trim());
        ficha.setApellido(formulario.apellido().trim());
        ficha.setEmail(formulario.email().trim());
        ficha.setTelefono(formulario.telefono().trim());
        ficha.setInteres(formulario.interes());
        ficha.setDetalle(normalizar(formulario.detalle()));
        ficha.setMensaje(normalizar(formulario.mensaje()));

        return SolicitanteResumen.de(fichas.save(ficha));
    }

    // == El buzón ============================================================

    @Transactional(readOnly = true)
    public Pagina<SolicitanteResumen> listar(EstadoSolicitante estado, int pagina, int tamanio) {
        return Pagina.de(fichas
                .listar(estado, PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio)))
                .map(SolicitanteResumen::de));
    }

    /**
     * Convertir la ficha en una cuenta.
     *
     * <p>Los dos caminos están explicados en la cabecera. El que crea delega en
     * {@link UsuarioService#altaPorAdministracion} y no arma el {@code Usuario}
     * acá: ahí viven el hash, la marca de contraseña temporal —que `V8` hace
     * vencer— y el registro del evento, y una segunda copia de eso es la que se
     * olvida de una de las tres.
     *
     * <p><b>Se pasa {@code puedeAsignarRoles = false} siempre</b>, aunque quien
     * convierte sea ADMIN. No es una restricción de permisos sino de qué es esto:
     * una ficha de la landing es una persona que quiere contratar un servicio, y
     * un rol administrativo no se otorga desde un formulario público ni por
     * accidente. Si esa persona además va a administrar, se le cambia el rol en
     * la pantalla de personas, que es donde esa decisión se ve.
     *
     * <p><b>Lo que queda afuera a propósito:</b> si el teléfono de la ficha ya es
     * de <i>otra</i> cuenta, el alta choca contra {@code usuario_telefono_unico} y
     * la conversión falla con ese mensaje. No se inventa una salida —vincular a
     * ciegas la cuenta del teléfono sería vincular a una persona distinta—: se
     * corrige el dato en la pantalla de personas, o se descarta la ficha diciendo
     * por qué.
     */
    @Transactional
    public ConversionRealizada convertir(Long id, Long idAutor) {
        Solicitante ficha = pendientePorId(id);
        Usuario autor = buscarUsuario(idAutor);

        Usuario yaExiste = usuarios.findByEmailIgnoreCase(ficha.getEmail()).orElse(null);
        if (yaExiste != null) {
            ficha.convertir(yaExiste, autor);
            return new ConversionRealizada(
                    SolicitanteResumen.de(ficha), UsuarioResumen.de(yaExiste), null, false);
        }

        UsuarioCreado creada = cuentas.altaPorAdministracion(
                new AltaUsuarioRequest(
                        ficha.getNombre(),
                        ficha.getApellido(),
                        ficha.getEmail(),
                        ficha.getTelefono(),
                        null),
                false);

        ficha.convertir(usuarios.getReferenceById(creada.usuario().id()), autor);

        return new ConversionRealizada(
                SolicitanteResumen.de(ficha), creada.usuario(), creada.passwordTemporal(), true);
    }

    /**
     * Descartar, diciendo por qué.
     *
     * <p>El motivo lo exige `V20` y no viaja a ninguna persona: no hay cuenta del
     * otro lado, así que no hay bandeja donde dejárselo. Es para quien abra el
     * buzón la semana que viene — sin él, "spam" y "llamé tres veces y no atiende"
     * se ven exactamente igual.
     */
    @Transactional
    public SolicitanteResumen descartar(Long id, MotivoRequest motivo, Long idAutor) {
        Solicitante ficha = pendientePorId(id);
        ficha.descartar(motivo.motivo().trim(), buscarUsuario(idAutor));
        return SolicitanteResumen.de(ficha);
    }

    // -------------------------------------------------------------------------

    /**
     * Una ficha que todavía se pueda resolver.
     *
     * <p>El trigger de `V20` impide igual tocar una resuelta; este pre-chequeo
     * existe para que el segundo que convierte lea <i>"ya fue atendida"</i> en vez
     * de un error de base, y sobre todo <b>para que no llegue a crear la cuenta
     * antes de enterarse</b>: sin él, convertir dos veces intenta dos altas y la
     * segunda se cae recién contra el trigger, con la cuenta duplicada ya creada
     * en el intento. Es la misma razón por la que {@code SolicitudReservaService}
     * lo hace antes de crear la reserva.
     */
    private Solicitante pendientePorId(Long id) {
        Solicitante ficha = fichas.porIdConDetalle(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la ficha " + id + "."));

        if (!ficha.estaPendiente()) {
            throw new OperacionNoPermitidaException(
                    "Esa ficha ya fue atendida (" + ficha.getEstado() + ").");
        }
        return ficha;
    }

    private Usuario buscarUsuario(Long id) {
        return usuarios.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
