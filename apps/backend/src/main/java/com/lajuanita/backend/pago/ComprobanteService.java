package com.lajuanita.backend.pago;

import java.util.Locale;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.lajuanita.backend.archivo.Almacenamiento;
import com.lajuanita.backend.archivo.ArchivoParaBajar;
import com.lajuanita.backend.pago.dto.ComprobanteResumen;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Los comprobantes de un pago: la deuda más vieja del Módulo 3, saldada.
 *
 * <p>Hasta `V21` el comprobante era <b>texto que alguien tipeaba</b> en el
 * formulario de pagos. O sea que el respaldo de una transferencia era una promesa:
 * el campo decía <i>"transferencia.pdf"</i> y no había ningún archivo detrás, en
 * ningún lado. §2.4 declaraba el {@code StorageService} desde el primer día y tres
 * módulos lo esquivaron; el 7 lo construyó, y esto es lo que quedaba de esa lista.
 *
 * <p><b>El archivo se escribe antes que la fila, y si la fila no llega, se borra el
 * archivo.</b> Es el molde de {@code ContratoService} y el razonamiento está en
 * {@code AlmacenamientoEnDisco}: un huérfano ocupa lugar, mientras que una fila
 * apuntando a un archivo inexistente hace que el sistema muestre un respaldo que no
 * tiene. La limpieza se cuelga de la transacción y no de un {@code catch}, porque lo
 * que puede tumbarla —un trigger al flush— pasa después de que este método volvió.
 *
 * <p><b>Lo que este servicio no hace: no borra.</b> Un comprobante equivocado se
 * marca inválido con su motivo y se adjunta el correcto al lado; las dos cosas
 * quedan. `V21` §2 y §3 lo sostienen en la base, así que tampoco depende de que el
 * próximo endpoint se acuerde.
 */
@Service
public class ComprobanteService {

    /** La carpeta la elige el código, nunca el cliente. */
    private static final String CARPETA = "comprobantes";

    /** Lo que entra en {@code nombre_original}. */
    private static final int LARGO_DEL_NOMBRE = 255;

    private final ComprobanteRepository comprobantes;
    private final PagoRepository pagos;
    private final UsuarioRepository usuarios;
    private final Almacenamiento almacenamiento;

    public ComprobanteService(ComprobanteRepository comprobantes,
            PagoRepository pagos,
            UsuarioRepository usuarios,
            Almacenamiento almacenamiento) {
        this.comprobantes = comprobantes;
        this.pagos = pagos;
        this.usuarios = usuarios;
        this.almacenamiento = almacenamiento;
    }

    /**
     * Adjuntar un comprobante a un pago.
     *
     * <p><b>No se le pregunta al pago en qué estado está</b>, ni siquiera si está
     * anulado. Sería una excepción inventada acá y de las que §13 rechazó: una regla
     * cuyas excepciones dependen del estado es la que después nadie puede decir si se
     * está cumpliendo. Y hay un caso real del otro lado — aparece el respaldo de un
     * pago que se había anulado por no encontrarlo.
     */
    @Transactional
    public ComprobanteResumen adjuntar(Long idPago, MultipartFile archivo, Long idAutor) {
        Pago pago = pagos.findById(idPago)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el pago " + idPago + "."));

        Usuario autor = usuarios.findById(idAutor)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + idAutor + "."));

        ComprobantePago comprobante = new ComprobantePago();
        pago.agregarComprobante(comprobante);
        comprobante.setQuienCargo(autor);
        comprobante.setNombreOriginal(nombreSano(archivo.getOriginalFilename()));
        comprobante.setArchivoPath(guardarYLimpiarSiFalla(archivo));

        return ComprobanteResumen.de(comprobantes.save(comprobante));
    }

    /**
     * Bajar un comprobante, del lado de administración.
     *
     * <p>Pasa por la API y no por una ruta estática, igual que el contrato del
     * sello: un comprobante tiene el nombre y el banco de una persona, y no puede
     * quedar en una URL que se adivina o se comparte sin querer.
     */
    @Transactional(readOnly = true)
    public ArchivoParaBajar archivoDe(Long idPago, Long idComprobante) {
        return paraBajar(comprobantes.delPago(idComprobante, idPago)
                .orElseThrow(() -> noExiste(idComprobante)));
    }

    /**
     * Bajar un comprobante <b>propio</b>, del lado del portal.
     *
     * <p>El id del dueño sale del token y la consulta no puede devolver lo de otro
     * — es el eje de identidad del Módulo 4: un {@code WHERE}, no una anotación.
     * Un comprobante ajeno contesta <i>"no existe"</i> y no <i>"no podés"</i>,
     * porque lo segundo le confirma a quien prueba ids que la fila está ahí.
     */
    @Transactional(readOnly = true)
    public ArchivoParaBajar miArchivo(Long idComprobante, Long idUsuario) {
        return paraBajar(comprobantes.mioPorId(idComprobante, idUsuario)
                .orElseThrow(() -> noExiste(idComprobante)));
    }

    /**
     * Marcar un comprobante como inválido. <b>No se borra</b> — regla dura de §6.
     *
     * <p>Marcarlo dos veces se rechaza acá para poder decirlo con palabras; lo que
     * lo hace imposible de verdad es `V21` §3, que además impide deshacerlo y
     * reescribir la firma. El autor sale del token y la fecha del reloj.
     */
    @Transactional
    public ComprobanteResumen invalidar(Long idPago, Long idComprobante, String motivo, Long idAutor) {
        ComprobantePago comprobante = comprobantes.delPago(idComprobante, idPago)
                .orElseThrow(() -> noExiste(idComprobante));

        if (comprobante.isInvalido()) {
            throw new SolicitudInvalidaException("Ese comprobante ya está marcado como inválido.");
        }

        Usuario autor = usuarios.findById(idAutor)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + idAutor + "."));

        comprobante.invalidar(autor, motivo);
        return ComprobanteResumen.de(comprobante);
    }

    // =========================================================================

    private ArchivoParaBajar paraBajar(ComprobantePago comprobante) {
        return ArchivoParaBajar.de(
                almacenamiento.leer(comprobante.getArchivoPath()),
                comprobante.getNombreOriginal(),
                comprobante.getArchivoPath());
    }

    private RecursoNoEncontradoException noExiste(Long idComprobante) {
        return new RecursoNoEncontradoException("No existe el comprobante " + idComprobante + ".");
    }

    /**
     * El nombre original, saneado para poder devolverlo.
     *
     * <p><b>No decide dónde se guarda nada</b> —eso es un UUID que elige
     * {@code Almacenamiento}— pero igual se limpia, porque este texto vuelve en la
     * cabecera {@code Content-Disposition} de la descarga y viene del cliente. Se
     * queda con el último tramo (un navegador puede mandar la ruta entera), saca lo
     * que no sea alfanumérico, punto, guion o guion bajo, y recorta al largo de la
     * columna. Si no queda nada usable, un nombre por defecto: la descarga tiene que
     * llamarse de alguna manera.
     */
    private String nombreSano(String original) {
        if (original == null || original.isBlank()) {
            return "comprobante";
        }
        String ultimoTramo = original.replace('\\', '/');
        ultimoTramo = ultimoTramo.substring(ultimoTramo.lastIndexOf('/') + 1);

        String limpio = ultimoTramo.trim()
                .toLowerCase(Locale.ROOT)
                .replaceAll("[^a-z0-9._-]", "_");

        if (limpio.isBlank() || limpio.replace("_", "").replace(".", "").isEmpty()) {
            return "comprobante";
        }
        return limpio.length() > LARGO_DEL_NOMBRE ? limpio.substring(0, LARGO_DEL_NOMBRE) : limpio;
    }

    /**
     * Guarda el archivo y programa su borrado si la transacción no commitea.
     *
     * <p>Va como {@code TransactionSynchronization} y no como un {@code try/catch}
     * por lo mismo que en {@code ContratoService}: lo que puede tumbar esta
     * transacción está después de este método.
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
