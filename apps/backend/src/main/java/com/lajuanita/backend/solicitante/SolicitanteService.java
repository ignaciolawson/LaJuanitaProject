package com.lajuanita.backend.solicitante;

import java.math.RoundingMode;
import java.time.LocalDate;
import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.alumno.AlumnoService;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionService;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.inscripcion.dto.AltaInscripcionRequest;
import com.lajuanita.backend.inscripcion.dto.InscripcionCreada;
import com.lajuanita.backend.solicitante.dto.AlumnoInscripto;
import com.lajuanita.backend.solicitante.dto.InscribirDesdeElBuzonRequest;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.TipoNotificacion;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.dto.MotivoRequest;
import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.reserva.ReservaService;
import com.lajuanita.backend.reserva.dto.AltaParticipanteRequest;
import com.lajuanita.backend.reserva.dto.AltaPreconfirmacionRequest;
import com.lajuanita.backend.reserva.dto.AltaReservaRequest;
import com.lajuanita.backend.reserva.dto.ReservaCreada;
import com.lajuanita.backend.sala.TipoUso;
import com.lajuanita.backend.sala.TipoUsoRepository;
import com.lajuanita.backend.solicitante.dto.AltaSolicitanteRequest;
import com.lajuanita.backend.solicitante.dto.ApartarLaCabinaRequest;
import com.lajuanita.backend.solicitante.dto.CabinaApartada;
import com.lajuanita.backend.solicitante.dto.CandidatoDeLaFicha;
import com.lajuanita.backend.solicitante.dto.ConversionRealizada;
import com.lajuanita.backend.solicitante.dto.DestinoRequest;
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
import com.lajuanita.backend.venta.VentaEquipoRepository;

/**
 * El circuito de una ficha del buzón: alguien completa un formulario en la
 * landing, y administración le carga lo que pidió o la descarta.
 *
 * <h2>Las dos mitades y sus dos permisos</h2>
 *
 * <p>{@link #recibir} <b>no tiene permiso ninguno</b>: es el primer endpoint de
 * escritura público del sistema fuera del registro. Todo lo demás es
 * administración, como el resto del proyecto.
 *
 * <h2>Por qué crear la cuenta tiene dos caminos y no uno</h2>
 *
 * <p>El caso obvio es crear la cuenta. El otro —<b>la persona ya la tenía</b>— no
 * es un borde raro: un alumno que cursa hace un año y pide la cabina desde la
 * landing llega exactamente así. Con un solo camino, esa ficha choca contra
 * {@code usuario_email_unico} y queda trabada para siempre, o peor, se descarta
 * como si el pedido no valiera.
 *
 * <p>Los dos terminan igual —la ficha apuntando a una cuenta, y <b>abierta</b>—
 * porque para el buzón son el mismo hecho: <b>ya hay a quién cargarle el
 * curso</b>. Lo único que cambia es si hay una contraseña que pasar por WhatsApp,
 * y eso viaja explícito en {@link ConversionRealizada}.
 *
 * <p>⚠️ <b>Ninguno de los dos cierra la ficha</b>, que es el cambio de `V27`: la
 * cuenta es una comodidad para el cliente (P54), y quien pidió la cabina sigue
 * sin tenerla. La cierra {@link #atender}.
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

    // Los tres destinos posibles de una ficha. Están acá y no en cada alta porque
    // cerrar la ficha es un acto del buzón: la pantalla de inscripciones no sabe
    // —ni tiene por qué saber— que existe un buzón.
    private final ReservaRepository reservas;
    private final InscripcionRepository inscripciones;
    private final VentaEquipoRepository ventas;

    // Para apartar la cabina sin salir del buzón (Fase 3). El alta de la reserva
    // se DELEGA: sus reglas son del circuito de reservas, y una segunda copia es
    // la que se olvida de una — es lo mismo que hace el pedido de sala.
    private final ReservaService circuitoDeReservas;
    private final TipoUsoRepository tiposDeUso;
    private final NotificacionService avisos;
    private final AlumnoService alumnos;
    private final InscripcionService circuitoDeInscripciones;

    public SolicitanteService(SolicitanteRepository fichas,
            UsuarioRepository usuarios,
            UsuarioService cuentas,
            ReservaRepository reservas,
            InscripcionRepository inscripciones,
            VentaEquipoRepository ventas,
            ReservaService circuitoDeReservas,
            TipoUsoRepository tiposDeUso,
            NotificacionService avisos,
            AlumnoService alumnos,
            InscripcionService circuitoDeInscripciones) {
        this.fichas = fichas;
        this.usuarios = usuarios;
        this.cuentas = cuentas;
        this.reservas = reservas;
        this.inscripciones = inscripciones;
        this.ventas = ventas;
        this.circuitoDeReservas = circuitoDeReservas;
        this.tiposDeUso = tiposDeUso;
        this.avisos = avisos;
        this.alumnos = alumnos;
        this.circuitoDeInscripciones = circuitoDeInscripciones;
    }

    private static final DateTimeFormatter DIA = DateTimeFormatter.ofPattern("dd/MM");
    private static final DateTimeFormatter DIA_Y_HORA = DateTimeFormatter.ofPattern("dd/MM HH:mm");

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

        // Cuándo le vendría bien (P58). Los tres opcionales y por separado: lo que
        // llegue se guarda, lo que no, queda en null y la ficha se lee como antes.
        ficha.setFechaPreferida(formulario.fechaPreferida());
        ficha.setHoraPreferida(formulario.horaPreferida());
        ficha.setDuracionMinutos(formulario.duracionMinutos());

        // Qué programa, con qué experiencia y cómo (`V29`, P64 · P67). Mismo
        // criterio: opcionales, sin atar a `interes`, y lo que no llega queda en
        // null. El nivel NO se traduce acá — se sugiere al inscribir.
        ficha.setDisciplina(formulario.disciplina());
        ficha.setExperiencia(formulario.experiencia());
        ficha.setModalidad(formulario.modalidad());

        return SolicitanteResumen.de(fichas.save(ficha));
    }

    // == El buzón ============================================================

    @Transactional(readOnly = true)
    public Pagina<SolicitanteResumen> listar(EstadoSolicitante estado, boolean soloAbiertas,
            int pagina, int tamanio) {

        return Pagina.de(fichas
                .listar(estado, soloAbiertas,
                        PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio)))
                .map(SolicitanteResumen::de));
    }

    /**
     * Crearle la cuenta a quien mandó la ficha.
     *
     * <p>Los dos caminos están explicados en la cabecera. El que crea delega en
     * {@link UsuarioService#altaPorAdministracion} y no arma el {@code Usuario}
     * acá: ahí viven el hash, la marca de contraseña temporal —que `V8` hace
     * vencer— y el registro del evento, y una segunda copia de eso es la que se
     * olvida de una de las tres.
     *
     * <p><b>Se pasa {@code puedeAsignarRoles = false} siempre</b>, aunque quien
     * la crea sea ADMIN. No es una restricción de permisos sino de qué es esto:
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
    public ConversionRealizada darleCuenta(Long id) {
        Solicitante ficha = pendientePorId(id);

        Usuario yaExiste = usuarios.findByEmailIgnoreCase(ficha.getEmail()).orElse(null);
        if (yaExiste != null) {
            ficha.darleCuenta(yaExiste);
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

        ficha.darleCuenta(usuarios.getReferenceById(creada.usuario().id()));

        return new ConversionRealizada(
                SolicitanteResumen.de(ficha), creada.usuario(), creada.passwordTemporal(), true);
    }

    /**
     * Cerrar la ficha apuntando a lo que produjo.
     *
     * <p><b>Es lo que hace que el buzón se cierre solo</b>: no hay un botón
     * "marcar atendida" que alguien pueda apretar sin haber cargado nada — hay que
     * decir <b>qué</b> se cargó, y eso queda enlazado para siempre.
     *
     * <p><b>Va como un segundo pedido, después del alta</b>, y no adentro de ella.
     * Es la forma que `V21` ya eligió para adjuntar un comprobante: la inscripción
     * y la venta se cargan en pantallas que no saben nada del buzón, y meterles un
     * {@code idSolicitante} las acoplaría a él para siempre. <b>El modo de falla de
     * partirlo es el barato</b>: si el segundo pedido no sale, la ficha queda
     * abierta y alguien la vuelve a mirar — al revés, la ficha se cerraría sin que
     * exista lo que dice haber producido.
     *
     * <p>El {@code flush} es para que el CHECK de doble sentido de `V27` hable
     * dentro del pedido y no al COMMIT.
     */
    @Transactional
    public SolicitanteResumen atender(Long id, DestinoRequest destino, Long idAutor) {
        Solicitante ficha = pendientePorId(id);

        ficha.atender(destino.resolverCon(reservas, inscripciones, ventas), buscarUsuario(idAutor));
        fichas.flush();

        return SolicitanteResumen.de(ficha);
    }


    /**
     * Lo que esta ficha <b>pudo haber producido</b>: lo que hay para elegir al
     * cerrarla.
     *
     * <h2>Salen de la cuenta, y por eso una ficha sin cuenta no tiene candidatos</h2>
     *
     * <p>Las tres consultas entran por {@code id_usuario}, así que una ficha a la
     * que todavía no se le creó la cuenta contesta las tres listas vacías. <b>No
     * es un caso olvidado</b>: la pantalla lo dice y ofrece crear la cuenta, que
     * es el paso que faltaba. Cruzar por nombre sería la alternativa y es peor —
     * dos "Juan Pérez" son dos personas, y una ficha cerrada contra lo del otro
     * se ve resuelta, que es lo único que este buzón no puede permitirse.
     *
     * <p>Eso <b>no vuelve la cuenta un requisito del servicio</b>, que es lo que
     * P54 rechaza: la persona tiene su reserva igual. Es un requisito de poder
     * anotar en la ficha contra qué se cerró, y P54 mantiene que la cuenta se
     * crea siempre.
     *
     * <h2>La ventana de las reservas</h2>
     *
     * <p>{@code deLaPersona} filtra por la fecha de la reserva, así que hay que
     * darle un rango. Va desde <b>un mes antes de que la ficha llegara</b> —una
     * reserva anterior a eso no la pudo producir esta ficha, y el mes es margen
     * para la que se cargó con fecha retroactiva— hasta un año adelante, el mismo
     * techo que usa el reporte de uso de salas.
     *
     * <p>Las inscripciones y las ventas vienen sin ventana: son listas cortas por
     * persona, y acotarlas sólo agregaría una fecha más que puede esconder la fila
     * que se busca.
     */
    @Transactional(readOnly = true)
    public List<CandidatoDeLaFicha> candidatosDe(Long id) {
        Solicitante ficha = fichas.porIdConDetalle(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la ficha " + id + "."));

        Usuario cuenta = ficha.getUsuario();
        if (cuenta == null) {
            return List.of();
        }

        LocalDate llegada = ficha.getFechaCreacion().toLocalDate();
        List<CandidatoDeLaFicha> candidatos = new ArrayList<>();

        reservas.deLaPersona(cuenta.getId(), llegada.minusMonths(1), llegada.plusYears(1),
                EstadoAsistencia.CANCELADA, EstadoPago.ENTRARON)
                .forEach(r -> candidatos.add(CandidatoDeLaFicha.de(r)));

        inscripciones.deLaPersona(cuenta.getId())
                .forEach(i -> candidatos.add(CandidatoDeLaFicha.de(i)));

        ventas.deLaPersona(cuenta.getId())
                .forEach(v -> candidatos.add(CandidatoDeLaFicha.de(v)));

        return candidatos;
    }

    /**
     * <b>Apartarle la cabina sin salir del buzón</b> (`mejoras.md` §15 · Fase 3):
     * la cuenta, la reserva apartada, la deuda y el cierre de la ficha, en un solo
     * movimiento.
     *
     * <h2>Por qué es un endpoint y no tres llamadas de la pantalla</h2>
     *
     * <p>Porque el modo de falla de partirlo <b>no es barato acá</b>, al revés que
     * en {@link #atender}. Ahí el segundo pedido que no sale deja la ficha abierta
     * y alguien la vuelve a mirar; acá, entre crear la cuenta y crear la reserva,
     * <b>lo que puede fallar es la reserva</b> —la franja se ocupó, la sala no
     * admite ese uso— y lo que queda es una cuenta creada con una contraseña
     * temporal que ya se mostró, para una persona que no tiene nada. Al revés,
     * fallar entero deja el buzón exactamente como estaba.
     *
     * <p><b>Y la transacción es la misma por una razón de la base, no de prolijidad:</b>
     * el {@code CONSTRAINT TRIGGER} de `V10` corre al COMMIT y busca el dinero
     * detrás de la reserva. La deuda de la prereserva es ese dinero (`V24`), así
     * que reserva y deuda tienen que estar en la misma transacción o la reserva se
     * rechaza al cerrar.
     *
     * <h2>El orden, que sí importa</h2>
     *
     * <ol>
     *   <li><b>La cuenta primero</b>, porque la deuda necesita a quién anotársela:
     *       {@code AltaPreconfirmacionRequest} lo dice en su propio javadoc — una
     *       deuda sin nombre no aparece en deudores y no se le cobra a nadie. Eso
     *       es lo que hace que la cuenta sea <i>comodidad del cliente y condición
     *       de la plata a la vez</i> (P54), sin volver a ser un trámite previo.
     *   <li><b>La reserva</b>, delegada en {@link ReservaService#alta}. Nace
     *       apartada; <b>no se aparta después</b>, que es lo que la escalera de
     *       `V24` §5 rechaza.
     *   <li><b>La ficha</b>, que se cierra apuntando a esa reserva (P56).
     * </ol>
     *
     * <p>⚠️ <b>Los dos UPDATE sobre la ficha son legales en este orden y no al
     * revés.</b> {@code darleCuenta} escribe {@code id_usuario} con la ficha
     * todavía PENDIENTE, y {@code atender} la saca de PENDIENTE. El trigger
     * {@code solicitante_resuelto_es_final} de `V13` §4 rechaza cualquier UPDATE
     * sobre una ficha ya resuelta, así que cerrarla antes de vincular la cuenta
     * haría fallar el segundo — es la misma congelación que P56 eligió a
     * propósito.
     */
    @Transactional
    public CabinaApartada apartarLaCabina(Long id, ApartarLaCabinaRequest pedido, Long idAutor) {
        TipoUso uso = tiposDeUso.findById(pedido.idTipoUso())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el tipo de uso " + pedido.idTipoUso() + "."));

        // La misma lista que define qué se puede pedir desde el portal (P17), no
        // una nueva: apartar una CLASE dejaría una reserva sin la inscripción que
        // la descuenta, que es lo que P39 prohíbe desde el otro lado.
        if (!uso.isSolicitablePorUsuario()) {
            throw new OperacionNoPermitidaException(
                    "Desde el buzón se aparta la cabina o la grabación de un set, no "
                            + uso.getNombre().toLowerCase() + ".");
        }

        ConversionRealizada cuenta = darleCuenta(id);
        Usuario quienPidio = usuarios.getReferenceById(cuenta.usuario().id());

        ReservaCreada creada = circuitoDeReservas.alta(new AltaReservaRequest(
                pedido.idSala(),
                pedido.idTipoUso(),
                null,
                pedido.fecha(),
                pedido.horaInicio(),
                pedido.horaInicio().plusMinutes(pedido.duracionMinutos()),
                null,
                null,
                null,
                // Se lo anota como participante aunque un alquiler no sea una clase:
                // está en la sala ocupándola, es lo que le da una sola definición a
                // "mis próximas reservas", y de regalo entra en la regla de `V9`
                // —nadie en dos salas a la vez—. Mismo criterio que el pedido de sala.
                List.of(new AltaParticipanteRequest(quienPidio.getId(), null)),
                null,
                new AltaPreconfirmacionRequest(quienPidio.getId(),
                        pedido.monto(),
                        pedido.moneda(),
                        pedido.cotizacionDolar(),
                        pedido.medioPago(),
                        normalizar(pedido.mensaje()))),
                idAutor);

        Reserva reserva = reservas.getReferenceById(creada.reserva().idReserva());
        Solicitante ficha = pendientePorId(id);
        ficha.atender(new DestinoDeLaFicha.DeUnaReserva(reserva), buscarUsuario(idAutor));
        fichas.flush();

        // ⚠️ El aviso dice que FALTA HACER ALGO y hasta cuándo. Un "está confirmado"
        // sobre un horario que se cae en 24hs es la peor forma de perder una venta,
        // porque el que lo lee se queda tranquilo. Acá además la persona viene de un
        // formulario de la web y quizá nunca entró al sistema: el canal real es el
        // WhatsApp que arma la pantalla, y esto es lo que va a encontrar si entra.
        avisos.avisar(quienPidio,
                TipoNotificacion.RESERVA_PRECONFIRMADA,
                "Te apartamos la sala: falta abonarla",
                "Te reservamos " + creada.reserva().sala() + " para el "
                        + pedido.fecha().format(DIA) + " a las " + pedido.horaInicio()
                        + ". Para confirmarla hay que abonar "
                        + pedido.moneda() + " "
                        + pedido.monto().setScale(2, RoundingMode.HALF_UP).toPlainString()
                        + " antes del " + reserva.getVencePreconfirmacion().format(DIA_Y_HORA)
                        + ". Pasado ese plazo el horario se libera.",
                "/mis-reservas");

        return new CabinaApartada(
                SolicitanteResumen.de(ficha),
                creada.reserva(),
                cuenta.usuario(),
                cuenta.passwordTemporal(),
                cuenta.cuentaNueva(),
                creada.idPagoSena(),
                pedido.monto(),
                pedido.moneda());
    }

    /**
     * Inscribir a quien pidió un curso, desde su ficha, en un movimiento (§16 ·
     * B2 1.1, P59 · P64 · P72): cuenta si falta, relación de alumno si falta,
     * inscripción <b>preinscripta</b>, y la ficha cerrada apuntándole.
     *
     * <p><b>Una transacción, por el argumento de {@link #apartarLaCabina}</b> y no
     * el de {@code atender}: lo que puede fallar es la inscripción —el índice
     * único, si ya tiene una abierta en esa disciplina— y lo que quedaría es una
     * cuenta creada, con la contraseña temporal ya mostrada, para alguien que no
     * tiene nada.
     *
     * <p><b>Nace preinscripta, sin seña</b>: la persona viene de un formulario y
     * todavía no pagó. Lo que la pantalla arma para el WhatsApp es exactamente
     * eso —te anotamos, la seña es el 50%, hasta cuándo—, y el pago de la seña la
     * activa después ({@code PagoService.registrar}). Con precio en cero (una
     * beca) nace activa: no hay qué señar, y {@code vence} viaja en null.
     *
     * <p>El nivel, si no viene, es el que la ficha sugiere desde la experiencia
     * (P64) — la tabla vive en {@code Experiencia#nivelSugerido} y en ningún
     * otro lado. Y sólo para fichas de CURSO: inscribir a quien pidió la cabina
     * es lo simétrico de apartar una clase, que el otro camino rechaza.
     */
    @Transactional
    public AlumnoInscripto inscribir(Long id, InscribirDesdeElBuzonRequest pedido, Long idAutor) {
        Solicitante ficha = pendientePorId(id);
        if (ficha.getInteres() != InteresDelSolicitante.CURSO) {
            throw new OperacionNoPermitidaException(
                    "Desde el buzón se inscribe a quien pidió un curso; esta ficha pidió "
                            + ficha.getInteres().name().toLowerCase().replace('_', ' ') + ".");
        }

        ConversionRealizada cuenta = darleCuenta(id);
        Usuario quienPidio = usuarios.getReferenceById(cuenta.usuario().id());

        Alumno alumno = alumnos.buscarPorUsuario(quienPidio.getId())
                .orElseGet(() -> alumnos.altaDeLaRelacion(quienPidio));

        Nivel nivel = pedido.nivel() != null
                ? pedido.nivel()
                : ficha.getExperiencia() == null ? null : ficha.getExperiencia().nivelSugerido();

        InscripcionCreada creada = circuitoDeInscripciones.alta(new AltaInscripcionRequest(
                alumno.getId(),
                pedido.idProfesor(),
                pedido.disciplina(),
                nivel,
                pedido.clasesContratadas(),
                pedido.precioTotal(),
                pedido.moneda(),
                pedido.cotizacionDolar(),
                pedido.fechaInicio(),
                normalizar(pedido.notas()),
                // Sin seña: nace preinscripta (o activa, si es una beca).
                null),
                idAutor);

        Inscripcion inscripcion = inscripciones.getReferenceById(creada.inscripcion().idInscripcion());
        // La ficha se relee: `darleCuenta` la modificó en esta misma sesión.
        ficha = pendientePorId(id);
        ficha.atender(new DestinoDeLaFicha.DeUnaInscripcion(inscripcion), buscarUsuario(idAutor));
        fichas.flush();

        Moneda moneda = creada.inscripcion().moneda();
        BigDecimal senia = pedido.precioTotal()
                .divide(BigDecimal.TWO, 2, RoundingMode.HALF_UP);
        OffsetDateTime vence = creada.inscripcion().vencePreinscripcion();

        // Como en la cabina: el aviso dice que FALTA HACER ALGO y hasta cuándo.
        // La persona viene de la web y quizá nunca entró; el canal real es el
        // WhatsApp que arma la pantalla, y esto es lo que va a encontrar si entra.
        String programa = creada.inscripcion().disciplina().name();
        avisos.avisar(quienPidio,
                TipoNotificacion.RESERVA_PRECONFIRMADA,
                vence == null ? "Te anotamos en el programa" : "Te anotamos: falta la seña",
                vence == null
                        ? "Te anotamos en " + programa + ". Desde acá vas a poder seguir tu curso."
                        : "Te anotamos en " + programa + ". Para confirmar el lugar hay que abonar "
                                + "la seña de " + moneda + " " + senia.toPlainString()
                                + " antes del " + vence.format(DIA_Y_HORA)
                                + ". El resto se paga antes de la primera clase.",
                "/mis-cursos");

        return new AlumnoInscripto(
                SolicitanteResumen.de(ficha),
                creada.inscripcion(),
                cuenta.usuario(),
                cuenta.passwordTemporal(),
                cuenta.cuentaNueva(),
                senia,
                moneda,
                vence);
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
