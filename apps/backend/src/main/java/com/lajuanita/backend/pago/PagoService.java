package com.lajuanita.backend.pago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.dinero.Importe;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.pago.dto.AltaPagoRequest;
import com.lajuanita.backend.pago.dto.CajaDelPeriodo;
import com.lajuanita.backend.pago.dto.CajaDelPeriodo.PorMedioDePago;
import com.lajuanita.backend.pago.dto.Deudor;
import com.lajuanita.backend.pago.dto.EdicionPagoRequest;
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

        // Los dos caminos de `V19` §1: cuenta, o nombre escrito. El DTO ya
        // garantiza que hay uno (`isPagadorIdentificado`) y el CHECK lo vuelve a
        // exigir en la base; acá solo se elige por cuál entrar.
        if (solicitud.idUsuario() != null) {
            pago.setUsuario(usuarios.findById(solicitud.idUsuario())
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No existe el usuario " + solicitud.idUsuario() + ".")));
        } else {
            pago.setNombrePagadorExterno(normalizar(solicitud.nombrePagadorExterno()));
            pago.setContactoPagadorExterno(normalizar(solicitud.contactoPagadorExterno()));
        }
        pago.setIdUsuarioRegistra(idAutor);

        if (solicitud.idInscripcion() != null) {
            // **Saldar una inscripción sí exige cuenta**, y no es una regla nueva:
            // es la de `buscarInscripcion` —"esa inscripción es de otra persona"—
            // aplicada al caso en que no hay persona. Una `inscripcion` cuelga de
            // un `alumno`, que cuelga de un `usuario`; quien no tiene cuenta no
            // puede tener inscripción, así que el pago se acreditaría en una cuenta
            // que no es de nadie. Se dice acá para que el error explique qué hacer
            // en vez de morir con un NPE.
            if (pago.getUsuario() == null) {
                throw new SolicitudInvalidaException(
                        "Para saldar un curso el pago tiene que ir a nombre de la cuenta del alumno.");
            }
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

        return PagoResumen.de(pagos.saveAndFlush(pago));
    }

    /**
     * Corrige un pago mal cargado (`V19` §2, `mejoras.md` §9.3).
     *
     * <p><b>La firma se escribe siempre, aunque el valor no cambie</b>, y eso no es
     * redundante: `V19` hereda de `V7` el límite de que el trigger exige que la
     * columna <i>no esté en null</i>, no que esta edición haya declarado su autor.
     * Sin llamar a {@code firmarEdicion} en cada pasada, la segunda corrección
     * pasaría con el autor de la primera.
     *
     * <p>El {@code flush} tiene el mismo motivo que en {@link #anular}: sin él el
     * UPDATE viaja recién en el commit y el 409 del trigger llegaría como un error
     * del final de la transacción, sin poder atribuirlo a esta operación.
     */
    @Transactional
    public PagoResumen editar(Long id, EdicionPagoRequest solicitud, Long idAutor) {
        Pago pago = buscar(id);

        // Un pago anulado es historia: corregirlo volvería a moverlo en la caja,
        // que es justo lo que la anulación vino a deshacer. Y su motivo escrito
        // quedaría explicando una fila que ya no es la que se anuló.
        if (pago.getEstadoPago() == EstadoPago.ANULADO) {
            throw new SolicitudInvalidaException(
                    "Ese pago está anulado: no se edita. Si hace falta, cargá uno nuevo.");
        }

        pago.setConcepto(normalizar(solicitud.concepto()));
        pago.setMonto(solicitud.monto());
        pago.setMoneda(solicitud.moneda());
        pago.setCotizacionDolar(solicitud.cotizacionDolar());
        pago.setMedioPago(solicitud.medioPago());
        pago.setDescuentoPorcentaje(solicitud.descuentoPorcentaje() == null
                ? BigDecimal.ZERO
                : solicitud.descuentoPorcentaje());
        pago.setMotivoDescuento(normalizar(solicitud.motivoDescuento()));
        pago.setFechaPago(solicitud.fechaPago());

        // El comprobante no está en esta lista, y no es un olvido: desde `V21` es
        // una fila propia con su firma, que se adjunta y se invalida por su propio
        // endpoint. Editar un pago no toca su respaldo.
        pago.firmarEdicion(idAutor);

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

        // El flush no es decorativo: sin él el UPDATE viaja recién en el commit,
        // y hasta entonces esta respuesta describe una fila que la base todavía
        // no aceptó. `pago_anulacion_justificada` tiene que hablar ACÁ, donde el
        // error se puede atribuir a esta operación y no a "algo del final de la
        // transacción". Es la misma razón por la que el alta usa `saveAndFlush`.
        pagos.flush();
        return PagoResumen.de(pago);
    }

    // La invalidación del comprobante vivía acá y se mudó a `ComprobanteService`
    // con `V21`: dejó de ser una marca sobre el pago para ser una fila con su
    // archivo, su firma y su propio ciclo. El pago no sabe cuál de sus respaldos
    // sirve — cada respaldo lo dice de sí mismo.

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
                saldos.add(new SaldoPorMoneda(moneda.name(),
                        Importe.normalizar(entro), Importe.normalizar(debe)));
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
                    Importe.normalizar(total),
                    Importe.normalizar(pagadoAcá),
                    Importe.normalizar(saldo),
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
                            Importe.normalizar((BigDecimal) fila[2]),
                            ((Number) fila[3]).longValue()));
        }

        // Las dos monedas siempre, aunque una no tenga movimientos: "en dólares
        // no entró nada este mes" es un dato, y una fila que falta se lee como
        // que el sistema la perdió. Es la misma decisión que el informe de uso.
        return List.of(Moneda.values()).stream().map(moneda -> {
            BigDecimal[] m = montos.get(moneda.name());
            long[] c = cantidades.get(moneda.name());
            return new CajaDelPeriodo(moneda.name(),
                    Importe.normalizar(m[0]), Importe.normalizar(m[1]),
                    Importe.normalizar(m[0].subtract(m[1])), Importe.normalizar(m[2]),
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

        // Desde `V19` una fila puede no tener cuenta detrás, así que solo se piden
        // las que sí la tienen. Sin el filtro, el `findAllById` recibe un null y
        // revienta antes de llegar a armar la respuesta.
        Map<Long, Usuario> personas = new HashMap<>();
        usuarios.findAllById(filas.stream()
                        .map(f -> f[0])
                        .filter(Objects::nonNull)
                        .map(id -> ((Number) id).longValue())
                        .toList())
                .forEach(u -> personas.put(u.getId(), u));

        return filas.stream().map(fila -> {
            LocalDate desde = (LocalDate) fila[6];
            int dias = (int) ChronoUnit.DAYS.between(desde, hoy);
            Moneda moneda = (Moneda) fila[3];
            BigDecimal adeudado = Importe.normalizar((BigDecimal) fila[4]);
            long cuantos = ((Number) fila[5]).longValue();

            // El deudor sin cuenta entra con lo único que se sabe de él: su nombre
            // y su contacto. **No se lo omite** — una deuda que no aparece en esta
            // pantalla es una deuda que nadie va a ir a cobrar, y es exactamente el
            // modo de falla que `mejoras.md` §9.1 anota como el riesgo de `V19`.
            if (fila[0] == null) {
                return new Deudor(null, (String) fila[1], null, null, (String) fila[2],
                        moneda.name(), adeudado, cuantos, desde, dias, dias > DIAS_PARA_VENCER);
            }

            Usuario persona = personas.get(((Number) fila[0]).longValue());
            return new Deudor(persona.getId(), persona.getNombre(), persona.getApellido(),
                    persona.getEmail(), persona.getTelefono(),
                    moneda.name(), adeudado, cuantos, desde, dias, dias > DIAS_PARA_VENCER);
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
