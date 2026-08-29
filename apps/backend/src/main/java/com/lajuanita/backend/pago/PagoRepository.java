package com.lajuanita.backend.pago;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
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
    /**
     * ⚠️ <b>El JOIN a `usuario` es LEFT desde `V19`, y ese cambio es la mitad del
     * trabajo de esa migración.</b> Era `JOIN FETCH`, o sea un INNER: con la
     * columna nullable, <b>todo pago sin cuenta desaparecía del listado sin ningún
     * error</b> — el modo de falla que `mejoras.md` §9.1 anota como el verdadero
     * riesgo de esta migración. La pantalla anda, el total miente.
     *
     * <p>Y la búsqueda mira también el nombre del pagador externo: sin eso, buscar
     * a quien compró un CDJ no lo encuentra nunca. El {@code COALESCE} deja la
     * expresión definida cuando el pago sí tiene cuenta — un NULL en una cadena de
     * OR no es FALSE, y ese es un pozo en el que este proyecto ya se cayó con los
     * CHECK de `V7`.
     */
    @Query(value = """
            SELECT p FROM Pago p
            LEFT JOIN FETCH p.usuario u
            LEFT JOIN FETCH p.inscripcion i
            LEFT JOIN FETCH p.reserva r
            LEFT JOIN FETCH r.sala
            WHERE (:idUsuario IS NULL OR u.id = :idUsuario)
              AND (:estado    IS NULL OR p.estadoPago = :estado)
              AND (:moneda    IS NULL OR p.moneda = :moneda)
              AND (:desde     IS NULL OR p.fechaPago >= :desde)
              AND (:hasta     IS NULL OR p.fechaPago <= :hasta)
              AND (LOWER(COALESCE(u.nombre, ''))   LIKE :patron
                OR LOWER(COALESCE(u.apellido, '')) LIKE :patron
                OR LOWER(COALESCE(u.email, ''))    LIKE :patron
                OR LOWER(COALESCE(p.nombrePagadorExterno, '')) LIKE :patron)
            """,
            countQuery = """
            SELECT count(p) FROM Pago p
            LEFT JOIN p.usuario u
            WHERE (:idUsuario IS NULL OR u.id = :idUsuario)
              AND (:estado    IS NULL OR p.estadoPago = :estado)
              AND (:moneda    IS NULL OR p.moneda = :moneda)
              AND (:desde     IS NULL OR p.fechaPago >= :desde)
              AND (:hasta     IS NULL OR p.fechaPago <= :hasta)
              AND (LOWER(COALESCE(u.nombre, ''))   LIKE :patron
                OR LOWER(COALESCE(u.apellido, '')) LIKE :patron
                OR LOWER(COALESCE(u.email, ''))    LIKE :patron
                OR LOWER(COALESCE(p.nombrePagadorExterno, '')) LIKE :patron)
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

    /**
     * ⚠️ <b>LEFT desde `V19`</b>, por lo mismo que {@link #listar}: con un INNER,
     * un pago sin cuenta <b>no se encontraba por id</b> y todo lo que entra por
     * acá —ver el detalle, anularlo, editarlo— contestaba 404 sobre una fila que
     * existe.
     */
    @Query("""
            SELECT p FROM Pago p
            LEFT JOIN FETCH p.usuario
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
     * Cuánto entró contra cada uno de estos trabajos de M&M, por moneda.
     *
     * <p>Una sola consulta para la página entera, como {@link #ventasConPago}, y
     * con la misma lista de estados: {@link EstadoPago#ENTRARON}. Una deuda anotada
     * no es plata cobrada — es la trampa que `V12` encontró del otro lado, cuando
     * un `DEBE` alcanzaba para respaldar una reserva.
     *
     * <p><b>Agrupa por moneda y no suma todo junto</b>, porque un trabajo cotizado
     * en dólares puede recibir un pago en pesos y sumarlos daría un número que no
     * es plata de ninguna de las dos. Quien lea esto decide qué hacer con cada
     * moneda; acá no se convierte nada.
     *
     * @return filas {@code [idTrabajo, moneda, total]}
     */
    @Query("""
            SELECT p.idTrabajoMastering, p.moneda, SUM(p.monto)
            FROM Pago p
            WHERE p.idTrabajoMastering IN :ids AND p.estadoPago IN :entraron
            GROUP BY p.idTrabajoMastering, p.moneda
            """)
    List<Object[]> cobradoPorTrabajo(@Param("ids") List<Long> ids,
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
     * <p>⚠️ <b>LEFT y agrupado también por el pagador externo, desde `V19`.</b> Dos
     * cosas se arreglaron acá, y la segunda es peor que la primera:
     *
     * <ol>
     *   <li>Con {@code JOIN} a secas, <b>una deuda de alguien sin cuenta no
     *       aparecía en la pantalla de deudores</b> — la pantalla que existe
     *       justamente para que ninguna deuda se olvide.</li>
     *   <li>Con {@code GROUP BY u.id} solo, <b>todos los pagadores externos caen en
     *       el mismo grupo</b> (el de {@code NULL}) y sus deudas se suman en una
     *       fila sola: dos personas distintas mostradas como una, con un total que
     *       no es de nadie. Agrupar también por el nombre las separa, y para los
     *       pagos con cuenta ese campo es {@code NULL} y no cambia nada.</li>
     * </ol>
     *
     * @return filas {@code [id_usuario, nombre_externo, contacto_externo, moneda, adeudado, cantidad, desde]}
     */
    @Query("""
            SELECT u.id, p.nombrePagadorExterno, MIN(p.contactoPagadorExterno),
                   p.moneda, SUM(p.monto), COUNT(p), MIN(p.fechaPago)
            FROM Pago p LEFT JOIN p.usuario u
            WHERE p.estadoPago IN :adeudados
            GROUP BY u.id, p.nombrePagadorExterno, p.moneda
            ORDER BY MIN(p.fechaPago)
            """)
    List<Object[]> deudores(@Param("adeudados") Iterable<EstadoPago> adeudados);

    /**
     * Pasar a {@code VENCIDO} la deuda que ya cruzó los 7 días.
     *
     * <p><b>Hasta el 2026-08-20 nadie escribía nunca ese estado.</b> Existe en el
     * CHECK de `V1` desde el primer día, tiene su índice
     * ({@code pago_deudores}), {@link EstadoPago#VENCIDO} lo documenta como
     * <i>"deuda que además pasó los 7 días (§6, alerta automática)"</i> y
     * {@link EstadoPago#ADEUDADOS} lo cuenta — pero la única forma de que una fila
     * llegara ahí era que alguien lo eligiera a mano en el desplegable de
     * `/admin/pagos`. Nadie lo notó porque la pantalla de deudores calcula los días
     * al vuelo, así que <b>se veía bien y el dato guardado no lo estaba</b>: una
     * deuda de 40 días y una de uno eran la misma fila para cualquier consulta que
     * no rehiciera la cuenta.
     *
     * <p><b>No mueve plata</b>: {@code DEBE} y {@code VENCIDO} están los dos en
     * {@link EstadoPago#ADEUDADOS}, así que la caja, el estado de cuenta y la
     * pantalla de deudores dan exactamente lo mismo antes y después. Lo único que
     * cambia es que el dato queda escrito.
     *
     * <p>Solo toca {@code DEBE}. Un {@code ANULADO} o un {@code PAGADO} no vuelven
     * a la deuda por más viejos que sean, y un {@code VENCIDO} ya está donde va —
     * lo que además hace que correr esto diez veces seguidas tenga el mismo efecto
     * que correrlo una.
     *
     * @param limite la fecha a partir de la cual una deuda cuenta como vencida
     * @return cuántas filas cambiaron
     */
    @Modifying
    @Query("""
            UPDATE Pago p SET p.estadoPago = com.lajuanita.backend.pago.EstadoPago.VENCIDO
            WHERE p.estadoPago = com.lajuanita.backend.pago.EstadoPago.DEBE
              AND p.fechaPago < :limite
            """)
    int marcarVencidos(@Param("limite") LocalDate limite);
}
