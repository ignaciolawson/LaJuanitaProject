package com.lajuanita.backend.pago;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PagoRepository extends JpaRepository<Pago, Long> {

    /**
     * El listado, con los filtros de la pantalla.
     *
     * <p><b>Pagina</b>, a diferencia de la agenda: esta lista crece con el
     * negocio y no hay ninguna vista que la necesite entera. Con ~80 alumnos y un
     * cuatrimestre adentro son miles de filas.
     *
     * <p>Los {@code JOIN FETCH} traen lo que la fila dibuja. El de la inscripción
     * y el de la reserva van {@code LEFT} porque un pago salda <b>una</b> de las
     * cuatro cosas: exigirlos dejaría afuera justamente a los otros dos destinos.
     */
    @Query(value = """
            SELECT p FROM Pago p
            JOIN FETCH p.usuario u
            LEFT JOIN FETCH p.inscripcion i
            LEFT JOIN FETCH p.reserva r
            LEFT JOIN FETCH r.sala
            WHERE (:idUsuario IS NULL OR u.id = :idUsuario)
              AND (:estado    IS NULL OR p.estadoPago = :estado)
              AND (:moneda    IS NULL OR p.moneda = :moneda)
              AND (:desde     IS NULL OR p.fechaPago >= :desde)
              AND (:hasta     IS NULL OR p.fechaPago <= :hasta)
              AND (LOWER(u.nombre)   LIKE :patron
                OR LOWER(u.apellido) LIKE :patron
                OR LOWER(u.email)    LIKE :patron)
            """,
            countQuery = """
            SELECT count(p) FROM Pago p
            JOIN p.usuario u
            WHERE (:idUsuario IS NULL OR u.id = :idUsuario)
              AND (:estado    IS NULL OR p.estadoPago = :estado)
              AND (:moneda    IS NULL OR p.moneda = :moneda)
              AND (:desde     IS NULL OR p.fechaPago >= :desde)
              AND (:hasta     IS NULL OR p.fechaPago <= :hasta)
              AND (LOWER(u.nombre)   LIKE :patron
                OR LOWER(u.apellido) LIKE :patron
                OR LOWER(u.email)    LIKE :patron)
            """)
    Page<Pago> listar(@Param("idUsuario") Long idUsuario,
            @Param("estado") EstadoPago estado,
            @Param("moneda") String moneda,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("patron") String patron,
            Pageable paginado);

    /** Todos los pagos de una persona, del más nuevo al más viejo. Es su estado de cuenta. */
    @Query("""
            SELECT p FROM Pago p
            JOIN FETCH p.usuario u
            LEFT JOIN FETCH p.inscripcion i
            LEFT JOIN FETCH p.reserva r
            LEFT JOIN FETCH r.sala
            WHERE u.id = :idUsuario
            ORDER BY p.fechaPago DESC, p.id DESC
            """)
    List<Pago> deLaPersona(@Param("idUsuario") Long idUsuario);

    @Query("""
            SELECT p FROM Pago p
            JOIN FETCH p.usuario
            LEFT JOIN FETCH p.inscripcion
            LEFT JOIN FETCH p.reserva r
            LEFT JOIN FETCH r.sala
            WHERE p.id = :id
            """)
    Optional<Pago> porIdConDetalle(@Param("id") Long id);

    /**
     * Lo cobrado por inscripción, para el estado de cuenta.
     *
     * <p>Solo cuenta lo que <b>entró</b> — la lista de estados viaja como
     * parámetro para no volver a escribirla— y agrupa por moneda, porque un
     * contrato en pesos con un pago en dólares no se resta: son dos cajas.
     *
     * @return filas {@code [id_inscripcion, moneda, total]}
     */
    @Query("""
            SELECT i.id, p.moneda, SUM(p.monto)
            FROM Pago p JOIN p.inscripcion i
            WHERE i.id IN :ids AND p.estadoPago IN :entraron
            GROUP BY i.id, p.moneda
            """)
    List<Object[]> cobradoPorInscripcion(@Param("ids") List<Long> ids,
            @Param("entraron") Iterable<EstadoPago> entraron);

    /**
     * Cuáles de estas ventas ya tienen la plata adentro.
     *
     * <p>Una sola consulta para la página entera, no una por fila: con veinte
     * ventas por página lo segundo son veinte viajes para pintar una etiqueta.
     *
     * <p>Usa {@code ENTRARON} y no "distinto de ANULADO", que es la misma lista
     * escrita de otra forma y se despega el día que aparezca un estado nuevo — la
     * definición de "plata que entró" vive en {@link EstadoPago#ENTRARON} y en
     * ningún otro lado.
     */
    @Query("""
            SELECT DISTINCT p.idVentaEquipo
            FROM Pago p
            WHERE p.idVentaEquipo IN :ids AND p.estadoPago IN :entraron
            """)
    List<Long> ventasConPago(@Param("ids") List<Long> ids,
            @Param("entraron") Iterable<EstadoPago> entraron);

    /**
     * La caja del período: cuánto entró y cuánto se anotó como deuda, por moneda.
     *
     * @return filas {@code [moneda, ingresos, cantidad, adeudado]}
     */
    @Query("""
            SELECT p.moneda,
                   COALESCE(SUM(CASE WHEN p.estadoPago IN :entraron THEN p.monto ELSE 0 END), 0),
                   COUNT(CASE WHEN p.estadoPago IN :entraron THEN 1 END),
                   COALESCE(SUM(CASE WHEN p.estadoPago IN :adeudados THEN p.monto ELSE 0 END), 0)
            FROM Pago p
            WHERE p.fechaPago BETWEEN :desde AND :hasta
            GROUP BY p.moneda
            """)
    List<Object[]> cajaPorMoneda(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("entraron") Iterable<EstadoPago> entraron,
            @Param("adeudados") Iterable<EstadoPago> adeudados);

    /** @return filas {@code [moneda, medio_pago, monto, cantidad]} */
    @Query("""
            SELECT p.moneda, p.medioPago, SUM(p.monto), COUNT(p)
            FROM Pago p
            WHERE p.fechaPago BETWEEN :desde AND :hasta AND p.estadoPago IN :entraron
            GROUP BY p.moneda, p.medioPago
            ORDER BY SUM(p.monto) DESC
            """)
    List<Object[]> cajaPorMedio(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("entraron") Iterable<EstadoPago> entraron);

    /**
     * Quién debe, cuánto, y desde cuándo.
     *
     * <p>{@code MIN(fechaPago)} y no {@code MAX}: la antigüedad de una deuda se
     * cuenta desde el renglón más viejo. Con {@code MAX}, anotarle otra cuota a
     * alguien que debe hace dos meses le rejuvenecería la deuda a cero días.
     *
     * @return filas {@code [id_usuario, moneda, adeudado, cantidad, desde]}
     */
    @Query("""
            SELECT u.id, p.moneda, SUM(p.monto), COUNT(p), MIN(p.fechaPago)
            FROM Pago p JOIN p.usuario u
            WHERE p.estadoPago IN :adeudados
            GROUP BY u.id, p.moneda
            ORDER BY MIN(p.fechaPago)
            """)
    List<Object[]> deudores(@Param("adeudados") Iterable<EstadoPago> adeudados);
}
