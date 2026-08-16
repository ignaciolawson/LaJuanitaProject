package com.lajuanita.backend.reserva;

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
}
