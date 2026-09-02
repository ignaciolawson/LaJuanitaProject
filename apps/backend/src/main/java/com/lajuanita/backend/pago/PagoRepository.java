package com.lajuanita.backend.pago;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lajuanita.backend.pago.dto.PagoResumen;
import com.lajuanita.backend.tablero.LineaDeNegocio;

public interface PagoRepository extends JpaRepository<Pago, Long> {

    /**
     * Los filtros de la pantalla de pagos, sin el de la solapa.
     *
     * <p>Vive como constante porque lo comparten tres consultas —la página, su
     * conteo y los totales por línea— y porque el día que se agregue un filtro,
     * tiene que entrar en las tres o la barra de solapas empieza a contar sobre un
     * universo distinto del que muestra la lista.
     *
     * <p>⚠️ <b>Los parámetros que pueden venir en null van con CAST.</b> Sin el
     * cast el driver no puede inferir el tipo de un null y Postgres falla con un
     * mensaje que habla de {@code bytea} — el mismo pozo que {@code Busqueda.patron}
     * documenta del lado del {@code LIKE}.
     *
     * <p>El {@code LEFT JOIN} a {@code usuario} es el de `V19` y sigue siendo la
     * mitad del trabajo de esa migración: con un INNER, <b>todo pago sin cuenta
     * desaparecía del listado sin ningún error</b>. La búsqueda mira también el
     * nombre del pagador externo, con {@code COALESCE} para que un NULL no corte la
     * cadena de OR.
     */
    String DESDE_Y_FILTROS = "FROM pago p "
            + "LEFT JOIN usuario u ON u.id_usuario = p.id_usuario "
            + LineaDeNegocio.JOINS + " "
            + """
            WHERE (CAST(:idUsuario AS bigint)  IS NULL OR p.id_usuario  = :idUsuario)
              AND (CAST(:estado    AS varchar) IS NULL OR p.estado_pago = :estado)
              AND (CAST(:moneda    AS varchar) IS NULL OR p.moneda      = :moneda)
              AND (CAST(:desde     AS date)    IS NULL OR p.fecha_pago >= :desde)
              AND (CAST(:hasta     AS date)    IS NULL OR p.fecha_pago <= :hasta)
              AND (LOWER(COALESCE(u.nombre, ''))   LIKE :patron
                OR LOWER(COALESCE(u.apellido, '')) LIKE :patron
                OR LOWER(COALESCE(u.email, ''))    LIKE :patron
                OR LOWER(COALESCE(p.nombre_pagador_externo, '')) LIKE :patron)""";

    /** Lo mismo, más la solapa elegida. */
    String DESDE_Y_FILTROS_CON_LINEA =
            DESDE_Y_FILTROS + " AND (" + LineaDeNegocio.EXPRESION + ") IN (:lineas)";

    /**
     * Los ids de la página, con los filtros de la pantalla.
     *
     * <p><b>Devuelve ids, y es nativa. Las dos cosas son la misma decisión</b>
     * (`mejoras.md` §13 · B2). Hasta acá era JPQL y su javadoc anotaba el techo con
     * todas las letras: <i>"no se puede filtrar por línea sin duplicar la
     * definición"</i>, porque {@link LineaDeNegocio#EXPRESION} vive en SQL. Las
     * solapas de §13 · B2 filtran justamente por línea, así que había que elegir
     * entre reescribir el {@code CASE} en JPQL —la copia que §12 · B1 vino a
     * evitar, y que se desincroniza sin que nada falle: el mismo pago caería en una
     * solapa en el listado y en otra línea en el tablero— o traer la consulta al
     * dialecto donde la definición ya existe. Se hizo lo segundo.
     *
     * <p><b>Y por eso devuelve ids</b>: una consulta nativa no puede
     * {@code JOIN FETCH}, así que mapear a entidades acá dejaría las asociaciones
     * perezosas y pintar veinte filas costaría decenas de viajes — exactamente lo
     * que {@link #lineasDe} y {@code ventasConPago} existen para no hacer. El
     * detalle lo trae {@link #porIdsConDetalle} en una consulta más.
     *
     * <p>⚠️ <b>{@code :lineas} SIEMPRE llega con elementos.</b> Cuando no hay
     * solapa elegida se le pasan las seis líneas, no una lista vacía: un
     * {@code IN ()} vacío es un error de sintaxis en Postgres, y sobre una
     * colección no se puede escribir el {@code IS NULL} que usan los otros
     * filtros. Con la lista completa la condición es verdadera para todos y no
     * queda un caso especial que mantener.
     *
     * <p>El orden va escrito acá y el {@code Pageable} viaja sin {@code Sort}: en
     * una consulta nativa Spring pegaría el orden usando nombres de propiedad de la
     * entidad, que no son los de las columnas.
     */
    @Query(value = "SELECT p.id_pago " + DESDE_Y_FILTROS_CON_LINEA
            + " ORDER BY p.fecha_pago DESC, p.id_pago DESC",
            countQuery = "SELECT count(*) " + DESDE_Y_FILTROS_CON_LINEA,
            nativeQuery = true)
    Page<Long> idsListados(@Param("idUsuario") Long idUsuario,
            @Param("estado") String estado,
            @Param("moneda") String moneda,
            @Param("lineas") Collection<String> lineas,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("patron") String patron,
            Pageable paginado);

    /**
     * El detalle de una página de pagos, en una sola consulta.
     *
     * <p>Es la segunda mitad de {@link #idsListados}: acá viven los
     * {@code JOIN FETCH} que la nativa no puede tener. Todos {@code LEFT}, por lo
     * mismo de siempre — un pago salda <b>una</b> de las cuatro cosas, y desde
     * `V19` puede además no tener cuenta.
     *
     * <p><b>No ordena.</b> El orden lo decidió la consulta de ids y lo repone el
     * servicio; pedirlo otra vez acá sería una segunda definición del orden de la
     * pantalla, y la que se olvidaría de cambiar el día que el orden cambie.
     */
    @Query("""
            SELECT p FROM Pago p
            LEFT JOIN FETCH p.usuario
            LEFT JOIN FETCH p.inscripcion
            LEFT JOIN FETCH p.reserva r
            LEFT JOIN FETCH r.sala
            WHERE p.id IN :ids
            """)
    List<Pago> porIdsConDetalle(@Param("ids") List<Long> ids);

    /**
     * Cuántos pagos y cuánta plata hay en cada línea, con los filtros de la
     * pantalla puestos (`mejoras.md` §13 · B2).
     *
     * <p>Es lo que alimenta la barra de solapas, y <b>se calcula sobre TODAS las
     * líneas a la vez</b>: cada solapa muestra su número sin que haya que entrar a
     * verla, que es lo que Ignacio pedía cuando dijo que estaba <i>"todo en la
     * misma bolsa"</i>. Por eso usa {@link #DESDE_Y_FILTROS} y no la variante con
     * línea.
     *
     * <p><b>Dos números por fila, y son distintos a propósito.</b> {@code cantidad}
     * cuenta las filas que el listado va a mostrar con esos filtros; el importe
     * suma <b>sólo lo que entró</b>. Sumar la columna entera mezclaría deuda
     * anotada y plata anulada con plata real, que es exactamente lo que
     * {@code EstadoPago.ENTRARON} existe para evitar — y la caja de este sistema ya
     * pagó una vez por esa confusión, en {@code EgresoRepository.porMoneda}.
     *
     * <p>El {@code GROUP BY} repite el {@code CASE} y eso está bien: es la misma
     * constante, pegada dos veces en la misma consulta, no una segunda definición.
     * En SQL nativo se puede; en JPQL, Hibernate 7 lo rechaza — está anotado en
     * {@link LineaDeNegocio}.
     *
     * @return filas {@code [linea, moneda, cantidad, entraron]}
     */
    @Query(value = "SELECT " + LineaDeNegocio.EXPRESION + " AS linea, p.moneda, count(*), "
            + "COALESCE(SUM(CASE WHEN p.estado_pago IN (:entraron) THEN p.monto ELSE 0 END), 0) "
            + DESDE_Y_FILTROS
            + " GROUP BY " + LineaDeNegocio.EXPRESION + ", p.moneda",
            nativeQuery = true)
    List<Object[]> totalesPorLinea(@Param("idUsuario") Long idUsuario,
            @Param("estado") String estado,
            @Param("moneda") String moneda,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("patron") String patron,
            @Param("entraron") Collection<String> entraron);

    /**
     * La línea de negocio de cada uno de estos pagos (`mejoras.md` §12 · B1).
     *
     * <p><b>Una sola consulta para la página entera</b>, no una por fila: con
     * veinte pagos por página lo segundo son veinte viajes para pintar una
     * etiqueta. Es el mismo criterio que {@code ventasConPago}.
     *
     * <p>La definición no está acá: se pega de {@link LineaDeNegocio#EXPRESION},
     * que es la misma que usa el tablero para sumar los ingresos del período. Ese
     * es el punto entero de §12 · B1 — <i>"hay que reusarla, no escribir una
     * segunda"</i>—, y lo que lo hace verificable es que si las dos discreparan,
     * el mismo pago caería en un negocio en el listado y en otro en el tablero.
     *
     * @return filas {@code [id_pago, linea]}
     */
    @Query(value = "SELECT p.id_pago, " + LineaDeNegocio.EXPRESION
            + " FROM pago p " + LineaDeNegocio.JOINS + " "
            + "WHERE p.id_pago IN (:ids)", nativeQuery = true)
    List<Object[]> lineasDe(@Param("ids") List<Long> ids);

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
              AND """ + DeudaCobrable.JPQL + """
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
