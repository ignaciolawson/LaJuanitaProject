package com.lajuanita.backend.reserva;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ReservaParticipanteRepository extends JpaRepository<ReservaParticipante, Long> {

    /**
     * Los participantes de un conjunto de reservas, en una sola consulta.
     *
     * <p>Se pide por lista y no de a una porque la agenda los necesita para toda
     * la semana de golpe: una consulta por reserva es el mismo N+1 que los
     * {@code JOIN FETCH} de {@code ReservaRepository} ya evitan.
     *
     * @param idsReserva no puede venir vacía — {@code ReservaService} corta antes
     */
    @Query("""
            SELECT p FROM ReservaParticipante p
            JOIN FETCH p.usuario
            LEFT JOIN FETCH p.inscripcion
            WHERE p.reserva.id IN :idsReserva
            ORDER BY p.id
            """)
    List<ReservaParticipante> deLasReservas(@Param("idsReserva") Collection<Long> idsReserva);

    /** ¿Esta persona ya está anotada en esta clase? */
    boolean existsByReservaIdAndUsuarioId(Long idReserva, Long idUsuario);

    /**
     * Mis participaciones en un rango, para poder decirle a cada uno cómo quedó
     * registrada su asistencia.
     *
     * <p>Va aparte de {@code ReservaRepository.deLaPersona} y no adentro: una
     * reserva puede ser mía sin que yo esté anotado —si la pagué— así que el dato
     * de asistencia es opcional sobre esa lista, no parte de ella. Traerlo con un
     * {@code JOIN} obligaría a elegir entre perder los alquileres o repetir filas.
     *
     * <p>Sin {@code JOIN FETCH}: de la reserva solo se usa el id, para cruzar.
     */
    @Query("""
            SELECT p FROM ReservaParticipante p
            WHERE p.usuario.id = :idUsuario
              AND p.reserva.fecha BETWEEN :desde AND :hasta
            """)
    List<ReservaParticipante> deLaPersona(@Param("idUsuario") Long idUsuario,
            @Param("desde") LocalDate desde,
            @Param("hasta") LocalDate hasta);
}
