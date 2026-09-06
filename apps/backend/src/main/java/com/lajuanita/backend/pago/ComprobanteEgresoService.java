package com.lajuanita.backend.pago;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.lajuanita.backend.archivo.Almacenamiento;
import com.lajuanita.backend.archivo.ArchivoParaBajar;
import com.lajuanita.backend.archivo.NombreDeArchivo;
import com.lajuanita.backend.pago.dto.ComprobanteResumen;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Los comprobantes de un egreso (§14 · C1).
 *
 * <p>Hasta `V25` el comprobante de un egreso era <b>texto que alguien tipeaba</b>
 * —{@code egreso.comprobante_path}, la misma columna que `V21` le sacó a
 * {@code pago} y por el mismo motivo—, así que la pantalla mostraba respaldo
 * donde no había ninguno.
 *
 * <p>⚠️ <b>Es el espejo de {@link ComprobanteService} y conviene que se lea
 * igual.</b> Lo único que cambia es de qué fila cuelga el archivo. Las tres
 * decisiones se heredan enteras:
 *
 * <ul>
 *   <li><b>El archivo se escribe antes que la fila</b>, y si la fila no llega se
 *       borra el archivo. Un huérfano ocupa lugar; una fila apuntando a un archivo
 *       inexistente hace que el sistema muestre un respaldo que no tiene.
 *   <li><b>La limpieza va en la transacción, no en un {@code catch}</b>: lo que
 *       puede tumbarla —un trigger al flush— pasa después de que el método volvió.
 *   <li><b>No borra.</b> El equivocado se marca inválido con su motivo y se
 *       adjunta el correcto al lado; `V25` §2 y §3 lo sostienen en la base, así
 *       que no depende de que el próximo endpoint se acuerde.
 * </ul>
 */
@Service
public class ComprobanteEgresoService {

    /** La carpeta la elige el código, nunca el cliente. */
    private static final String CARPETA = "comprobantes-egreso";

    private final ComprobanteEgresoRepository comprobantes;
    private final EgresoRepository egresos;
    private final UsuarioRepository usuarios;
    private final Almacenamiento almacenamiento;

    public ComprobanteEgresoService(ComprobanteEgresoRepository comprobantes,
            EgresoRepository egresos,
            UsuarioRepository usuarios,
            Almacenamiento almacenamiento) {
        this.comprobantes = comprobantes;
        this.egresos = egresos;
        this.usuarios = usuarios;
        this.almacenamiento = almacenamiento;
    }

    /**
     * Adjuntar un comprobante a un egreso.
     *
     * <p><b>No se le pregunta al egreso si está anulado</b>, igual que del lado del
     * pago: sería una excepción inventada acá y de las que §13 rechazó — una regla
     * cuyas excepciones dependen del estado es la que después nadie puede decir si
     * se está cumpliendo. Y hay un caso real del otro lado: aparece el respaldo de
     * un egreso que se había anulado justamente por no encontrarlo.
     */
    @Transactional
    public ComprobanteResumen adjuntar(Long idEgreso, MultipartFile archivo, Long idAutor) {
        Egreso egreso = egresos.findById(idEgreso)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el egreso " + idEgreso + "."));

        Usuario autor = usuarios.findById(idAutor)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + idAutor + "."));

        ComprobanteEgreso comprobante = new ComprobanteEgreso();
        egreso.agregarComprobante(comprobante);
        comprobante.setQuienCargo(autor);
        comprobante.setNombreOriginal(NombreDeArchivo.sano(archivo.getOriginalFilename()));
        comprobante.setArchivoPath(guardarYLimpiarSiFalla(archivo));

        return ComprobanteResumen.de(comprobantes.save(comprobante));
    }

    /**
     * Bajar un comprobante de egreso.
     *
     * <p>Pasa por la API y no por una ruta estática, igual que el contrato del
     * sello y que el comprobante de un pago: acá adentro está el recibo de sueldo
     * de una persona, y no puede quedar en una URL que se adivina.
     *
     * <p><b>Solo hay una puerta, la de administración</b>: un egreso no tiene dueño
     * del lado del portal. Ver {@link ComprobanteEgresoRepository}.
     */
    @Transactional(readOnly = true)
    public ArchivoParaBajar archivoDe(Long idEgreso, Long idComprobante) {
        ComprobanteEgreso comprobante = comprobantes.delEgreso(idComprobante, idEgreso)
                .orElseThrow(() -> noExiste(idComprobante));

        return ArchivoParaBajar.de(
                almacenamiento.leer(comprobante.getArchivoPath()),
                comprobante.getNombreOriginal(),
                comprobante.getArchivoPath());
    }

    /**
     * Marcar un comprobante como inválido. <b>No se borra.</b>
     *
     * <p>Marcarlo dos veces se rechaza acá para poder decirlo con palabras; lo que
     * lo hace imposible de verdad es `V25` §3, que además impide deshacerlo y
     * reescribir la firma. El autor sale del token y la fecha del reloj.
     */
    @Transactional
    public ComprobanteResumen invalidar(Long idEgreso, Long idComprobante,
            String motivo, Long idAutor) {

        ComprobanteEgreso comprobante = comprobantes.delEgreso(idComprobante, idEgreso)
                .orElseThrow(() -> noExiste(idComprobante));

        if (comprobante.isInvalido()) {
            throw new SolicitudInvalidaException("Ese comprobante ya está marcado como inválido.");
        }

        Usuario autor = usuarios.findById(idAutor)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el usuario " + idAutor + "."));

        comprobante.invalidar(autor, motivo);
        return ComprobanteResumen.de(comprobante);
    }

    // =========================================================================

    private RecursoNoEncontradoException noExiste(Long idComprobante) {
        return new RecursoNoEncontradoException("No existe el comprobante " + idComprobante + ".");
    }

    /**
     * Guarda el archivo y programa su borrado si la transacción no commitea.
     *
     * <p>Va como {@code TransactionSynchronization} y no como un {@code try/catch}
     * por lo mismo que en {@code ContratoService} y {@code ComprobanteService}: lo
     * que puede tumbar esta transacción está después de este método.
     */
    private String guardarYLimpiarSiFalla(MultipartFile archivo) {
        String clave = almacenamiento.guardar(archivo, CARPETA);

        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override
                public void afterCompletion(int estado) {
                    if (estado != STATUS_COMMITTED) {
                        almacenamiento.borrar(clave);
                    }
                }
            });
        }
        return clave;
    }
}
