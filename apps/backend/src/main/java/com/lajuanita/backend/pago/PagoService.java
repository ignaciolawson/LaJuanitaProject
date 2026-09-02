package com.lajuanita.backend.pago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
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
import com.lajuanita.backend.pago.dto.TotalDeLinea;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.tablero.LineaDeNegocio;
import com.lajuanita.backend.tablero.LineaDeNegocio.Grupo;
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

    /**
     * El listado, con sus filtros.
     *
     * <p><b>{@code grupo} es la solapa</b> (`mejoras.md` §13 · B2): programas,
     * servicios, equipos o sin destino. Reemplaza al viejo filtro por
     * {@code destino} de §12 · B1, y no es el mismo con otro nombre: aquél
     * filtraba por <i>a qué apunta el pago</i> mientras la etiqueta de esa misma
     * fila mostraba la <i>línea de negocio</i>, así que el filtro decía "Reserva de
     * sala" y la fila decía "Cursos". Ahora las dos cosas salen de
     * {@link LineaDeNegocio}.
     */
    @Transactional(readOnly = true)
    public Pagina<PagoResumen> listar(String buscar, Long idUsuario, EstadoPago estado,
            Moneda moneda, Grupo grupo, LocalDate desde, LocalDate hasta,
            int pagina, int tamanio) {

        // Sin `Sort`: la consulta es nativa y trae su propio ORDER BY. Un Sort acá
        // haría que Spring pegue el orden con nombres de propiedad de la entidad,
        // que no son los de las columnas.
        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio));

        Page<Long> ids = pagos.idsListados(idUsuario,
                estado == null ? null : estado.name(),
                moneda == null ? null : moneda.name(),
                grupo == null ? TODAS_LAS_LINEAS : grupo.lineas(),
                desde, hasta, Busqueda.patron(buscar), paginado);

        Map<Long, String> lineas = lineasDe(ids.getContent());

        List<PagoResumen> filas = enElOrdenPedido(ids.getContent()).stream()
                .map(pago -> PagoResumen.de(pago, lineas.get(pago.getId())))
                .toList();

        return Pagina.de(new PageImpl<>(filas, paginado, ids.getTotalElements()));
    }

    /**
     * Cuántos pagos y cuánta plata hay en cada solapa, con los filtros puestos
     * (`mejoras.md` §13 · B2).
     *
     * <p><b>Devuelve una fila por línea, y cada una dice a qué solapa pertenece.</b>
     * Agrupar en SQL obligaría a meter el mapa de {@link Grupo} adentro de la
     * consulta; dejar que agrupe la pantalla sería tener el mapa dos veces, y una
     * solapa terminaría mostrando un número que no coincide con lo que lista. Así,
     * la suma la hace el front y el criterio lo pone {@link Grupo#de(String)}, que
     * es el mismo que arma el filtro.
     */
    @Transactional(readOnly = true)
    public List<TotalDeLinea> totalesPorLinea(String buscar, Long idUsuario, EstadoPago estado,
            Moneda moneda, LocalDate desde, LocalDate hasta) {

        List<TotalDeLinea> totales = new ArrayList<>();

        for (Object[] fila : pagos.totalesPorLinea(idUsuario,
                estado == null ? null : estado.name(),
                moneda == null ? null : moneda.name(),
                desde, hasta, Busqueda.patron(buscar), nombresDe(EstadoPago.ENTRARON))) {

            String linea = (String) fila[0];
            totales.add(new TotalDeLinea(
                    linea,
                    Grupo.de(linea),
                    Moneda.valueOf((String) fila[1]),
                    ((Number) fila[2]).longValue(),
                    (BigDecimal) fila[3]));
        }
        return totales;
    }

    /**
     * El detalle de la página, en el orden que decidió la consulta de ids.
     *
     * <p>La consulta con los {@code JOIN FETCH} no ordena a propósito —sería una
     * segunda definición del orden de la pantalla—, así que el orden se repone acá
     * contra la lista de ids, que es la única que lo sabe.
     *
     * <p>Con la lista vacía <b>no consulta</b>: un {@code IN} sin elementos es un
     * error de sintaxis en Postgres, y una página vacía es lo más común del mundo
     * apenas alguien filtra por algo que no tiene filas. Es el mismo cuidado que
     * ya tenía {@link #lineasDe}.
     */
    private List<Pago> enElOrdenPedido(List<Long> ids) {
        if (ids.isEmpty()) return List.of();

        Map<Long, Pago> porId = new HashMap<>();
        for (Pago pago : pagos.porIdsConDetalle(ids)) {
            porId.put(pago.getId(), pago);
        }

        List<Pago> ordenados = new ArrayList<>(ids.size());
        for (Long id : ids) {
            Pago pago = porId.get(id);
            if (pago != null) ordenados.add(pago);
        }
        return ordenados;
    }

    /** Los estados como texto, que es lo que espera una consulta nativa. */
    private static List<String> nombresDe(Collection<EstadoPago> estados) {
        List<String> nombres = new ArrayList<>();
        for (EstadoPago estado : estados) {
            nombres.add(estado.name());
        }
        return nombres;
    }

    /**
     * Todas las líneas, para cuando no hay solapa elegida.
     *
     * <p>⚠️ No es {@code null} ni una lista vacía: el {@code IN} de la consulta
     * necesita elementos siempre. Ver {@code PagoRepository.idsListados}.
     */
    private static final List<String> TODAS_LAS_LINEAS =
            java.util.Arrays.stream(LineaDeNegocio.values()).map(LineaDeNegocio::name).toList();

    @Transactional(readOnly = true)
    public PagoResumen porId(Long id) {
        Pago pago = buscar(id);
        return PagoResumen.de(pago, lineasDe(List.of(id)).get(id));
    }

    /**
     * La línea de negocio de un puñado de pagos, en una sola consulta.
     *
     * <p>Con la lista vacía <b>no consulta</b>: un {@code IN ()} sin elementos es
     * un error de sintaxis en Postgres, y una página vacía es lo más común del
     * mundo apenas alguien filtra por algo que no tiene filas.
     */
    private Map<Long, String> lineasDe(List<Long> ids) {
        if (ids.isEmpty()) return Map.of();

        Map<Long, String> lineas = new HashMap<>();
        for (Object[] fila : pagos.lineasDe(ids)) {
            lineas.put(((Number) fila[0]).longValue(), (String) fila[1]);
        }
        return lineas;
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

    /**
     * Entró la plata que estaba anotada como deuda (`mejoras.md` §13 · C1).
     *
     * <p><b>Este endpoint faltaba, y la prereserva lo puso en evidencia.</b> Hasta
     * hoy una fila en {@code DEBE} no tenía forma de pasar a cobrada:
     * {@code estadoPago} no se edita —y por buenos motivos, ver
     * {@link EdicionPagoRequest}— así que el único camino era anularla y cargar
     * otra. Con una deuda de inscripción eso alcanza; con la de una prereserva
     * <b>no puede funcionar</b>, porque anularla la dejaría sin nada detrás y el
     * trigger de `V24` la rechaza. El circuito entero —apartar el horario y
     * cobrarlo después— depende de que esta transición exista.
     *
     * <p><b>Es su propio endpoint y no un campo de la edición</b>, por lo mismo que
     * la anulación: son transiciones con reglas propias, y dos caminos hacia la
     * misma transición con distinta exigencia es como se termina cobrando algo que
     * nadie miró.
     *
     * <p>Sólo va de {@link EstadoPago#ADEUDADOS} a {@link EstadoPago#ENTRARON}: no
     * es un editor de estados. Un pago ya cobrado que se quiere corregir se anula,
     * que es el camino que ya existe y que deja la explicación escrita.
     */
    @Transactional
    public PagoResumen cobrar(Long id, EstadoPago comoEntro, Long idAutor) {
        Pago pago = buscar(id);

        if (!EstadoPago.ADEUDADOS.contains(pago.getEstadoPago())) {
            throw new SolicitudInvalidaException(
                    "Ese pago no está anotado como deuda (está " + pago.getEstadoPago()
                            + "), así que no hay nada que cobrar.");
        }
        if (!comoEntro.entro()) {
            throw new SolicitudInvalidaException(
                    "Cobrar deja el pago en SENADO o en PAGADO, no en " + comoEntro + ".");
        }

        pago.setEstadoPago(comoEntro);
        pago.firmarEdicion(idAutor);

        // ⚠️ El flush no es decorativo: el trigger de `V11` que vigila la plata
        // detrás de una reserva es INMEDIATO, y abajo hay que leer la reserva ya
        // con el pago adentro. Sin esto, el UPDATE viaja recién en el commit y la
        // confirmación de la prereserva se decidiría sobre datos viejos.
        pagos.saveAndFlush(pago);

        confirmarLaPrereserva(pago, idAutor);

        return PagoResumen.de(pago);
    }

    /**
     * Si esta plata sostenía una prereserva, la reserva queda confirmada.
     *
     * <p><b>Es un acto y no dos.</b> Cobrar y confirmar separados dejan reservas
     * pagas que nadie confirmó, esperando que alguien se acuerde de apretar un
     * segundo botón — y mientras tanto el vencimiento sigue corriendo sobre algo ya
     * abonado, así que el horario se cae igual.
     *
     * <p>Vive acá y no en un trigger a propósito: cambiar el estado de otra tabla
     * desde la base esconde la mitad del circuito en un lugar donde nadie la busca,
     * y este sistema ya eligió que las reglas <i>entre</i> módulos vivan en Java
     * cuando la base no las necesita para defenderse.
     */
    private void confirmarLaPrereserva(Pago pago, Long idAutor) {
        Reserva reserva = pago.getReserva();
        if (reserva != null && reserva.estaPreconfirmada()) {
            reserva.confirmar(idAutor);
            reservas.saveAndFlush(reserva);
        }
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
