package com.lajuanita.backend.mastering;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.mastering.dto.AltaTrabajoRequest;
import com.lajuanita.backend.mastering.dto.CobroRequest;
import com.lajuanita.backend.mastering.dto.EdicionTrabajoRequest;
import com.lajuanita.backend.mastering.dto.TrabajoDelPortal;
import com.lajuanita.backend.mastering.dto.TrabajoResumen;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.PagoRepository;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.pago.dto.AltaPagoRequest;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.profesor.ProfesorRepository;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * Mix & Mastering (§9, Módulo 6).
 *
 * <p><b>Casi ninguna regla de este módulo está en esta clase</b>, y conviene
 * saberlo antes de agregarle una: el premaster no se libera sin pago (`V1` §8.4),
 * el estado no retrocede (`V1` §8.5), el pago que respalda un premaster liberado no
 * se puede anular (`V6` §6) y la fila no se borra (`V6` §7). Las cuatro viven en la
 * base desde antes de que existiera este código, y lo que hace el service es
 * <b>darles la forma de una operación</b> —liberar, avanzar, cobrar— y dejar que la
 * base rechace lo que no corresponde. {@code ManejadorDeErrores} traduce.
 *
 * <p><b>Lo que sí decide acá, y no podría decidirlo la base:</b>
 *
 * <ul>
 *   <li><b>No se libera un premaster que no está cargado</b>, ni se entrega un
 *       master que no lo está. La base solo mira el pago; liberar con
 *       {@code url_premaster} vacío es marcar como entregado algo que no existe,
 *       y el cliente ve un estado que no le da nada.
 *   <li><b>Quién escribe cada estado</b> (P79, §20). Desde la octava barrida no
 *       hay un "mover a" genérico: {@link #confirmar}, {@link #entregar} y
 *       {@link #cancelar} son tres hechos con su condición, {@code PAGADO} lo
 *       escriben sólo {@link #cobrar} y {@link #entregar} cuando lo cobrado cubre
 *       el precio, y {@code DEBE} lo escribe el scheduler
 *       ({@code TrabajoMasteringRepository.marcarEnDebe}). La escalera de `V1`
 *       §8.5 sigue siendo la que rechaza desde psql; esto es la forma.
 * </ul>
 */
@Service
public class MasteringService {

    private final TrabajoMasteringRepository trabajos;
    private final UsuarioRepository usuarios;
    private final ProfesorRepository profesores;
    private final PagoRepository pagosLeidos;

    /** Para el cobro. Igual que en {@code VentaEquipoService}, no hay ciclo. */
    private final PagoService pagos;

    public MasteringService(TrabajoMasteringRepository trabajos,
            UsuarioRepository usuarios,
            ProfesorRepository profesores,
            PagoRepository pagosLeidos,
            PagoService pagos) {

        this.trabajos = trabajos;
        this.usuarios = usuarios;
        this.profesores = profesores;
        this.pagosLeidos = pagosLeidos;
        this.pagos = pagos;
    }

    // == Lectura =============================================================

    @Transactional(readOnly = true)
    public Pagina<TrabajoResumen> listar(String buscar, EstadoTrabajo estado,
            int pagina, int tamanio) {

        // Lo último cargado primero: el tablero se abre para ver qué hay en curso.
        Pageable paginado = PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio),
                Sort.by(Sort.Direction.DESC, "id"));

        var encontrados = trabajos.listar(estado, Busqueda.patron(buscar), paginado);
        Map<Long, BigDecimal> cobrado = cobradoDe(encontrados.getContent());

        return Pagina.de(encontrados.map(t -> TrabajoResumen.de(t, cobrado.get(t.getId()))));
    }

    @Transactional(readOnly = true)
    public TrabajoResumen porId(Long id) {
        TrabajoMastering trabajo = buscar(id);
        return TrabajoResumen.de(trabajo, cobradoDe(List.of(trabajo)).get(id));
    }

    /**
     * Los trabajos de quien pide, para su portal.
     *
     * <p>La identidad sale del token y no de la URL, como todo {@code /api/me/**}:
     * no hay forma de pedir los de otro porque no hay dónde escribirlo.
     */
    @Transactional(readOnly = true)
    public List<TrabajoDelPortal> mios(Long idUsuario) {
        return trabajos.deLaPersona(idUsuario).stream()
                .map(TrabajoDelPortal::de)
                .toList();
    }

    // == Escritura ===========================================================

    @Transactional
    public TrabajoResumen registrar(AltaTrabajoRequest solicitud) {
        TrabajoMastering trabajo = new TrabajoMastering();

        if (solicitud.idClienteUsuario() != null) {
            trabajo.setCliente(buscarPersona(solicitud.idClienteUsuario()));
        }
        trabajo.setNombreClienteExterno(normalizar(solicitud.nombreClienteExterno()));
        trabajo.setContactoClienteExterno(normalizar(solicitud.contactoClienteExterno()));
        trabajo.setProfesorAsignado(buscarProfesor(solicitud.idProfesorAsignado()));

        trabajo.setTipoTrabajo(solicitud.tipoTrabajo());
        trabajo.setNombreTrack(solicitud.nombreTrack().trim());
        trabajo.setPrecioAcordado(solicitud.precioAcordado());
        if (solicitud.moneda() != null) {
            trabajo.setMoneda(solicitud.moneda());
        }
        trabajo.setCotizacionDolar(solicitud.cotizacionDolar());
        if (solicitud.revisionesIncluidas() != null) {
            trabajo.setRevisionesIncluidas(solicitud.revisionesIncluidas());
        }
        trabajo.setFechaEstimada(solicitud.fechaEstimada());
        trabajo.setUrlMaterialCliente(normalizar(solicitud.urlMaterialCliente()));
        trabajo.setNotasInternas(normalizar(solicitud.notasInternas()));

        // `saveAndFlush` porque el alta devuelve la fila y `fecha_creacion` la
        // escribe la base: sin el flush, Hibernate no la releyó todavía.
        return TrabajoResumen.de(trabajos.saveAndFlush(trabajo), null);
    }

    /**
     * Edita el expediente: presupuesto, fechas y entregables.
     *
     * <p>No toca el estado, ni las revisiones hechas, ni la liberación: los tres
     * tienen su propia operación porque los tres son un hecho, no un dato.
     *
     * <p><b>Dos cosas que este método rechaza desde la §20, y por qué:</b>
     *
     * <ul>
     *   <li><b>La fecha de entrega la pone {@link #entregar}</b> (P79 · 7). Acá
     *       sólo se <i>corrige</i> —el trabajo ya está entregado y la fecha estaba
     *       mal—; ponerla a mano en uno que no se entregó era la tercera forma de
     *       decir "entregado" sin que nada la atara a las otras dos, y borrarla en
     *       uno entregado dejaba el aviso de los 7 días sin desde cuándo contar.
     *   <li><b>La moneda no se cambia con plata adentro</b> (P81). El trigger de
     *       `V32` mira el pago que se inserta, no el trabajo que se edita: sin esto,
     *       cobrar en USD y después pasar el trabajo a ARS es la misma mentira por
     *       otra puerta — y "cobrado" volvería a ignorar un pago que existe.
     * </ul>
     */
    @Transactional
    public TrabajoResumen editar(Long id, EdicionTrabajoRequest solicitud) {
        TrabajoMastering trabajo = buscar(id);
        BigDecimal cobrado = cobradoDe(List.of(trabajo)).get(id);

        if (solicitud.moneda() != trabajo.getMoneda() && cobrado != null) {
            throw new SolicitudInvalidaException(
                    "Ese trabajo ya tiene cobros en " + trabajo.getMoneda()
                            + ": no se le puede cambiar la moneda. Anulá primero los pagos, desde Pagos.");
        }

        boolean entregado = estaEntregado(trabajo);
        if (!entregado && solicitud.fechaEntregaReal() != null) {
            throw new SolicitudInvalidaException(
                    "La fecha de entrega la pone \"Entregar\": ese trabajo todavía no se entregó.");
        }
        if (entregado && solicitud.fechaEntregaReal() == null) {
            throw new SolicitudInvalidaException(
                    "Un trabajo entregado tiene fecha de entrega: corregila, no la borres.");
        }

        trabajo.setProfesorAsignado(buscarProfesor(solicitud.idProfesorAsignado()));
        trabajo.setTipoTrabajo(solicitud.tipoTrabajo());
        trabajo.setNombreTrack(solicitud.nombreTrack().trim());
        trabajo.setPrecioAcordado(solicitud.precioAcordado());
        trabajo.setMoneda(solicitud.moneda());
        trabajo.setCotizacionDolar(solicitud.cotizacionDolar());
        trabajo.setRevisionesIncluidas(solicitud.revisionesIncluidas());
        trabajo.setFechaEstimada(solicitud.fechaEstimada());
        trabajo.setFechaEntregaReal(solicitud.fechaEntregaReal());
        trabajo.setUrlMaterialCliente(normalizar(solicitud.urlMaterialCliente()));
        trabajo.setUrlMaster(normalizar(solicitud.urlMaster()));
        trabajo.setUrlPremaster(normalizar(solicitud.urlPremaster()));
        trabajo.setNotasInternas(normalizar(solicitud.notasInternas()));

        return TrabajoResumen.de(trabajo, cobrado);
    }

    /**
     * Confirma el presupuesto: {@code A_CONFIRMAR → EN_PROCESO} (P79 · 1).
     *
     * <p>Exige precio acordado, y eso es lo que distingue "confirmado" de "a
     * confirmar": un trabajo entra sin precio porque se está presupuestando, y se
     * confirma cuando el presupuesto cerró.
     */
    @Transactional
    public TrabajoResumen confirmar(Long id) {
        TrabajoMastering trabajo = buscar(id);

        rechazarSiCancelado(trabajo, "confirmar");
        if (trabajo.getEstado() != EstadoTrabajo.A_CONFIRMAR) {
            throw new SolicitudInvalidaException("Ese trabajo ya está confirmado.");
        }
        exigirPrecio(trabajo, "confirmarlo");

        trabajo.setEstado(EstadoTrabajo.EN_PROCESO);
        trabajos.flush();

        return TrabajoResumen.de(trabajo, cobradoDe(List.of(trabajo)).get(id));
    }

    /**
     * Registra la entrega del master (P79 · 2). <b>Es el hecho que antes se decía
     * de tres formas y nada ataba</b>: el estado, la fecha y el link.
     *
     * <p>Escribe {@code fecha_entrega_real} en el mismo movimiento que el estado —
     * los tres trabajos ENTREGADO de la base de desarrollo tenían la fecha vacía,
     * y el aviso de §9 (<i>"7 días desde la entrega sin pago"</i>) la exige: nunca
     * iba a sonar. La fecha puede ser anterior a hoy (la carga y el hecho son dos
     * fechas, como {@code fechaPago}) y no puede ser futura: una entrega que
     * todavía no pasó no se registra.
     *
     * <p>Exige el link del master cargado, por el mismo argumento que
     * {@link #liberarPremaster} exige el del premaster: para el cliente, un
     * trabajo "entregado" sin link es una pantalla que dice "listo" y no le da
     * nada. Y exige precio, porque desde acá lo que queda es cobrar.
     *
     * <p><b>Si lo cobrado ya cubre el precio, entra directo en {@code PAGADO}.</b>
     * Un trabajo pagado por adelantado se quedaba en ENTREGADO y había que
     * moverlo a mano — con el `<select>` que esta barrida sacó.
     */
    @Transactional
    public TrabajoResumen entregar(Long id, LocalDate fecha) {
        TrabajoMastering trabajo = buscar(id);

        rechazarSiCancelado(trabajo, "entregar");
        if (estaEntregado(trabajo)) {
            throw new SolicitudInvalidaException("Ese trabajo ya está entregado.");
        }
        exigirPrecio(trabajo, "entregarlo");
        if (normalizar(trabajo.getUrlMaster()) == null) {
            throw new SolicitudInvalidaException(
                    "Todavía no cargaste el link del master: no hay nada que entregar.");
        }

        LocalDate entrega = fecha == null ? LocalDate.now() : fecha;
        if (entrega.isAfter(LocalDate.now())) {
            throw new SolicitudInvalidaException("La fecha de entrega no puede ser futura.");
        }

        trabajo.setFechaEntregaReal(entrega);
        trabajo.setEstado(EstadoTrabajo.ENTREGADO);
        BigDecimal cobrado = cobradoDe(List.of(trabajo)).get(id);
        if (quedaCubierto(trabajo, cobrado)) {
            trabajo.setEstado(EstadoTrabajo.PAGADO);
        }
        trabajos.flush();

        return TrabajoResumen.de(trabajo, cobrado);
    }

    /**
     * Cancela el trabajo (P79 · 4). Es la única baja: `V6` §7 prohíbe borrar.
     *
     * <p><b>Con plata viva detrás no se cancela</b>: primero se anula el pago, desde
     * Pagos. Es la misma regla que {@code VentaEquipoService.anular}, y por lo
     * mismo — un trabajo cancelado con su cobro vivo deja la plata contada en la
     * caja contra algo que se declara inexistente, y cascadear haría que una
     * acción firmada por una persona dé de baja una fila firmada por otra.
     */
    @Transactional
    public TrabajoResumen cancelar(Long id) {
        TrabajoMastering trabajo = buscar(id);

        if (trabajo.getEstado() == EstadoTrabajo.CANCELADO) {
            throw new SolicitudInvalidaException("Ese trabajo ya está cancelado.");
        }
        BigDecimal cobrado = cobradoDe(List.of(trabajo)).get(id);
        if (cobrado != null) {
            throw new SolicitudInvalidaException(
                    "Ese trabajo tiene cobros registrados. Anulá primero los pagos, desde Pagos.");
        }

        trabajo.setEstado(EstadoTrabajo.CANCELADO);
        trabajos.flush();

        return TrabajoResumen.de(trabajo, null);
    }

    /**
     * Suma una revisión.
     *
     * <p><b>De a una y con su propio endpoint</b>, en vez de un campo editable: el
     * número contesta *"¿este trabajo se pasó de lo que se vendió?"*, y un campo que
     * se escribe a mano no distingue "se hicieron cuatro" de "alguien puso cuatro".
     *
     * <p><b>Puede pasarse de las incluidas, y ahí está la alerta de §9.</b> Hasta
     * `V15` la base lo impedía —{@code V6} §3— y esa regla se sacó justamente
     * porque hacía imposible registrar el hecho que hay que avisar. El aviso lo da
     * la pantalla comparando los dos números; acá no se rechaza nada.
     */
    @Transactional
    public TrabajoResumen registrarRevision(Long id) {
        TrabajoMastering trabajo = buscar(id);

        rechazarSiCancelado(trabajo, "cargarle revisiones a");

        trabajo.registrarRevision();
        return TrabajoResumen.de(trabajo, cobradoDe(List.of(trabajo)).get(id));
    }

    /**
     * Libera el premaster. <b>Es la regla del módulo.</b>
     *
     * <p>Con un pago registrado, {@code motivo} viene vacío y el trigger de
     * `V1` §8.4 encuentra el pago y deja pasar. Sin pago y sin motivo, ese mismo
     * trigger rechaza con su texto —que explica la salida— y llega como 409.
     * Con motivo, se marca {@code liberado_sin_pago} y queda firmado.
     *
     * <p><b>Lo único que agrega este método a la base es la primera línea:</b> no se
     * libera lo que no está cargado. La base no lo mira porque para ella liberar es
     * un booleano; para el cliente, un premaster liberado sin link es una pantalla
     * que dice "listo" y no le da nada.
     */
    @Transactional
    public TrabajoResumen liberarPremaster(Long id, String motivo, Long idAutor) {
        TrabajoMastering trabajo = buscar(id);

        rechazarSiCancelado(trabajo, "liberar el premaster de");
        if (normalizar(trabajo.getUrlPremaster()) == null) {
            throw new SolicitudInvalidaException(
                    "Todavía no cargaste el link del premaster: no hay nada que liberar.");
        }

        trabajo.liberarPremaster(normalizar(motivo), buscarPersona(idAutor));
        trabajos.flush();

        return TrabajoResumen.de(trabajo, cobradoDe(List.of(trabajo)).get(id));
    }

    /**
     * Registra el cobro del trabajo, en la misma transacción.
     *
     * <p>Se delega en {@code PagoService} —igual que la seña de una reserva y el
     * cobro de una venta— porque las reglas de la plata son suyas y una segunda
     * copia es la que se olvida de una.
     *
     * <p><b>El pago va a nombre del cliente del trabajo, con cuenta o a nombre
     * escrito</b> (P78). Hasta la §20 el request traía un {@code idUsuario}
     * obligatorio y el formulario decía <i>"elegí a quién imputarlo"</i>: `V19`
     * había abierto {@code pago.id_usuario} para la venta a un comprador sin cuenta
     * y este módulo nunca lo adoptó. Medido en la base de desarrollo: tres
     * trabajos de tres clientes externos cobrados a nombre de tres empleados. El
     * trabajo ya identifica al cliente por uno de dos caminos
     * ({@code trabajo_cliente_identificado}); el pago hereda ese mismo camino, que
     * es exactamente lo que hace {@code VentaEquipoService.registrarElCobro}.
     *
     * <p><b>Y va en la moneda del trabajo</b> (P81, `V32`): el request no trae
     * moneda porque no hay decisión que tomar. Quien paga pesos por un precio en
     * dólares carga el pago en USD con la cotización del día — el campo existe
     * para eso desde `V1`.
     *
     * <p><b>El estado pasa a {@code PAGADO} solo si se dan las tres condiciones</b>,
     * y ninguna sobra:
     *
     * <ol>
     *   <li><b>El trabajo ya está entregado</b> ({@code ENTREGADO} o {@code DEBE}).
     *       Una seña sobre algo en proceso no lo vuelve un trabajo terminado, y
     *       {@code PAGADO} es el final de la escalera, no una etiqueta de plata.
     *       Si se cobra antes, {@link #entregar} lo lleva a PAGADO al entregar.
     *   <li><b>Hay precio acordado.</b> Sin él no hay contra qué comparar.
     *   <li><b>Lo cobrado alcanza el precio.</b> Con P81 siempre está en la misma
     *       moneda, así que la comparación ya no puede ignorar un pago.
     * </ol>
     *
     * <p>Si no se dan, el estado queda donde estaba y la pantalla muestra
     * "cobrado X de Y" — que es información, no un error.
     */
    @Transactional
    public TrabajoResumen cobrar(Long id, CobroRequest solicitud, Long idAutor) {
        TrabajoMastering trabajo = buscar(id);

        rechazarSiCancelado(trabajo, "cobrar");

        Usuario cliente = trabajo.getCliente();
        pagos.registrar(new AltaPagoRequest(
                cliente == null ? null : cliente.getId(),
                cliente == null ? trabajo.getNombreClienteExterno() : null,
                cliente == null ? trabajo.getContactoClienteExterno() : null,
                null, null, trabajo.getId(), null,
                "Mix & Mastering: " + trabajo.getNombreTrack(),
                solicitud.monto(),
                trabajo.getMoneda(),
                solicitud.cotizacionDolar(),
                solicitud.medioPago(),
                null, null,
                EstadoPago.PAGADO,
                solicitud.fechaPago()),
                idAutor);

        BigDecimal cobrado = cobradoDe(List.of(trabajo)).get(id);
        if (quedaCubierto(trabajo, cobrado)) {
            trabajo.setEstado(EstadoTrabajo.PAGADO);
        }

        return TrabajoResumen.de(trabajo, cobrado);
    }

    private boolean quedaCubierto(TrabajoMastering trabajo, BigDecimal cobrado) {
        return estaEntregado(trabajo)
                && trabajo.getEstado() != EstadoTrabajo.CANCELADO
                && trabajo.getPrecioAcordado() != null
                && cobrado != null
                && cobrado.compareTo(trabajo.getPrecioAcordado()) >= 0;
    }

    /**
     * "Entregado" es una sola pregunta desde la §20: el estado llegó a la entrega
     * <b>o</b> la fecha está escrita. Las dos cosas las escribe {@link #entregar}
     * juntas; la segunda mitad cubre las filas anteriores a la barrida.
     */
    private boolean estaEntregado(TrabajoMastering trabajo) {
        return switch (trabajo.getEstado()) {
            case ENTREGADO, DEBE, PAGADO -> true;
            case A_CONFIRMAR, EN_PROCESO, CANCELADO -> trabajo.getFechaEntregaReal() != null;
        };
    }

    private void rechazarSiCancelado(TrabajoMastering trabajo, String accion) {
        if (trabajo.getEstado() == EstadoTrabajo.CANCELADO) {
            throw new SolicitudInvalidaException(
                    "Ese trabajo está cancelado: no se puede " + accion + " un trabajo cancelado.");
        }
    }

    private void exigirPrecio(TrabajoMastering trabajo, String para) {
        if (trabajo.getPrecioAcordado() == null) {
            throw new SolicitudInvalidaException(
                    "Ese trabajo no tiene precio acordado: cargalo antes de " + para + ".");
        }
    }

    // == Auxiliares ==========================================================

    /**
     * Cuánto entró contra cada trabajo, <b>en la moneda del trabajo</b>.
     *
     * <p>La consulta agrupa por moneda y acá se descarta lo que está en otra: no es
     * que ese pago no exista, es que no se puede comparar con el precio sin una
     * cotización que nadie cargó. Es la misma decisión que toma la caja al no
     * mezclar pesos con dólares en un total.
     */
    private Map<Long, BigDecimal> cobradoDe(List<TrabajoMastering> lista) {
        if (lista.isEmpty()) {
            return Map.of();
        }

        Map<Long, Moneda> monedaDe = new HashMap<>();
        for (TrabajoMastering t : lista) {
            monedaDe.put(t.getId(), t.getMoneda());
        }

        Map<Long, BigDecimal> cobrado = new HashMap<>();
        for (Object[] fila : pagosLeidos.cobradoPorTrabajo(
                List.copyOf(monedaDe.keySet()), EstadoPago.ENTRARON)) {

            Long idTrabajo = (Long) fila[0];
            Moneda moneda = (Moneda) fila[1];
            if (monedaDe.get(idTrabajo) == moneda) {
                cobrado.put(idTrabajo, (BigDecimal) fila[2]);
            }
        }
        return cobrado;
    }

    private TrabajoMastering buscar(Long id) {
        return trabajos.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el trabajo " + id + "."));
    }

    private Usuario buscarPersona(Long idUsuario) {
        return usuarios.findById(idUsuario)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + idUsuario + "."));
    }

    private Profesor buscarProfesor(Long idProfesor) {
        if (idProfesor == null) {
            return null;
        }
        return profesores.findById(idProfesor)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el profesor " + idProfesor + "."));
    }

    private String normalizar(String texto) {
        if (texto == null) {
            return null;
        }
        String limpio = texto.trim();
        return limpio.isEmpty() ? null : limpio;
    }
}
