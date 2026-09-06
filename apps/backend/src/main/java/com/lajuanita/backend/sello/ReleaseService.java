package com.lajuanita.backend.sello;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.sello.dto.AltaAparicionRequest;
import com.lajuanita.backend.sello.dto.AltaCancionRequest;
import com.lajuanita.backend.sello.dto.AltaReleaseRequest;
import com.lajuanita.backend.sello.dto.AparicionResumen;
import com.lajuanita.backend.sello.dto.CancionResumen;
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
 * <p>Y son tres cosas:
 *
 * <ul>
 *   <li><b>El correlativo del código</b>, que necesita mirar toda la tabla.
 *   <li><b>La firma de la excepción</b>: el motivo viene del pedido, el autor sale
 *       del token y la fecha del reloj.
 *   <li><b>La posición de cada tema del tracklist</b>: {@code max + 1} al agregar e
 *       intercambio al mover, para que nadie la tipee. `V26` §1 apoya en eso su
 *       UNIQUE diferido.
 * </ul>
 *
 * <p>El rango de temas de un EP o un álbum <b>no está acá</b>: lo verifica `V26` §3
 * al publicar, y lo que esta clase manda al front son los números para avisar
 * antes. Ver {@code TipoRelease}.
 */
@Service
public class ReleaseService {

    private final ReleaseRepository releases;
    private final ArtistaRepository artistas;
    private final ContratoRepository contratos;
    private final AparicionRepository apariciones;
    private final CancionRepository canciones;
    private final UsuarioRepository usuarios;

    public ReleaseService(ReleaseRepository releases,
            ArtistaRepository artistas,
            ContratoRepository contratos,
            AparicionRepository apariciones,
            CancionRepository canciones,
            UsuarioRepository usuarios) {
        this.releases = releases;
        this.artistas = artistas;
        this.contratos = contratos;
        this.apariciones = apariciones;
        this.canciones = canciones;
        this.usuarios = usuarios;
    }

    // == Lectura =============================================================

    @Transactional(readOnly = true)
    public Pagina<ReleaseResumen> listar(String buscar, EstadoRelease estado, int pagina, int tamanio) {
        var encontrados = releases.listar(estado, Busqueda.patron(buscar),
                PageRequest.of(Math.max(pagina, 0), Pagina.acotarTamanio(tamanio)));

        // Los contratos de TODA la página en una consulta, y recién después se
        // arma cada fila. La versión anterior pasaba cero acá —con un comentario
        // que decía que era "un número que la fila del catálogo ni usa"— y la fila
        // lo usa: el catálogo entero decía "Sin contrato". Ver
        // ReleaseRepository.contarContratosDe.
        //
        // Resolverlo fila por fila habría sido más corto y son veinte consultas
        // más por página, que es justo lo que el JOIN FETCH del artista evita.
        List<Long> ids = encontrados.getContent().stream().map(Release::getId).toList();
        Map<Long, Integer> porRelease = contratosDeLaPagina(ids);
        Map<Long, Integer> temasPorRelease = temasDeLaPagina(ids);

        return Pagina.de(encontrados.map(
                r -> ReleaseResumen.de(r,
                        porRelease.getOrDefault(r.getId(), 0),
                        temasPorRelease.getOrDefault(r.getId(), 0))));
    }

    @Transactional(readOnly = true)
    public ReleaseResumen porId(Long id) {
        Release release = buscar(id);
        return resumir(release);
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

        // No es cero por ser nuevo: si el artista ya tiene un contrato general, este
        // release nace respaldado. Poner cero acá era el mismo error que el del
        // listado, más chico porque la pantalla recarga después de crear.
        Release creado = releases.save(release);
        return resumir(creado);
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

        // El tipo puede haber cambiado, y `V26` §2 rechaza pasarlo a un formato sin
        // tracklist si el release ya tiene temas. El `flush` es para que ese
        // rechazo llegue DENTRO del pedido, como un 409 con el texto del trigger,
        // en vez de un 500 al COMMIT.
        releases.flush();

        return resumir(release);
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

        return resumir(release);
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

        return resumir(release);
    }

    // == El tracklist (P51–P53) ==============================================

    @Transactional(readOnly = true)
    public List<CancionResumen> temas(Long idRelease) {
        buscar(idRelease);
        return canciones.delRelease(idRelease).stream().map(CancionResumen::de).toList();
    }

    /**
     * Agregar un tema al final.
     *
     * <p><b>El orden lo pone el servidor: {@code max + 1}, no {@code count + 1}.</b>
     * Es la misma distinción que {@code maximoNumeroDeCodigo}, por el mismo motivo:
     * borrar el tema 2 de tres deja las posiciones 1 y 3 ocupadas, y contar daría 3,
     * que está tomado. Con el UNIQUE diferido de `V26` ese choque ni siquiera se
     * vería en el pedido — llegaría al COMMIT como un 500.
     *
     * <p><b>Que sólo un EP o un álbum lleven temas lo sostiene el trigger</b>
     * (`V26` §2), no un {@code if} acá: con la verificación en Java, el próximo
     * endpoint que inserte una canción se olvidaría de llamarla y nada fallaría.
     * El {@code flush} es para que ese rechazo llegue como un 409 con el texto del
     * trigger, dentro del pedido.
     */
    @Transactional
    public CancionResumen agregarTema(Long idRelease, AltaCancionRequest pedido) {
        Release release = buscar(idRelease);

        Short ultimo = canciones.ultimoOrden(idRelease);

        CancionRelease cancion = new CancionRelease();
        cancion.setRelease(release);
        cancion.setOrden((short) ((ultimo == null ? 0 : ultimo) + 1));
        escribirCampos(cancion, pedido);

        CancionRelease guardada = canciones.save(cancion);
        canciones.flush();

        return CancionResumen.de(guardada);
    }

    /**
     * Corregir un tema.
     *
     * <p>No toca el orden: mover un tema es {@link #moverTema}. Un formulario que
     * dejara escribir la posición a mano volvería a abrir la puerta que el UNIQUE
     * diferido da por cerrada — que dos temas queden en el mismo lugar por algo que
     * alguien tipeó.
     */
    @Transactional
    public CancionResumen editarTema(Long idCancion, AltaCancionRequest pedido) {
        CancionRelease cancion = buscarTema(idCancion);
        escribirCampos(cancion, pedido);
        canciones.flush();

        return CancionResumen.de(cancion);
    }

    /**
     * Mover un tema una posición.
     *
     * <p><b>Intercambia con el vecino de la lista, no con "el de orden ± 1".</b> Los
     * órdenes pueden tener huecos —se borró el tema 2 de tres— y buscar la posición
     * exacta no encontraría a nadie: el botón no haría nada, sin error.
     *
     * <p>El intercambio son dos UPDATE que pasan por un estado intermedio con dos
     * temas en el mismo lugar. <b>Es exactamente para eso que el UNIQUE de `V26` es
     * diferido</b>: con uno inmediato el primer UPDATE chocaría contra el segundo
     * tema antes de que exista el estado final, y reordenar sería imposible.
     */
    @Transactional
    public List<CancionResumen> moverTema(Long idCancion, boolean arriba) {
        CancionRelease cancion = buscarTema(idCancion);
        Long idRelease = cancion.getRelease().getId();

        List<CancionRelease> lista = canciones.delRelease(idRelease);
        int donde = lista.indexOf(cancion);
        int destino = arriba ? donde - 1 : donde + 1;

        if (donde < 0 || destino < 0 || destino >= lista.size()) {
            throw new SolicitudInvalidaException(
                    arriba ? "Ese tema ya es el primero." : "Ese tema ya es el último.");
        }

        CancionRelease vecino = lista.get(destino);
        Short suyo = cancion.getOrden();
        cancion.setOrden(vecino.getOrden());
        vecino.setOrden(suyo);
        canciones.flush();

        return canciones.delRelease(idRelease).stream().map(CancionResumen::de).toList();
    }

    /**
     * Sacar un tema.
     *
     * <p><b>Acá borrar está bien, y no contradice al resto del esquema.</b> Un
     * tracklist que se está armando no es historial del negocio: es la ficha de algo
     * que todavía no salió, como {@code aparicion_release} y por el mismo criterio.
     *
     * <p>Lo que sí es historial es el tracklist de <b>algo ya publicado</b>, y eso lo
     * protege `V26` §4: sacar un tema que dejaría al release por debajo del mínimo se
     * rechaza con el texto del trigger. Sin esa mitad, la regla dura duraría lo que
     * tarda un DELETE — publicar un EP con tres y borrar dos.
     */
    @Transactional
    public void borrarTema(Long idCancion) {
        CancionRelease cancion = buscarTema(idCancion);
        canciones.delete(cancion);
        canciones.flush();
    }

    private void escribirCampos(CancionRelease cancion, AltaCancionRequest pedido) {
        cancion.setTitulo(pedido.titulo().trim());
        cancion.setDuracionSegundos(pedido.duracionSegundos());
        cancion.setArtistaInvitado(normalizar(pedido.artistaInvitado()));
        // El ISRC en mayúsculas: es un código, no un nombre. La forma la verifica
        // `V26`, que ya normaliza para comparar — esto es para que la pantalla no
        // muestre el mismo código escrito de dos maneras.
        String isrc = normalizar(pedido.isrc());
        cancion.setIsrc(isrc == null ? null : isrc.toUpperCase());
    }

    private CancionRelease buscarTema(Long idCancion) {
        return canciones.findById(idCancion)
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe ese tema (" + idCancion + ")."));
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

    /**
     * Lo mismo que {@link #cuantosContratos} pero para una página entera.
     *
     * <p>Con la lista vacía <b>no pregunta</b>: un {@code IN} sin elementos es un
     * error de sintaxis en Postgres, y una página vacía —buscar algo que no está—
     * es lo más común que le pasa a esta pantalla. Es la misma piedra que encontró
     * el listado de pagos cuando se hizo nativo.
     */
    private Map<Long, Integer> contratosDeLaPagina(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return contarPorRelease(releases.contarContratosDe(ids));
    }

    /** Lo mismo para el tracklist. Ver {@link #contratosDeLaPagina}. */
    private Map<Long, Integer> temasDeLaPagina(List<Long> ids) {
        if (ids.isEmpty()) {
            return Map.of();
        }
        return contarPorRelease(canciones.contarTemasDe(ids));
    }

    private Map<Long, Integer> contarPorRelease(List<Object[]> filas) {
        return filas.stream().collect(Collectors.toMap(
                fila -> (Long) fila[0],
                fila -> ((Number) fila[1]).intValue()));
    }

    /**
     * Un release con sus dos conteos.
     *
     * <p>Existe para que ningún camino de esta clase pueda armar un
     * {@code ReleaseResumen} a medias: es la misma razón por la que ese record dejó
     * de tener una fábrica de un argumento, después de que el atajo que pasaba cero
     * hiciera que todo el catálogo dijera "Sin contrato".
     */
    private ReleaseResumen resumir(Release release) {
        return ReleaseResumen.de(release, cuantosContratos(release),
                canciones.delRelease(release.getId()).size());
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
