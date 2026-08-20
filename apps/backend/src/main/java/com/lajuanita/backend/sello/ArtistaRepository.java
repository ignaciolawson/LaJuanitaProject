package com.lajuanita.backend.sello;

import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ArtistaRepository extends JpaRepository<Artista, Long> {

    /**
     * El listado de artistas, con buscador.
     *
     * <p><b>No pagina, y es la misma decisión que `GET /api/profesores`</b>: lo que
     * acota esta lista es con cuánta gente firmó el sello, no cuánto crece el
     * negocio, y además alimenta el {@code <select>} del alta de un release.
     * Paginar un selector lo empeora. Si algún día incomoda, el arreglo es que sea
     * una búsqueda como la de alumnos, no agregarle páginas.
     */
    @Query("""
            SELECT a FROM Artista a
            WHERE LOWER(a.nombreArtistico) LIKE :patron ESCAPE '\\'
               OR LOWER(COALESCE(a.nombreReal, '')) LIKE :patron ESCAPE '\\'
            ORDER BY LOWER(a.nombreArtistico)
            """)
    List<Artista> buscar(@Param("patron") String patron);

    Optional<Artista> findByNombreArtisticoIgnoreCase(String nombreArtistico);

    /** Cuántos releases tiene cada artista, para la lista. @return filas {@code [id_artista, cuantos]} */
    @Query("""
            SELECT r.artista.id, count(r) FROM Release r
            WHERE r.estado <> com.lajuanita.backend.sello.EstadoRelease.CANCELADO
            GROUP BY r.artista.id
            """)
    List<Object[]> releasesPorArtista();
}
