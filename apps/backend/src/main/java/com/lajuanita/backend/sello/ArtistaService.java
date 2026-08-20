package com.lajuanita.backend.sello;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.sello.dto.AltaArtistaRequest;
import com.lajuanita.backend.sello.dto.ArtistaResumen;
import com.lajuanita.backend.usuario.Busqueda;
import com.lajuanita.backend.usuario.DatoDuplicadoException;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;

/**
 * Las fichas de los artistas del sello.
 *
 * <p><b>Un artista no es una cuenta</b> (P24): no se crea `usuario`, no hay
 * contraseña temporal y no hay login. Es la diferencia con el alta de alumno, donde
 * la cuenta es el eje del sistema — acá la ficha existe para que un release tenga de
 * quién colgar.
 *
 * <p><b>No hay baja.</b> `artista` no tiene columna de estado y no se le inventa
 * una: un artista con releases publicados es historial del catálogo, y uno sin
 * releases no molesta a nadie. Si algún día hace falta esconder los que ya no
 * están, es una migración con su columna, no un DELETE.
 */
@Service
public class ArtistaService {

    private final ArtistaRepository artistas;

    public ArtistaService(ArtistaRepository artistas) {
        this.artistas = artistas;
    }

    @Transactional(readOnly = true)
    public List<ArtistaResumen> listar(String buscar) {
        Map<Long, Long> releases = new HashMap<>();
        for (Object[] fila : artistas.releasesPorArtista()) {
            releases.put(((Number) fila[0]).longValue(), ((Number) fila[1]).longValue());
        }

        return artistas.buscar(Busqueda.patron(buscar)).stream()
                .map(a -> ArtistaResumen.de(a, releases.getOrDefault(a.getId(), 0L)))
                .toList();
    }

    @Transactional(readOnly = true)
    public ArtistaResumen porId(Long id) {
        return ArtistaResumen.de(buscar(id), 0);
    }

    /**
     * <p>El nombre artístico se chequea repetido <b>para el mensaje</b>, no como
     * garantía: no hay índice único sobre él porque nada impide que dos proyectos se
     * llamen parecido, y forzarlo desde la base sería inventar una regla que el
     * negocio no pidió. Lo que sí garantiza la base es que una persona no tenga dos
     * fichas (`V6`, índice parcial sobre {@code id_usuario}).
     */
    @Transactional
    public ArtistaResumen crear(AltaArtistaRequest pedido) {
        String nombre = pedido.nombreArtistico().trim();
        artistas.findByNombreArtisticoIgnoreCase(nombre).ifPresent(otro -> {
            throw new DatoDuplicadoException("nombreArtistico",
                    "Ya hay un artista cargado con ese nombre.");
        });

        Artista artista = new Artista();
        volcar(pedido, artista);
        return ArtistaResumen.de(artistas.save(artista), 0);
    }

    @Transactional
    public ArtistaResumen editar(Long id, AltaArtistaRequest pedido) {
        Artista artista = buscar(id);
        volcar(pedido, artista);
        return ArtistaResumen.de(artista, 0);
    }

    // =========================================================================

    private void volcar(AltaArtistaRequest pedido, Artista artista) {
        artista.setNombreArtistico(pedido.nombreArtistico().trim());
        artista.setNombreReal(normalizar(pedido.nombreReal()));
        artista.setEmailContacto(normalizar(pedido.emailContacto()));
        artista.setTelefono(normalizar(pedido.telefono()));
        artista.setInstagram(normalizar(pedido.instagram()));
        artista.setConfirmado(Boolean.TRUE.equals(pedido.confirmado()));
        artista.setBio(normalizar(pedido.bio()));
    }

    private Artista buscar(Long id) {
        return artistas.findById(id)
                .orElseThrow(() -> new RecursoNoEncontradoException("No existe el artista " + id + "."));
    }

    private String normalizar(String texto) {
        return texto == null || texto.isBlank() ? null : texto.trim();
    }
}
