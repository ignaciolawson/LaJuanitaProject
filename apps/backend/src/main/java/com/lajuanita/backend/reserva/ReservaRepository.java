package com.lajuanita.backend.reserva;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import com.lajuanita.backend.pago.EstadoPago;

public interface ReservaRepository extends JpaRepository<Reserva, Long> {

    /**
     * La agenda: todas las reservas de un rango de fechas.
     *
     * <p><b>No pagina, y acá la razón es distinta a la de salas o profesores.</b>
     * Un calendario semanal se dibuja entero o no se dibuja: media semana no es
     * media respuesta, es una respuesta equivocada. Lo que acota el tamaño es el
     * rango de fechas, y de eso se ocupa {@code ReservaService} — tres salas por
     * ocho horas de un mes son unas cientos de filas como mucho.
     *
     * <p>Los {@code JOIN FETCH} traen sala, tipo de uso y profesor en la misma
     * consulta. Sin ellos son tres consultas por reserva, y una vista mensual con
     * 200 reservas serían 600.
     *
     * <p>{@code incluirCanceladas} en {@code false} es el default del calendario:
     * una clase cancelada no ocupa la grilla. En {@code true} sirve para el
     * historial de uso, donde interesa justamente qué se cayó.
     */
    @Query("""
            SELECT r FROM Reserva r
            JOIN FETCH r.sala s
            JOIN FETCH r.tipoUso t
            LEFT JOIN FETCH r.profesor p
            LEFT JOIN FETCH p.usuario
            WHERE r.fecha BETWEEN :desde AND :hasta
              AND (:idSala     IS NULL OR s.id = :idSala)
              AND (:idProfesor IS NULL OR p.id = :idProfesor)
              AND (:incluirCanceladas = TRUE OR r.estado IN :ocupan)
            ORDER BY r.fecha, r.horaInicio, s.orden
            """)
    List<Reserva> agenda(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("idSala") Long idSala,
            @Param("idProfesor") Long idProfesor,
            @Param("incluirCanceladas") boolean incluirCanceladas,
            @Param("ocupan") Iterable<EstadoReserva> ocupan);

    /**
     * El uso de cada sala en un período, desglosado por tipo de uso.
     *
     * <p><b>Va en SQL nativo y agrupado en la base, no en Java.</b> Traer las
     * reservas y contarlas acá funcionaría hoy —son cientos— y dejaría de
     * funcionar sin avisar el día que el período sea un año: el informe anual es
     * justamente el que va a pedir el Módulo 8.
     *
     * <p>Los tres {@code FILTER} son la definición canónica de "ocupa la sala"
     * aplicada a contar: una cancelada existe en el historial pero no consumió
     * la sala, así que suma en su columna y no en las horas. La lista de estados
     * viaja como parámetro —{@code EstadoReserva.OCUPAN_LA_SALA}— para no
     * escribirla acá por sexta vez.
     *
     * <p>Las horas salen en segundos divididos por 3600 en vez de restando horas
     * directamente porque {@code hora_fin - hora_inicio} da un {@code interval},
     * y sumar intervalos devuelve algo que el driver no mapea a un número.
     *
     * @return filas {@code [id_sala, id_tipo_uso, reservas, horas, canceladas,
     *         reprogramadas]}
     */
    @Query(value = """
            SELECT r.id_sala,
                   r.id_tipo_uso,
                   count(*) FILTER (WHERE r.estado IN (:ocupan))                      AS reservas,
                   coalesce(sum(EXTRACT(EPOCH FROM (r.hora_fin - r.hora_inicio)) / 3600)
                            FILTER (WHERE r.estado IN (:ocupan)), 0)                  AS horas,
                   count(*) FILTER (WHERE r.estado = 'CANCELADA')                     AS canceladas,
                   count(*) FILTER (WHERE r.estado = 'REPROGRAMADA')                  AS reprogramadas
            FROM reserva r
            WHERE r.fecha BETWEEN :desde AND :hasta
              AND (:idSala IS NULL OR r.id_sala = :idSala)
            GROUP BY r.id_sala, r.id_tipo_uso
            """, nativeQuery = true)
    List<Object[]> usoPorSala(@Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("idSala") Long idSala,
            @Param("ocupan") Iterable<String> ocupan);

    /** Una reserva con todo lo que la pantalla de detalle necesita. */
    @Query("""
            SELECT r FROM Reserva r
            JOIN FETCH r.sala
            JOIN FETCH r.tipoUso
            LEFT JOIN FETCH r.profesor p
            LEFT JOIN FETCH p.usuario
            WHERE r.id = :id
            """)
    Optional<Reserva> porIdConDetalle(@Param("id") Long id);

    /**
     * Las reservas de una persona — <b>la definición de "mía"</b>, y está escrita
     * una sola vez a propósito.
     *
     * <p>`reserva` no tiene titular: quiénes participan viven en
     * {@code reserva_participante} y un alquiler puede no tener a nadie anotado.
     * Así que una reserva es de alguien por dos caminos, y son <b>los mismos dos
     * que `V12` usa para encontrar la plata detrás de una reserva</b>: estar
     * anotado en ella, o haberla pagado. Que sean los mismos dos no es
     * casualidad — es la misma pregunta, "quién está detrás de esto".
     *
     * <p>Dos detalles que deciden el resultado:
     *
     * <ul>
     *   <li><b>La participación cancelada no cuenta.</b> Al alumno que se dio de
     *       baja de esa clase no le corresponde seguir viéndola entre las suyas, y
     *       es la misma exclusión que hace que esa clase no le consuma el curso.
     *   <li><b>El pago tiene que ser plata que entró</b> ({@code SENADO}/
     *       {@code PAGADO}, {@code EstadoPago.ENTRARON}). Una deuda anotada no
     *       hace tuya una reserva, exactamente como no la sostiene: es la lección
     *       de `V12`, que se escribió por haber usado {@code <> 'ANULADO'} donde
     *       iba esta lista.
     * </ul>
     *
     * <p>Trae todos los estados, canceladas incluidas: que se cayó la clase del
     * martes es lo que el alumno necesita ver.
     */
    @Query("""
            SELECT r FROM Reserva r
            JOIN FETCH r.sala
            JOIN FETCH r.tipoUso
            LEFT JOIN FETCH r.profesor p
            LEFT JOIN FETCH p.usuario
            WHERE r.fecha BETWEEN :desde AND :hasta
              AND (EXISTS (SELECT 1 FROM ReservaParticipante rp
                           WHERE rp.reserva = r
                             AND rp.usuario.id = :idUsuario
                             AND rp.estadoAsistencia <> :cancelada)
                OR EXISTS (SELECT 1 FROM Pago g
                           WHERE g.reserva = r
                             AND g.usuario.id = :idUsuario
                             AND g.estadoPago IN :entraron))
            ORDER BY r.fecha, r.horaInicio
            """)
    List<Reserva> deLaPersona(@Param("idUsuario") Long idUsuario,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta,
            @Param("cancelada") EstadoAsistencia cancelada,
            @Param("entraron") Iterable<EstadoPago> entraron);
}
