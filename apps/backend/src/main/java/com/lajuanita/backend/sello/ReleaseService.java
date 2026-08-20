package com.lajuanita.backend.sello;

import java.util.List;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.sello.dto.AltaAparicionRequest;
import com.lajuanita.backend.sello.dto.AltaReleaseRequest;
import com.lajuanita.backend.sello.dto.AparicionResumen;
import com.lajuanita.backend.sello.dto.EdicionReleaseRequest;
import com.lajuanita.backend.sello.dto.ReleaseResumen;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;
import com.lajuanita.backend.usuario.dto.Pagina;

/**
 * Módulo 7 — el catálogo del sello.
 *
 * <p><b>Las reglas duras de este módulo las impone `V18`, no esta clase</b>, y eso
 * es lo mismo que pasa en los seis módulos anteriores: no se publica sin contrato,
 * el estado solo avanza, de cancelado no se sale, la excepción exige motivo y
 * autor, y la fila no se borra. Lo que vive acá es lo que una constraint no puede
 * hacer.
 *
 * <p>Y son dos cosas:
 *
 * <ul>
 *   <li><b>El correlativo del código</b>, que necesita mirar toda la tabla.
 *   <li><b>La firma de la excepción</b>: el motivo viene del pedido, el autor sale
 *       del token y la fecha del reloj.
 * </ul>
 */
@Service
public class ReleaseService {

    private final ReleaseRepository releases;
    private final ArtistaRepository artistas;
    private final ContratoRepository contratos;
    private final AparicionRepository apariciones;
    private final UsuarioRepository usuarios;

    public ReleaseService(ReleaseRepository releases,
            ArtistaRepository artistas,
            ContratoRepository contratos,
            AparicionRepository apariciones,
            UsuarioRepository usuarios) {
        this.releases = releases;
        this.artistas = artistas;
        this.contratos = contratos;
        this.apariciones = apariciones;
        this.usuarios = usuarios;
    }

    // == Lectura =============================================================

    @Transactional(readOnly = true)
    public Pagina<ReleaseResumen> listar(String buscar, EstadoRelease estado, int pagina, int tamanio) {
        var encontrados = releases.listar(estado, Busqueda.patron(buscar),
                PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio)));

        // El conteo de contratos se resuelve por fila y no en la consulta del
        // listado: son dos caminos (del release y general del artista) y meterlos
        // como subconsulta del listado paginado lo vuelve ilegible para mostrar un
        // número que la fila del catálogo ni usa. Acá va en cero.
        return Pagina.de(encontrados.map(ReleaseResumen::de));
    }

    @Transactional(readOnly = true)
    public ReleaseResumen porId(Long id) {
        Release release = buscar(id);
        return ReleaseResumen.de(release, cuantosContratos(release));
    }

    @Transactional(readOnly = true)
    public List<AparicionResumen> apariciones(Long idRelease) {
        buscar(idRelease);
        return apariciones.delRelease(idRelease).stream().map(AparicionResumen::de).toList();
    }

    // == Alta y edición ======================================================

    @Transactional
    public ReleaseResumen crear(AltaReleaseRequest pedido) {
        Artista artista = artistas.findById(pedido.idArtista())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe el artista " + pedido.idArtista() + "."));

        Release release = new Release();
        release.setArtista(artista);
        release.setCodigoRelease(codigoPara(pedido.codigoRelease()));
        release.setNombreRelease(pedido.nombreRelease().trim());
        release.setTipoRelease(pedido.tipoRelease());
        release.setGenero(normalizar(pedido.genero()));
        release.setFechaEstimada(pedido.fechaEstimada());
        release.setFechaReal(pedido.fechaReal());
        release.setNotas(normalizar(pedido.notas()));

        return ReleaseResumen.de(releases.save(release), 0);
    }

    @Transactional
    public ReleaseResumen editar(Long id, EdicionReleaseRequest pedido) {
        Release release = buscar(id);

        release.setNombreRelease(pedido.nombreRelease().trim());
        release.setTipoRelease(pedido.tipoRelease());
        release.setGenero(normalizar(pedido.genero()));
        release.setFechaEstimada(pedido.fechaEstimada());
        release.setFechaReal(pedido.fechaReal());
        release.setSistemaPromo(Boolean.TRUE.equals(pedido.sistemaPromo()));
        release.setNotas(normalizar(pedido.notas()));

        return ReleaseResumen.de(release, cuantosContratos(release));
    }

    // == Los dos actos con regla propia ======================================

    /**
     * Mover el estado.
     *
     * <p><b>Publicar no pasa por acá</b>, y esa es la decisión: tiene su propio
     * endpoint porque tiene su propia regla y su propia excepción. Ofrecerlo como un
     * valor más de este desplegable haría que la regla dura del módulo se cruzara
     * sin que nadie la vea — el trigger igual la frenaría, pero con un 409 sobre un
     * formulario que no tiene dónde poner la respuesta.
     *
     * <p>Que el estado no retroceda y que de cancelado no se salga los sostiene el
     * trigger de `V18` §1/§1b, no este método. El {@code flush} es para que hable
     * dentro del pedido y no al COMMIT.
     */
    @Transactional
    public ReleaseResumen cambiarEstado(Long id, EstadoRelease nuevo) {
        if (nuevo == EstadoRelease.PUBLICADO) {
            throw new SolicitudInvalidaException(
                    "Publicar un release se hace desde su propia acción: tiene que verificar "
                            + "que haya contrato adjunto.");
        }

        Release release = buscar(id);
        release.setEstado(nuevo);
        releases.flush();

        return ReleaseResumen.de(release, cuantosContratos(release));
    }

    /**
     * Publicar.
     *
     * <p><b>Con {@code motivo} en blanco intenta publicar normal</b> y deja que la
     * base conteste: si no hay contrato, el trigger de `V18` rechaza y la pantalla
     * muestra <b>sus palabras</b>. Recién ahí aparece la salida, que cuesta escribir
     * una frase y queda firmada.
     *
     * <p>Es el mismo orden exacto que tomó el premaster del Módulo 6, y el orden es
     * la decisión: un checkbox "publicar sin contrato" a mano desde el principio
     * convertiría la regla en una sugerencia.
     *
     * <p>El {@code flush} es obligatorio: sin él el trigger inmediato no corre hasta
     * el COMMIT, y el 409 con el texto de la regla se convierte en un 500.
     */
    @Transactional
    public ReleaseResumen publicar(Long id, String motivo, Long idAutor) {
        Release release = buscar(id);

        if (release.getEstado() == EstadoRelease.CANCELADO) {
            throw new SolicitudInvalidaException(
                    "Ese release está cancelado: un lanzamiento que se retoma es un release nuevo.");
        }

        String justificacion = normalizar(motivo);
        if (justificacion == null) {
            release.publicar();
        } else {
            release.publicarSinContrato(justificacion, buscarPersona(idAutor));
        }
        releases.flush();

        return ReleaseResumen.de(release, cuantosContratos(release));
    }

    // == Dónde sonó ==========================================================

    @Transactional
    public AparicionResumen anotarAparicion(Long idRelease, AltaAparicionRequest pedido, Long idAutor) {
        Release release = buscar(idRelease);

        AparicionRelease aparicion = new AparicionRelease();
        aparicion.setRelease(release);
        aparicion.setTipoAparicion(pedido.tipoAparicion());
        aparicion.setDonde(pedido.donde().trim());
        aparicion.setQuien(normalizar(pedido.quien()));
        aparicion.setFecha(pedido.fecha());
        aparicion.setUrl(normalizar(pedido.url()));
        aparicion.setNotas(normalizar(pedido.notas()));
        aparicion.setCargadoPor(buscarPersona(idAutor));

        return AparicionResumen.de(apariciones.save(aparicion));
    }

    /**
     * Borrar una aparición.
     *
     * <p><b>Es el segundo lugar de todo el esquema donde borrar está bien</b>, junto
     * con {@code bloqueo_sala} y {@code contrato_sello}, y por el mismo criterio:
     * esto no es historial del negocio ni respalda nada, es una libreta de
     * anotaciones sobre dónde sonó un tema. Una fila cargada mal ahí no tiene estado
     * de anulación que valga la pena inventarle.
     */
    @Transactional
    public void borrarAparicion(Long idAparicion) {
        AparicionRelease aparicion = apariciones.findById(idAparicion)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe esa aparición (" + idAparicion + ")."));
        apariciones.delete(aparicion);
    }

    // =========================================================================

    /**
     * El próximo código, o el que mandaron.
     *
     * <p><b>Por encima del máximo, nunca contando filas.</b> Contar sería lo obvio y
     * está mal por dos cosas que se dan juntas acá: los lanzamientos anteriores se
     * cargan a mano, así que el catálogo arranca poblado; y los códigos viejos
     * pueden tener huecos. Con {@code count(*) + 1} el próximo código chocaría
     * contra el índice único, o se metería en un hueco del medio y desordenaría el
     * catálogo.
     *
     * <p>El chequeo de duplicado que hay acá es <b>para el mensaje</b>: quien manda
     * es el índice único de `V1`, y entre esta consulta y el INSERT se puede meter
     * otra alta. Es el mismo reparto que el email de usuario, donde el pre-chequeo
     * explica y el índice garantiza.
     */
    private String codigoPara(String pedido) {
        String elegido = normalizar(pedido);
        if (elegido == null) {
            Integer maximo = releases.maximoNumeroDeCodigo();
            return "LJ%02d".formatted((maximo == null ? 0 : maximo) + 1);
        }
        if (releases.existsByCodigoReleaseIgnoreCase(elegido)) {
            throw new SolicitudInvalidaException("Ya hay un release con el código " + elegido + ".");
        }
        return elegido;
    }

    /**
     * Cuántos contratos respaldan al release.
     *
     * <p>Lo usa la pantalla para avisar <b>antes</b> de que alguien apriete publicar.
     * <b>No decide nada</b>: quien decide es el trigger de `V18`, que lee la base y
     * no esta cuenta. Ver el comentario de {@code ContratoRepository} sobre por qué
     * conviven las dos.
     */
    private int cuantosContratos(Release release) {
        return contratos.queRespaldanAlRelease(release.getId(), release.getArtista().getId()).size();
    }

    private Release buscar(Long id) {
        return releases.porIdConArtista(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el release " + id + "."));
    }

    private Usuario buscarPersona(Long id) {
        return usuarios.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el usuario " + id + "."));
    }

    private String normalizar(String texto) {
        if (texto == null || texto.isBlank()) {
            return null;
        }
        return texto.trim();
    }
}
