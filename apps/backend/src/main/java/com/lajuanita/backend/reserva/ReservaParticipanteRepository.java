package com.lajuanita.backend.reserva;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

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

    /**
     * La participación de una inscripción en una reserva, si existe (`V23`).
     *
     * <p>Es la pregunta que contesta si <b>una clase es de un curso</b>: existe
     * sólo si el alumno de esa inscripción cursó esa clase <i>con ella</i>. Con
     * una sola condición queda garantizado que la clase sea de ese alumno Y de ese
     * programa, porque desde `V22` la inscripción de una participación es la que
     * sale del tipo de uso de la reserva.
     *
     * <p>La usa el alta de material para dar un mensaje; quien sostiene la regla
     * es el trigger de `V23` §5.
     */
    @Query("""
            SELECT rp FROM ReservaParticipante rp
            JOIN FETCH rp.reserva
            WHERE rp.reserva.id = :idReserva AND rp.inscripcion.id = :idInscripcion
            """)
    Optional<ReservaParticipante> deLaInscripcionEnLaReserva(
            @Param("idReserva") Long idReserva,
            @Param("idInscripcion") Long idInscripcion);
}
