package com.lajuanita.backend.solicitante;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitanteRepository extends JpaRepository<Solicitante, Long> {

    /**
     * El buzón.
     *
     * <p><b>Ordena de lo más viejo a lo más nuevo</b>, al revés que casi todos los
     * listados del sistema. Lo que apura una ficha es cuánto hace que nadie la
     * contesta: la de hace cinco días es la que está por perderse, la de hoy puede
     * esperar. Es el mismo criterio con el que {@code solicitud_reserva} ordena por
     * la fecha pedida y no por la de carga — en cada caso, primero lo que se vence.
     *
     * <p>Los {@code LEFT JOIN FETCH} son dos y ambos son LEFT: una ficha pendiente
     * no tiene ni quién la resolvió ni cuenta. Con INNER desaparecerían del listado
     * <b>justo las pendientes</b>, que son las únicas que el buzón abre a mostrar —
     * es el modo de falla que `V19` encontró en {@code PagoRepository.listar} y que
     * no avisa de nada: la consulta anda, la lista viene vacía.
     */
    @Query("""
            SELECT s FROM Solicitante s
            LEFT JOIN FETCH s.usuarioResuelve
            LEFT JOIN FETCH s.usuario
            WHERE (:estado IS NULL OR s.estado = :estado)
            ORDER BY s.fechaCreacion, s.id
            """)
    Page<Solicitante> listar(@Param("estado") EstadoSolicitante estado, Pageable paginado);

    /** Una sola, con lo que el DTO necesita. Mismos LEFT y por el mismo motivo. */
    @Query("""
            SELECT s FROM Solicitante s
            LEFT JOIN FETCH s.usuarioResuelve
            LEFT JOIN FETCH s.usuario
            WHERE s.id = :id
            """)
    Optional<Solicitante> porIdConDetalle(@Param("id") Long id);
}
