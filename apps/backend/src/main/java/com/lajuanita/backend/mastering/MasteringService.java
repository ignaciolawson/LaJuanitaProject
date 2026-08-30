package com.lajuanita.backend.mastering;

import java.math.BigDecimal;
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
 *   <li><b>No se libera un premaster que no está cargado.</b> La base solo mira el
 *       pago; liberar con {@code url_premaster} vacío es marcar como entregado algo
 *       que no existe, y el cliente ve un estado que no le da nada.
 *   <li><b>Cobrar puede mover el estado a {@code PAGADO}</b>, con tres condiciones.
 *       Ver {@link #cobrar}.
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
     */
    @Transactional
    public TrabajoResumen editar(Long id, EdicionTrabajoRequest solicitud) {
        TrabajoMastering trabajo = buscar(id);

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

        return TrabajoResumen.de(trabajo, cobradoDe(List.of(trabajo)).get(id));
    }

    /**
     * Mueve el estado.
     *
     * <p><b>Quien decide si el movimiento vale es el trigger</b>
     * ({@code trabajo_estado_solo_avanza}), no este método: un trabajo cobrado que
     * vuelve a "en proceso" descuadra los ingresos, y esa regla es de las que el
     * proyecto pone en la base para que valga también desde psql.
     *
     * <p>El {@code flush} está para que hable acá y no al commit: sin él, el 409 con
     * el texto del trigger llegaría como un 500 sin explicación.
     */
    @Transactional
    public TrabajoResumen cambiarEstado(Long id, EstadoTrabajo estado) {
        TrabajoMastering trabajo = buscar(id);
        trabajo.setEstado(estado);
        trabajos.flush();

        return TrabajoResumen.de(trabajo, cobradoDe(List.of(trabajo)).get(id));
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

        if (trabajo.getEstado() == EstadoTrabajo.CANCELADO) {
            throw new SolicitudInvalidaException(
                    "Ese trabajo está cancelado: no se le pueden cargar revisiones.");
        }

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
     * <p><b>El estado pasa a {@code PAGADO} solo si se dan las tres condiciones</b>,
     * y ninguna sobra:
     *
     * <ol>
     *   <li><b>El trabajo ya está entregado</b> ({@code ENTREGADO} o {@code DEBE}).
     *       Una seña sobre algo en proceso no lo vuelve un trabajo terminado, y
     *       {@code PAGADO} es el final de la escalera, no una etiqueta de plata.
     *   <li><b>Hay precio acordado.</b> Sin él no hay contra qué comparar.
     *   <li><b>Lo cobrado en la moneda del trabajo alcanza el precio.</b> Un pago en
     *       pesos contra un trabajo en dólares no se convierte: no hay cotización
     *       que el sistema pueda inventar, y sumarlos daría un número que no es
     *       plata de ninguna de las dos monedas.
     * </ol>
     *
     * <p>Si no se dan, el estado queda donde estaba y la pantalla muestra
     * "cobrado X de Y" — que es información, no un error. Mover el estado a mano
     * sigue estando disponible.
     */
    @Transactional
    public TrabajoResumen cobrar(Long id, CobroRequest solicitud, Long idAutor) {
        TrabajoMastering trabajo = buscar(id);

        pagos.registrar(new AltaPagoRequest(
                solicitud.idUsuario(),
                // El cobro de M&M sigue pidiendo cuenta: `AltaCobroRequest.idUsuario`
                // es `@NotNull` porque la pantalla ya obliga a elegir a nombre de
                // quién va. Los dos huecos son los del pagador externo de `V19`.
                null, null,
                null, null, trabajo.getId(), null,
                "Mix & Mastering: " + trabajo.getNombreTrack(),
                solicitud.monto(),
                solicitud.moneda(),
                solicitud.cotizacionDolar(),
                solicitud.medioPago(),
                null, null,
                EstadoPago.PAGADO,
                null),
                idAutor);

        BigDecimal cobrado = cobradoDe(List.of(trabajo)).get(id);
        if (quedaCubierto(trabajo, cobrado)) {
            trabajo.setEstado(EstadoTrabajo.PAGADO);
        }

        return TrabajoResumen.de(trabajo, cobrado);
    }

    private boolean quedaCubierto(TrabajoMastering trabajo, BigDecimal cobrado) {
        boolean entregado = trabajo.getEstado() == EstadoTrabajo.ENTREGADO
                || trabajo.getEstado() == EstadoTrabajo.DEBE;

        return entregado
                && trabajo.getPrecioAcordado() != null
                && cobrado != null
                && cobrado.compareTo(trabajo.getPrecioAcordado()) >= 0;
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
