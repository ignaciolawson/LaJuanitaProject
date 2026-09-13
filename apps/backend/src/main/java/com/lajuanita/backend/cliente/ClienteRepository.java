package com.lajuanita.backend.cliente;

import java.util.Collection;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

import com.lajuanita.backend.pago.Pago;
import com.lajuanita.backend.tablero.LineaDeNegocio;

/**
 * Quiénes son clientes de La Juanita (P77 · 3), en <b>una</b> consulta.
 *
 * <p><b>Cliente = alguien con un pago que entró, que no es alumno, ni profesor,
 * ni parte del equipo.</b> "Que entró" es {@code EstadoPago.ENTRARON}
 * (SENADO/PAGADO) — la misma definición con la que `V12` decide si una reserva
 * tiene plata detrás —, así que una deuda anotada no hace cliente a nadie, y
 * una cuenta que se registró sola y nunca pagó tampoco: ésa vive en el
 * Directorio.
 *
 * <p>Son <b>dos mitades unidas</b>, y las dos salen de {@code pago} porque desde
 * `V19` un pago puede ir a nombre escrito: la de arriba, las cuentas (rol
 * USUARIO, sin fila de alumno ni de profesor); la de abajo, los pagadores sin
 * cuenta —compradores de equipos, clientes externos de M&M—, <b>agrupados por
 * el nombre escrito</b>, normalizado en minúsculas y sin espacios de más.
 * ⚠️ Eso es lo máximo que se puede afirmar de ellos: no hay identidad detrás,
 * y cruzar por nombre para <i>unir</i> —con una cuenta, o entre dos formas de
 * escribir el mismo nombre— sería inventarla. Este sistema nunca lo hizo
 * (`V27`: se elige, no se cruza). Agrupar para <i>listar</i> es otra cosa, y
 * la pantalla lo dice.
 *
 * <p>Es nativa y no JPQL por lo mismo que {@code PagoRepository.idsListados}:
 * la línea de negocio de cada pago ({@link LineaDeNegocio#EXPRESION}) vive en
 * SQL, y acá se quiere decir <i>qué</i> compró cada cliente sin escribir una
 * segunda copia del {@code CASE}. Y vive en una sola consulta —no en dos
 * listas unidas en Java— para que el número de la pantalla y el de cualquier
 * lector futuro (un export, el tablero) salgan del mismo lugar.
 *
 * <p>El orden va escrito acá y el {@code Pageable} viaja sin {@code Sort}, como
 * en toda consulta nativa paginada de este proyecto.
 */
public interface ClienteRepository extends Repository<Pago, Long> {

    /** La expresión de la línea, agregada por cliente. */
    String LINEAS = "string_agg(DISTINCT " + LineaDeNegocio.EXPRESION + ", ',')";

    /**
     * Las dos mitades. Columnas: {@code id_usuario} (nulo para quien no tiene
     * cuenta), {@code nombre}, {@code apellido}, {@code email}, {@code telefono},
     * {@code contacto} (el texto libre del pagador externo), {@code pagos},
     * {@code primera}, {@code ultima}, {@code lineas}.
     */
    String CLIENTES = """
            WITH clientes AS (
                SELECT u.id_usuario       AS id_usuario,
                       u.nombre           AS nombre,
                       u.apellido         AS apellido,
                       u.email            AS email,
                       u.telefono         AS telefono,
                       CAST(NULL AS VARCHAR) AS contacto,
                       count(*)           AS pagos,
                       min(p.fecha_pago)  AS primera,
                       max(p.fecha_pago)  AS ultima,
                       """ + LINEAS + """
                                          AS lineas
                FROM pago p
                JOIN usuario u ON u.id_usuario = p.id_usuario
                """ + LineaDeNegocio.JOINS + """

                WHERE p.estado_pago IN (:entraron)
                  AND u.rol = 'USUARIO'
                  AND NOT EXISTS (SELECT 1 FROM alumno   a  WHERE a.id_usuario  = u.id_usuario)
                  AND NOT EXISTS (SELECT 1 FROM profesor pr WHERE pr.id_usuario = u.id_usuario)
                GROUP BY u.id_usuario
              UNION ALL
                SELECT CAST(NULL AS BIGINT),
                       min(p.nombre_pagador_externo),
                       CAST(NULL AS VARCHAR),
                       CAST(NULL AS VARCHAR),
                       CAST(NULL AS VARCHAR),
                       min(p.contacto_pagador_externo),
                       count(*),
                       min(p.fecha_pago),
                       max(p.fecha_pago),
                       """ + LINEAS + """

                FROM pago p
                """ + LineaDeNegocio.JOINS + """

                WHERE p.estado_pago IN (:entraron)
                  AND p.id_usuario IS NULL
                GROUP BY lower(btrim(p.nombre_pagador_externo))
            )
            SELECT id_usuario, nombre, apellido, email, telefono, contacto, pagos, primera, ultima, lineas
            FROM clientes
            WHERE lower(coalesce(nombre, ''))   LIKE :patron ESCAPE '\\'
               OR lower(coalesce(apellido, '')) LIKE :patron ESCAPE '\\'
               OR lower(coalesce(email, ''))    LIKE :patron ESCAPE '\\'
               OR lower(coalesce(contacto, '')) LIKE :patron ESCAPE '\\'
            """;

    @Query(value = CLIENTES + " ORDER BY ultima DESC, lower(coalesce(apellido, '')), lower(nombre)",
            countQuery = "SELECT count(*) FROM (" + CLIENTES + ") todos",
            nativeQuery = true)
    Page<Object[]> listar(@Param("entraron") Collection<String> entraron,
            @Param("patron") String patron,
            Pageable paginado);
}
