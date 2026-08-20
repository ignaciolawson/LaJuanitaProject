package com.lajuanita.backend.sello;

import java.time.LocalDate;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import com.lajuanita.backend.archivo.Almacenamiento;
import com.lajuanita.backend.sello.dto.ContratoResumen;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;

/**
 * Los contratos del sello: el módulo que finalmente usa el {@code StorageService}.
 *
 * <p><b>El archivo se escribe antes que la fila, y si la fila no llega, se borra el
 * archivo.</b> Los dos órdenes posibles fallan distinto y no da igual cuál — está
 * razonado en {@code AlmacenamientoEnDisco}, pero el resumen es que un huérfano
 * ocupa lugar mientras que una fila apuntando a un archivo inexistente hace que el
 * sistema dé por cumplida su propia regla dura sobre un respaldo que no está.
 *
 * <p>La limpieza se cuelga de la transacción y no de un {@code catch}: si el rollback
 * lo dispara algo posterior a este método —el trigger de `V18` corriendo al flush,
 * por ejemplo— un catch acá adentro no se entera de nada.
 */
@Service
public class ContratoService {

    /** La carpeta la elige el código, nunca el cliente. */
    private static final String CARPETA = "contratos";

    private final ContratoRepository contratos;
    private final ArtistaRepository artistas;
    private final ReleaseRepository releases;
    private final Almacenamiento almacenamiento;

    public ContratoService(ContratoRepository contratos,
            ArtistaRepository artistas,
            ReleaseRepository releases,
            Almacenamiento almacenamiento) {
        this.contratos = contratos;
        this.artistas = artistas;
        this.releases = releases;
        this.almacenamiento = almacenamiento;
    }

    @Transactional(readOnly = true)
    public List<ContratoResumen> delArtista(Long idArtista) {
        return contratos.delArtista(idArtista).stream().map(ContratoResumen::de).toList();
    }

    @Transactional(readOnly = true)
    public List<ContratoResumen> queRespaldanAlRelease(Long idRelease) {
        Release release = releases.porIdConArtista(idRelease)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el release " + idRelease + "."));

        return contratos.queRespaldanAlRelease(release.getId(), release.getArtista().getId())
                .stream().map(ContratoResumen::de).toList();
    }

    /**
     * Cargar un contrato.
     *
     * <p>{@code idRelease} en null significa <b>contrato general del artista</b>, que
     * respalda todos sus lanzamientos. No es un caso raro: es lo que `V1` modela
     * desde el primer día con esa columna nullable, y es la mitad no obvia de la
     * regla dura.
     */
    @Transactional
    public ContratoResumen cargar(Long idArtista, Long idRelease, MultipartFile archivo,
            LocalDate fechaFirma, String observaciones) {

        Artista artista = artistas.findById(idArtista)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el artista " + idArtista + "."));

        ContratoSello contrato = new ContratoSello();
        contrato.setArtista(artista);

        if (idRelease != null) {
            Release release = releases.porIdConArtista(idRelease)
                    .orElseThrow(() -> new RecursoNoEncontradoException(
                            "No existe el release " + idRelease + "."));

            // Ninguna FK lo impide: `id_artista` e `id_release` son dos columnas
            // sueltas, así que se puede colgar el contrato de Fulano del release de
            // Mengano y las dos fichas quedan mal en silencio. Es el mismo hueco que
            // `PagoService` cierra entre el pagador y lo que paga.
            if (!release.getArtista().getId().equals(idArtista)) {
                throw new SolicitudInvalidaException(
                        "Ese release no es de ese artista: el contrato quedaría mal colgado.");
            }
            contrato.setRelease(release);
        }

        contrato.setArchivoPath(guardarYLimpiarSiFalla(archivo));
        contrato.setFechaFirma(fechaFirma);
        contrato.setObservaciones(observaciones == null || observaciones.isBlank()
                ? null : observaciones.trim());

        return ContratoResumen.de(contratos.save(contrato));
    }

    /**
     * Bajar el PDF.
     *
     * <p><b>Pasa por la API y no por una ruta estática, y eso es la mitad del valor
     * de haber construido el {@code StorageService}.</b> Un contrato tiene datos de
     * un tercero: no puede quedar en una URL que se adivina, se comparte sin querer
     * o la indexa alguien. Quien llegue acá ya pasó por {@code @PuedeLeerAdministracion}.
     */
    @Transactional(readOnly = true)
    public Resource archivoDe(Long idContrato) {
        return almacenamiento.leer(buscar(idContrato).getArchivoPath());
    }

    /**
     * Un nombre legible para la descarga.
     *
     * <p>No se guarda el nombre original —`V1` no tiene esa columna y no vale una
     * migración por eso— y de paso este es más útil: quien baja tres contratos
     * seguidos prefiere {@code contrato-LJ021-Ghezz.pdf} a tres archivos llamados
     * {@code escaneo_final_v2.pdf}.
     */
    @Transactional(readOnly = true)
    public String nombreDeDescarga(Long idContrato) {
        ContratoSello contrato = buscar(idContrato);
        String quien = contrato.getRelease() != null
                ? contrato.getRelease().getCodigoRelease()
                : contrato.getArtista().getNombreArtistico();

        return "contrato-%s.pdf".formatted(quien.replaceAll("[^A-Za-z0-9._-]", "_"));
    }

    /**
     * Sacar un contrato.
     *
     * <p><b>Se borra de verdad, y es una de las tres excepciones del esquema</b>
     * (con {@code bloqueo_sala} y las apariciones). Un contrato no tiene estado de
     * anulación porque es un documento y no un asiento: si se carga el PDF
     * equivocado y no se pudiera sacar, ese error quedaría adjunto para siempre a un
     * artista real.
     *
     * <p>Lo que no se puede es dejar sin respaldo algo ya publicado, y eso lo frena
     * el trigger de `V18` §3 — no este método. El {@code flush} es para que su
     * mensaje llegue como un 409 dentro del pedido.
     *
     * <p><b>El archivo NO se borra del disco.</b> Es deliberado: si el DELETE se
     * revierte —el trigger lo rechaza al flush, o algo posterior tumba la
     * transacción— la fila vuelve y su PDF tiene que seguir estando. Un archivo
     * huérfano es barato; una fila apuntando a un archivo borrado no.
     */
    @Transactional
    public void borrar(Long idContrato) {
        contratos.delete(buscar(idContrato));
        contratos.flush();
    }

    // =========================================================================

    /**
     * Guarda el archivo y programa su borrado si la transacción no llega a commitear.
     *
     * <p>Va como {@code TransactionSynchronization} y no como un {@code try/catch}
     * porque lo que puede tumbar esta transacción está <b>después</b> de este
     * método: el trigger de la base corre al flush, y un catch acá adentro no se
     * entera. Esto se entera de cualquier rollback, venga de donde venga.
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

    private ContratoSello buscar(Long id) {
        return contratos.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el contrato " + id + "."));
    }
}
