package com.lajuanita.backend.sello;

import java.time.LocalDate;
import java.util.Collection;
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

    /**
     * Cuántos contratos respaldan a cada uno de estos releases.
     *
     * <p><b>Existe porque el listado decía "Sin contrato" para todos.</b> Mapeaba con
     * el atajo de un argumento de {@code ReleaseResumen}, que pasa cero, y la fila
     * dibuja "Sin contrato" cuando ese número es cero. El comentario que lo dejaba
     * así se defendía diciendo que era "un número que la fila del catálogo ni usa"
     * — y la fila lo usa. Era cierto el día que se escribió y dejó de serlo cuando la
     * pantalla empezó a mostrarlo: la regla dura de `V18` nunca se debilitó, pero el
     * aviso que existe para que nadie se sorprenda al apretar publicar saltaba para
     * todo el catálogo, o sea que no avisaba de nada.
     *
     * <p><b>Una consulta por página, no una por fila.</b> El camino corto era llamar
     * a {@code cuantosContratos} adentro del {@code map}, que son veinte consultas
     * más por página — exactamente lo que el {@code JOIN FETCH} del artista está
     * puesto para evitar tres métodos más arriba. Es la forma que ya tomó
     * {@code PagoRepository} cuando el listado de pagos se partió en dos.
     *
     * <p>Los dos caminos del respaldo —el contrato del release y el general de su
     * artista— son <b>la misma definición</b> que {@code queRespaldanAlRelease} y que
     * la función {@code release_tiene_contrato()} de `V18`. Sigue valiendo lo que
     * dice el comentario de {@code ContratoRepository}: la de la base <b>decide</b> y
     * estas dos solo <b>muestran</b>, así que si se separan la pantalla cuenta mal y
     * el trigger sigue siendo el que manda.
     *
     * @return filas {@code [idRelease, cantidad]}, con cero para los que no tienen
     */
    @Query("""
            SELECT r.id, count(c.id)
            FROM Release r
            LEFT JOIN ContratoSello c
                ON c.release.id = r.id
                OR (c.artista.id = r.artista.id AND c.release IS NULL)
            WHERE r.id IN :ids
            GROUP BY r.id
            """)
    List<Object[]> contarContratosDe(@Param("ids") Collection<Long> ids);

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
