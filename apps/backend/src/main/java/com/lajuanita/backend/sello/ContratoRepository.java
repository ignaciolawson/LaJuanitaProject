package com.lajuanita.backend.sello;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ContratoRepository extends JpaRepository<ContratoSello, Long> {

    /**
     * Los contratos que respaldan a un release: <b>el suyo y los generales de su
     * artista</b>.
     *
     * <p>Es la misma definición que la función {@code release_tiene_contrato()} de
     * `V18`, y por eso hay que decirlo en voz alta: <b>son dos copias de una
     * regla</b>, que es la deuda que este proyecto ya paga con
     * {@code contarClasesConsumidas} contra `V9` §5. Se acepta acá por una razón
     * concreta y acotada: la de la base <b>decide</b> —rechaza la publicación— y
     * esta solo <b>muestra</b> la lista en la pantalla. Si se separan, la pantalla
     * lista un contrato de menos y el trigger sigue siendo el que manda; la
     * publicación no se vuelve posible sin respaldo por este camino.
     *
     * <p>Si alguna vez hace falta que Java <i>decida</i> si un release tiene
     * respaldo, no se agrega otra consulta: se llama a la función de la base.
     */
    @Query("""
            SELECT c FROM ContratoSello c
            WHERE c.release.id = :idRelease
               OR (c.artista.id = :idArtista AND c.release IS NULL)
            ORDER BY c.fechaFirma DESC NULLS LAST, c.id DESC
            """)
    List<ContratoSello> queRespaldanAlRelease(@Param("idRelease") Long idRelease,
            @Param("idArtista") Long idArtista);

    /** Todo lo del artista, para su ficha. */
    @Query("""
            SELECT c FROM ContratoSello c
            LEFT JOIN FETCH c.release
            WHERE c.artista.id = :idArtista
            ORDER BY c.fechaFirma DESC NULLS LAST, c.id DESC
            """)
    List<ContratoSello> delArtista(@Param("idArtista") Long idArtista);
}
