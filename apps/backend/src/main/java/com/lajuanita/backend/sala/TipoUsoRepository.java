package com.lajuanita.backend.sala;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TipoUsoRepository extends JpaRepository<TipoUso, Long> {

    /** Los tipos de uso, para armar el selector y pintar el calendario. */
    @Query("""
            SELECT t FROM TipoUso t
            WHERE (:incluirInactivos = TRUE OR t.activo = TRUE)
            ORDER BY t.nombre
            """)
    List<TipoUso> listar(@Param("incluirInactivos") boolean incluirInactivos);
}
