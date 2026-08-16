package com.lajuanita.backend.reserva;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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
}
