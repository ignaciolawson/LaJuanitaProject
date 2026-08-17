package com.lajuanita.backend.venta;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface VentaEquipoRepository extends JpaRepository<VentaEquipo, Long> {

    /**
     * El listado, con período y búsqueda.
     *
     * <p><b>Los cuatro `LEFT JOIN FETCH` no son decoración:</b> la fila muestra el
     * comprador y el vendedor, y sin traerlos acá cada una dispara sus propias
     * consultas al armar el DTO. Con veinte filas por página son cuarenta viajes.
     *
     * <p>La búsqueda cruza <b>equipo y comprador</b> porque las dos preguntas que
     * se le hacen a esta pantalla son *"¿a cuánto vendimos el último CDJ?"* y
     * *"¿qué le vendimos a Fulano?"*. {@code COALESCE} en todo lo anulable: un
     * {@code LIKE} contra NULL da NULL y esa fila desaparece del resultado sin
     * error — una venta sin marca cargada dejaría de encontrarse por su modelo.
     */
    @Query(value = """
            SELECT v FROM VentaEquipo v
            LEFT JOIN FETCH v.comprador
            LEFT JOIN FETCH v.vendedor
            WHERE (:desde IS NULL OR v.fechaVenta >= :desde)
              AND (:hasta IS NULL OR v.fechaVenta <= :hasta)
              AND (LOWER(v.modeloEquipo) LIKE :patron
                OR LOWER(COALESCE(v.marca, '')) LIKE :patron
                OR LOWER(COALESCE(v.categoria, '')) LIKE :patron
                OR LOWER(COALESCE(v.nombreCompradorExterno, '')) LIKE :patron
                OR LOWER(COALESCE(v.comprador.nombre, '')) LIKE :patron
                OR LOWER(COALESCE(v.comprador.apellido, '')) LIKE :patron)
            """,
            countQuery = """
            SELECT count(v) FROM VentaEquipo v
            WHERE (:desde IS NULL OR v.fechaVenta >= :desde)
              AND (:hasta IS NULL OR v.fechaVenta <= :hasta)
              AND (LOWER(v.modeloEquipo) LIKE :patron
                OR LOWER(COALESCE(v.marca, '')) LIKE :patron
                OR LOWER(COALESCE(v.categoria, '')) LIKE :patron
                OR LOWER(COALESCE(v.nombreCompradorExterno, '')) LIKE :patron
                OR LOWER(COALESCE(v.comprador.nombre, '')) LIKE :patron
                OR LOWER(COALESCE(v.comprador.apellido, '')) LIKE :patron)
            """)
    Page<VentaEquipo> listar(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("patron") String patron,
            Pageable paginado);

    /**
     * Lo vendido en el período, por moneda.
     *
     * <p><b>No suma a la caja</b>, y la diferencia importa: la caja de §6 suma
     * `pago`, o sea plata que entró. Una venta es la operación; su plata entra por
     * un {@code pago} que le apunta. Sumar las dos contaría el mismo billete dos
     * veces, que es exactamente lo que `pago_tiene_destino` evita del otro lado.
     * Este total es el volumen de la línea de negocio, para el Módulo 8.
     *
     * @return filas {@code [moneda, total, cantidad]}
     */
    @Query("""
            SELECT v.moneda, SUM(v.precio), COUNT(v)
            FROM VentaEquipo v
            WHERE v.fechaVenta BETWEEN :desde AND :hasta
              AND NOT v.anulada
            GROUP BY v.moneda
            """)
    List<Object[]> porMoneda(@Param("desde") LocalDate desde, @Param("hasta") LocalDate hasta);
}
