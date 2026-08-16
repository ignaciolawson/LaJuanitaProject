package com.lajuanita.backend.pago;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface EgresoRepository extends JpaRepository<Egreso, Long> {

    @Query(value = """
            SELECT e FROM Egreso e
            LEFT JOIN FETCH e.usuarioDestino
            WHERE (:desde IS NULL OR e.fechaEgreso >= :desde)
              AND (:hasta IS NULL OR e.fechaEgreso <= :hasta)
              AND (LOWER(e.concepto) LIKE :patron
                OR LOWER(COALESCE(e.destinatario, '')) LIKE :patron)
            """,
            countQuery = """
            SELECT count(e) FROM Egreso e
            WHERE (:desde IS NULL OR e.fechaEgreso >= :desde)
              AND (:hasta IS NULL OR e.fechaEgreso <= :hasta)
              AND (LOWER(e.concepto) LIKE :patron
                OR LOWER(COALESCE(e.destinatario, '')) LIKE :patron)
            """)
    Page<Egreso> listar(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("patron") String patron,
            Pageable paginado);

    /**
     * Lo que salió en el período, por moneda. Es la mitad de la caja de §6.
     *
     * @return filas {@code [moneda, total, cantidad]}
     */
    @Query("""
            SELECT e.moneda, SUM(e.monto), COUNT(e)
            FROM Egreso e
            WHERE e.fechaEgreso BETWEEN :desde AND :hasta
            GROUP BY e.moneda
            """)
    List<Object[]> porMoneda(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);
}
