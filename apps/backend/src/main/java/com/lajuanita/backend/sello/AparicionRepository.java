package com.lajuanita.backend.sello;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface AparicionRepository extends JpaRepository<AparicionRelease, Long> {

    /**
     * Dónde sonó un release, <b>ordenado por popularidad</b>.
     *
     * <p>El orden sale de {@code ordenRelevancia}, la columna generada de `V18`, y
     * no de un CASE escrito acá: así el día que el Módulo 8 pida "actividad del
     * sello" lee la misma jerarquía en vez de inventar la suya.
     */
    @Query("""
            SELECT a FROM AparicionRelease a
            WHERE a.release.id = :idRelease
            ORDER BY a.ordenRelevancia, a.fecha DESC NULLS LAST, a.id DESC
            """)
    List<AparicionRelease> delRelease(@Param("idRelease") Long idRelease);
}
