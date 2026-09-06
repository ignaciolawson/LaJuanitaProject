package com.lajuanita.backend.sello;

import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface CancionRepository extends JpaRepository<CancionRelease, Long> {

    /** El tracklist, en su orden. */
    @Query("""
            SELECT c FROM CancionRelease c
            WHERE c.release.id = :idRelease
            ORDER BY c.orden, c.id
            """)
    List<CancionRelease> delRelease(@Param("idRelease") Long idRelease);

    /**
     * El último lugar ocupado, para saber dónde va el que se agrega.
     *
     * <p><b>El máximo, no la cantidad</b>, por el mismo motivo por el que
     * {@code maximoNumeroDeCodigo} no cuenta filas: borrar el tema 2 de tres deja
     * dos temas en las posiciones 1 y 3, y {@code count + 1} devolvería 3 — que
     * está tomado. Con el UNIQUE diferido el choque ni siquiera se vería en el
     * pedido: llegaría al COMMIT.
     *
     * @return el mayor orden, o {@code null} si el release todavía no tiene temas
     */
    @Query("SELECT max(c.orden) FROM CancionRelease c WHERE c.release.id = :idRelease")
    Short ultimoOrden(@Param("idRelease") Long idRelease);

    /**
     * Cuántos temas tiene cada uno de estos releases.
     *
     * <p><b>Una consulta por página, no una por fila.</b> Es la forma que ya tomó
     * {@code contarContratosDe} — y que ese método tuvo que aprender después de que
     * el catálogo entero dijera "Sin contrato" por mapear con un atajo que pasaba
     * cero. Un atajo que rellena un campo con un valor plausible no falla: miente.
     *
     * @return filas {@code [idRelease, cantidad]}; los que no tienen temas no vienen
     */
    @Query("""
            SELECT c.release.id, count(c.id)
            FROM CancionRelease c
            WHERE c.release.id IN :ids
            GROUP BY c.release.id
            """)
    List<Object[]> contarTemasDe(@Param("ids") Collection<Long> ids);
}
