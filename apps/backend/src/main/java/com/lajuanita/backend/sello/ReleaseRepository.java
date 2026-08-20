package com.lajuanita.backend.sello;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReleaseRepository extends JpaRepository<Release, Long> {

    /**
     * El catálogo, con búsqueda y filtro por estado.
     *
     * <p>El {@code JOIN FETCH} del artista no es opcional: cada fila lo muestra, y
     * sin él una página de veinte releases dispara veinte consultas más.
     *
     * <p>La búsqueda cruza <b>código, nombre y artista</b>, que son las tres formas
     * en que alguien se acuerda de un lanzamiento. {@code COALESCE} en lo anulable
     * — un {@code LIKE} contra NULL da NULL y esa fila desaparece sin error, que es
     * el bug que la búsqueda de ventas encontró primero.
     */
    @Query(value = """
            SELECT r FROM Release r
            JOIN FETCH r.artista a
            WHERE (:estado IS NULL OR r.estado = :estado)
              AND (LOWER(r.codigoRelease) LIKE :patron ESCAPE '\\'
                OR LOWER(r.nombreRelease) LIKE :patron ESCAPE '\\'
                OR LOWER(a.nombreArtistico) LIKE :patron ESCAPE '\\')
            ORDER BY r.fechaEstimada DESC NULLS LAST, r.id DESC
            """,
            countQuery = """
            SELECT count(r) FROM Release r JOIN r.artista a
            WHERE (:estado IS NULL OR r.estado = :estado)
              AND (LOWER(r.codigoRelease) LIKE :patron ESCAPE '\\'
                OR LOWER(r.nombreRelease) LIKE :patron ESCAPE '\\'
                OR LOWER(a.nombreArtistico) LIKE :patron ESCAPE '\\')
            """)
    Page<Release> listar(@Param("estado") EstadoRelease estado,
            @Param("patron") String patron,
            Pageable paginado);

    @Query("SELECT r FROM Release r JOIN FETCH r.artista WHERE r.id = :id")
    Optional<Release> porIdConArtista(@Param("id") Long id);

    boolean existsByCodigoReleaseIgnoreCase(String codigo);

    /**
     * El número más alto que ya se usó, para saber por dónde sigue el correlativo.
     *
     * <p><b>No cuenta filas, y esa es toda la decisión.</b> Contar sería lo obvio y
     * está mal por dos motivos que se dan juntos en este sistema: los lanzamientos
     * anteriores se cargan a mano (§15, ratificación 5), así que el catálogo arranca
     * poblado y desordenado; y un release no se borra, pero un código puede saltarse
     * igual si alguien carga los viejos con huecos. Con {@code count(*) + 1} el
     * siguiente código chocaría contra el índice único, o peor, se metería en un
     * hueco del medio y rompería el orden del catálogo.
     *
     * <p>Solo mira los códigos con la forma {@code LJ} + dígitos: un código cargado
     * a mano con otra forma —los viejos pueden tenerla— no participa del correlativo
     * en vez de romperlo. El {@code ~} de Postgres necesita {@code function} nativa,
     * así que esta consulta es nativa a propósito.
     *
     * @return el mayor número, o {@code null} si todavía no hay ninguno con esa forma
     */
    @Query(value = """
            SELECT max(substring(codigo_release from 3)::int)
              FROM release
             WHERE codigo_release ~ '^LJ[0-9]+$'
            """, nativeQuery = true)
    Integer maximoNumeroDeCodigo();

    /**
     * Los releases que salen dentro de la ventana, para el aviso automático.
     *
     * <p>Mira {@code fechaEstimada} y no {@code fechaReal}: el aviso existe para
     * llegar <b>antes</b>, y la fecha real recién existe cuando ya salió.
     *
     * <p>Quedan afuera los publicados —ya salieron, avisar no sirve de nada— y los
     * cancelados. Un release en {@code A_CONFIRMAR} a siete días sí entra, y es
     * justamente el que más conviene mirar.
     */
    @Query("""
            SELECT r FROM Release r
            JOIN FETCH r.artista
            WHERE r.estado NOT IN (com.lajuanita.backend.sello.EstadoRelease.PUBLICADO,
                                   com.lajuanita.backend.sello.EstadoRelease.CANCELADO)
              AND r.fechaEstimada IS NOT NULL
              AND r.fechaEstimada BETWEEN :desde AND :hasta
            ORDER BY r.fechaEstimada
            """)
    List<Release> queSalenEntre(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);
}
