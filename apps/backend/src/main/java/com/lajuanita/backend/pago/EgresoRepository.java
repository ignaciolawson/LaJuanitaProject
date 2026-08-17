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
     * <p><b>{@code NOT e.anulado} es lo que hace que anular signifique algo.</b>
     * Esta condición no estaba hasta el 2026-08-17 y estaba bien que no estuviera:
     * un egreso no se podía anular. En cuanto se pudo, sin ella anular deja de
     * sacar el monto del balance y la caja miente <b>sin ningún error a la
     * vista</b> — "salió" y "quedó" quedan mal para siempre.
     *
     * <p>El lado de los pagos ya lo hacía con {@code EstadoPago.ENTRARON}, y eso
     * es justamente lo que hacía fácil comerse el hueco: la caja <i>parecía</i>
     * contemplar anulaciones porque la mitad que se mira primero sí lo hacía.
     *
     * @return filas {@code [moneda, total, cantidad]}
     */
    @Query("""
            SELECT e.moneda, SUM(e.monto), COUNT(e)
            FROM Egreso e
            WHERE e.fechaEgreso BETWEEN :desde AND :hasta
              AND NOT e.anulado
            GROUP BY e.moneda
            """)
    List<Object[]> porMoneda(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);
}
