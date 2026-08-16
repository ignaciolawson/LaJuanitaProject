package com.lajuanita.backend.pago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.pago.dto.AltaPagoRequest;
import com.lajuanita.backend.pago.dto.CajaDelPeriodo;
import com.lajuanita.backend.pago.dto.CajaDelPeriodo.PorMedioDePago;
import com.lajuanita.backend.pago.dto.Deudor;
import com.lajuanita.backend.pago.dto.EstadoDeCuenta;
import com.lajuanita.backend.pago.dto.EstadoDeCuenta.ContratoDelAlumno;
import com.lajuanita.backend.pago.dto.EstadoDeCuenta.SaldoPorMoneda;
import com.lajuanita.backend.pago.dto.PagoResumen;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * Módulo 3 — la plata que entra.
 *
 * <p><b>Cuatro de las reglas de este módulo las impone la base</b>, igual que en
 * los dos anteriores: el monto positivo, la cotización obligatoria en dólares, el
 * descuento justificado y el destino único son CHECK de `V1`; que no se borre un
 * pago es un trigger de `V6`; que anular exija autor, fecha y motivo es un CHECK
 * de `V7`. Los DTO repiten las cuatro primeras <b>para marcar el campo</b>, no
 * para reemplazarlas.
 *
 * <p>Lo que sí vive acá son las cuentas que ninguna constraint puede hacer:
 *
 * <ul>
 *   <li><b>El estado de cuenta</b>, que resta por moneda y nunca entre monedas.
 *   <li><b>La caja</b>, separada por moneda por lo mismo (§2.3).
 *   <li><b>La antigüedad de una deuda</b>, contada desde el renglón más viejo.
 *   <li><b>La firma de las dos excepciones</b>: el autor sale del token y la
 *       fecha del reloj, nunca del cuerpo del pedido.
 * </ul>
 */
@Service
public class PagoService {

    /**
     * A partir de acá una deuda está vencida.
     *
     * <p>Es la regla dura de §6 — <i>"alerta automática si alguien lleva más de
     * 7 días en estado 'debe'"</i>—, y vive en una constante porque cuando exista
     * la notificación automática las dos tienen que mirar el mismo número.
     */
    public static final int DIAS_PARA_VENCER = 7;

    /** Techo del período de la caja, por lo mismo que el informe de uso: un año. */
    public static final int MAXIMO_DE_DIAS_DEL_PERIODO = 366;

    private final PagoRepository pagos;
    private final UsuarioRepository usuarios;
    private final InscripcionRepository inscripciones;
    private final ReservaRepository reservas;
    private final EgresoRepository egresos;

    public PagoService(PagoRepository pagos,
            UsuarioRepository usuarios,
            InscripcionRepository inscripciones,
            ReservaRepository reservas,
            EgresoRepository egresos) {
        this.pagos = pagos;
        this.usuarios = usuarios;
        this.inscripciones = inscripciones;
        this.reservas = reservas;
        this.egresos = egresos;
    }

    // == Listado y alta =======================================================

    @Transactional(readOnly = true)
    public Pagina<PagoResumen> listar(String buscar, Long idUsuario, EstadoPago estado,
            Moneda moneda, LocalDate desde, LocalDate hasta, int pagina, int tamanio) {

        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio),
                Sort.by(Sort.Direction.DESC, "fechaPago").and(Sort.by(Sort.Direction.DESC, "id")));

        return Pagina.de(pagos.listar(idUsuario, estado,
                moneda == null ? null : moneda.name(),
                desde, hasta, Busqueda.patron(buscar), paginado)
                .map(PagoResumen::de));
    }

    @Transactional(readOnly = true)
    public PagoResumen porId(Long id) {
        return PagoResumen.de(buscar(id));
    }

    @Transactional
    public PagoResumen registrar(AltaPagoRequest solicitud, Long idAutor) {
        Pago pago = new Pago();
        pago.setUsuario(usuarios.findById(solicitud.idUsuario())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + solicitud.idUsuario() + ".")));
        pago.setIdUsuarioRegistra(idAutor);

        if (solicitud.idInscripcion() != null) {
            pago.setInscripcion(buscarInscripcion(solicitud.idInscripcion(), pago.getUsuario()));
        }
        if (solicitud.idReserva() != null) {
            pago.setReserva(buscarReserva(solicitud.idReserva()));
        }
        pago.setIdTrabajoMastering(solicitud.idTrabajoMastering());
        pago.setIdVentaEquipo(solicitud.idVentaEquipo());

        pago.setConcepto(normalizar(solicitud.concepto()));
        pago.setMonto(solicitud.monto());
        pago.setMoneda(solicitud.moneda());
        pago.setCotizacionDolar(solicitud.cotizacionDolar());
        pago.setMedioPago(solicitud.medioPago());

        if (solicitud.descuentoPorcentaje() != null) {
            pago.setDescuentoPorcentaje(solicitud.descuentoPorcentaje());
            pago.setMotivoDescuento(normalizar(solicitud.motivoDescuento()));
        }
        if (solicitud.estadoPago() != null) {
            pago.setEstadoPago(solicitud.estadoPago());
        }
        if (solicitud.fechaPago() != null) {
            pago.setFechaPago(solicitud.fechaPago());
        }
        pago.setComprobantePath(normalizar(solicitud.comprobantePath()));

        return PagoResumen.de(pagos.saveAndFlush(pago));
    }

    // == Las dos excepciones ==================================================

    /**
     * Anula un pago mal cargado (P15).
     *
     * <p><b>No se edita y no se borra</b>: `V6` prohíbe el DELETE y `V7` exige que
     * la baja quede firmada. Anular saca el monto del balance, que para la caja
     * es lo mismo que borrarlo, así que lleva las mismas tres exigencias que toda
     * otra excepción del esquema.
     */
    @Transactional
    public PagoResumen anular(Long id, String motivo, Long idAutor) {
        Pago pago = buscar(id);

        // La base no lo impide —anular dos veces cumple la constraint igual—,
        // pero sí importa: la segunda anulación pisa el autor y el motivo de la
        // primera, y con eso se pierde quién dio de baja la plata de verdad.
        if (pago.getEstadoPago() == EstadoPago.ANULADO) {
            throw new SolicitudInvalidaException("Ese pago ya está anulado.");
        }

        pago.anular(idAutor, motivo.trim());
        return PagoResumen.de(pago);
    }

    /** Marca el comprobante como inválido. No lo borra — regla dura de §6. */
    @Transactional
    public PagoResumen invalidarComprobante(Long id, String motivo, Long idAutor) {
        Pago pago = buscar(id);

        if (pago.getComprobantePath() == null) {
            throw new SolicitudInvalidaException("Ese pago no tiene comprobante cargado.");
        }
        if (pago.isComprobanteInvalido()) {
            throw new SolicitudInvalidaException("Ese comprobante ya está marcado como inválido.");
        }

        pago.invalidarComprobante(idAutor, motivo.trim());
        return PagoResumen.de(pago);
    }

    // == Estado de cuenta =====================================================

    /**
     * Qué contrató una persona, qué pagó y qué debe (§6, pantalla 2).
     *
     * <p><b>Nunca resta entre monedas.</b> Un curso de USD 300 con un pago de
     * ARS 200.000 no tiene un saldo: tiene dos renglones. Unificarlos exigiría
     * elegir una cotización y el número resultante no correspondería a ninguna
     * caja real (§2.3).
     */
    @Transactional(readOnly = true)
    public EstadoDeCuenta estadoDeCuenta(Long idUsuario) {
        Usuario persona = usuarios.findById(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + idUsuario + "."));

        List<Pago> suyos = pagos.deLaPersona(idUsuario);

        Map<Moneda, BigDecimal> pagado = new HashMap<>();
        Map<Moneda, BigDecimal> adeudado = new HashMap<>();
        for (Pago pago : suyos) {
            if (pago.getEstadoPago().entro()) {
                pagado.merge(pago.getMoneda(), pago.getMonto(), BigDecimal::add);
            } else if (EstadoPago.ADEUDADOS.contains(pago.getEstadoPago())) {
                adeudado.merge(pago.getMoneda(), pago.getMonto(), BigDecimal::add);
            }
        }

        List<SaldoPorMoneda> saldos = new ArrayList<>();
        for (Moneda moneda : Moneda.values()) {
            BigDecimal entro = pagado.getOrDefault(moneda, BigDecimal.ZERO);
            BigDecimal debe = adeudado.getOrDefault(moneda, BigDecimal.ZERO);
            // Una moneda sin ningún movimiento no aporta un renglón de ceros:
            // acá el cero no es información, a diferencia del informe de uso.
            if (entro.signum() != 0 || debe.signum() != 0) {
                saldos.add(new SaldoPorMoneda(moneda.name(), entro, debe));
            }
        }

        return new EstadoDeCuenta(persona.getId(), persona.getNombre(), persona.getApellido(),
                persona.getEmail(), saldos, contratosDe(idUsuario),
                suyos.stream().map(PagoResumen::de).toList());
    }

    /** Las inscripciones de la persona, cada una con cuánto lleva cobrado. */
    private List<ContratoDelAlumno> contratosDe(Long idUsuario) {
        List<Inscripcion> contratos = inscripciones.deLaPersona(idUsuario);
        if (contratos.isEmpty()) {
            // `IN ()` no es SQL válido: sin esto, alguien sin inscripciones revienta.
            return List.of();
        }

        Map<Long, Map<String, BigDecimal>> cobrado = new HashMap<>();
        List<Long> ids = contratos.stream().map(Inscripcion::getId).toList();
        for (Object[] fila : pagos.cobradoPorInscripcion(ids, EstadoPago.ENTRARON)) {
            cobrado.computeIfAbsent(((Number) fila[0]).longValue(), id -> new HashMap<>())
                    .put(((Moneda) fila[1]).name(), (BigDecimal) fila[2]);
        }

        return contratos.stream().map(inscripcion -> {
            // Solo lo cobrado EN LA MONEDA DEL CONTRATO cancela el contrato.
            BigDecimal pagadoAcá = cobrado
                    .getOrDefault(inscripcion.getId(), Map.of())
                    .getOrDefault(inscripcion.getMoneda().name(), BigDecimal.ZERO);
            BigDecimal total = inscripcion.getPrecioTotal();
            BigDecimal saldo = total.subtract(pagadoAcá);

            return new ContratoDelAlumno(
                    inscripcion.getId(),
                    inscripcion.getDisciplina().name(),
                    inscripcion.getNivel() == null ? null : inscripcion.getNivel().name(),
                    inscripcion.getEstado().name(),
                    inscripcion.getMoneda().name(),
                    total,
                    pagadoAcá,
                    saldo,
                    // El 50% de §13: si ya lo cubrió, la seña está hecha.
                    pagadoAcá.multiply(BigDecimal.TWO).compareTo(total) >= 0,
                    saldo.signum() <= 0);
        }).toList();
    }

    // == Caja y deudores ======================================================

    /**
     * La caja del período, <b>una fila por moneda</b> (§6, pantalla 3).
     *
     * <p>Incluye los egresos porque *"¿cuánto quedó?"* no se contesta con los
     * ingresos solos — es justamente el cruce Excel↔Notion que hoy se hace a mano.
     */
    @Transactional(readOnly = true)
    public List<CajaDelPeriodo> caja(LocalDate desde, LocalDate hasta) {
        verificarPeriodo(desde, hasta);

        Map<String, BigDecimal[]> montos = new HashMap<>();
        Map<String, long[]> cantidades = new HashMap<>();
        for (Moneda moneda : Moneda.values()) {
            montos.put(moneda.name(), new BigDecimal[] {
                    BigDecimal.ZERO, BigDecimal.ZERO, BigDecimal.ZERO });
            cantidades.put(moneda.name(), new long[2]);
        }

        for (Object[] fila : pagos.cajaPorMoneda(desde, hasta, EstadoPago.ENTRARON, EstadoPago.ADEUDADOS)) {
            String moneda = ((Moneda) fila[0]).name();
            montos.get(moneda)[0] = (BigDecimal) fila[1];
            cantidades.get(moneda)[0] = ((Number) fila[2]).longValue();
            montos.get(moneda)[2] = (BigDecimal) fila[3];
        }
        for (Object[] fila : egresos.porMoneda(desde, hasta)) {
            String moneda = ((Moneda) fila[0]).name();
            montos.get(moneda)[1] = (BigDecimal) fila[1];
            cantidades.get(moneda)[1] = ((Number) fila[2]).longValue();
        }

        Map<String, List<PorMedioDePago>> porMedio = new HashMap<>();
        for (Object[] fila : pagos.cajaPorMedio(desde, hasta, EstadoPago.ENTRARON)) {
            porMedio.computeIfAbsent(((Moneda) fila[0]).name(), m -> new ArrayList<>())
                    .add(new PorMedioDePago(((MedioPago) fila[1]).name(),
                            (BigDecimal) fila[2], ((Number) fila[3]).longValue()));
        }

        // Las dos monedas siempre, aunque una no tenga movimientos: "en dólares
        // no entró nada este mes" es un dato, y una fila que falta se lee como
        // que el sistema la perdió. Es la misma decisión que el informe de uso.
        return List.of(Moneda.values()).stream().map(moneda -> {
            BigDecimal[] m = montos.get(moneda.name());
            long[] c = cantidades.get(moneda.name());
            return new CajaDelPeriodo(moneda.name(), m[0], m[1], m[0].subtract(m[1]), m[2],
                    c[0], c[1], porMedio.getOrDefault(moneda.name(), List.of()));
        }).toList();
    }

    /** Quién debe, cuánto y hace cuántos días (§6, pantalla 4). */
    @Transactional(readOnly = true)
    public List<Deudor> deudores() {
        LocalDate hoy = LocalDate.now();
        List<Object[]> filas = pagos.deudores(EstadoPago.ADEUDADOS);
        if (filas.isEmpty()) {
            return List.of();
        }

        Map<Long, Usuario> personas = new HashMap<>();
        usuarios.findAllById(filas.stream().map(f -> ((Number) f[0]).longValue()).toList())
                .forEach(u -> personas.put(u.getId(), u));

        return filas.stream().map(fila -> {
            Usuario persona = personas.get(((Number) fila[0]).longValue());
            LocalDate desde = (LocalDate) fila[4];
            int dias = (int) ChronoUnit.DAYS.between(desde, hoy);

            return new Deudor(persona.getId(), persona.getNombre(), persona.getApellido(),
                    persona.getEmail(), persona.getTelefono(),
                    ((Moneda) fila[1]).name(), (BigDecimal) fila[2],
                    ((Number) fila[3]).longValue(), desde, dias, dias > DIAS_PARA_VENCER);
        }).toList();
    }

    // -------------------------------------------------------------------------

    private void verificarPeriodo(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw new SolicitudInvalidaException("La fecha de fin no puede ser anterior a la de inicio.");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) > MAXIMO_DE_DIAS_DEL_PERIODO) {
            throw new SolicitudInvalidaException("La caja se pide de a un año como máximo.");
        }
    }

    private Pago buscar(Long id) {
        return pagos.porIdConDetalle(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el pago " + id + "."));
    }

    /**
     * La inscripción tiene que ser <b>de quien paga</b>.
     *
     * <p>Ninguna FK lo impide: {@code pago.id_usuario} y {@code pago.id_inscripcion}
     * son dos columnas sueltas, así que se puede acreditar el pago de Juan contra
     * el curso de Ana y las dos cuentas quedan mal en silencio. Es el mismo hueco
     * que `V1` §8.2 tapó del lado de las clases, con un trigger, y del que acá se
     * ocupa el servicio porque la inscripción cuelga de `alumno` y no de `usuario`.
     */
    private Inscripcion buscarInscripcion(Long id, Usuario quienPaga) {
        Inscripcion inscripcion = inscripciones.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la inscripción " + id + "."));

        if (!inscripcion.getAlumno().getUsuario().getId().equals(quienPaga.getId())) {
            throw new SolicitudInvalidaException(
                    "Esa inscripción es de otra persona: el pago quedaría acreditado en la cuenta equivocada.");
        }
        return inscripcion;
    }

    private Reserva buscarReserva(Long id) {
        return reservas.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe la reserva " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
