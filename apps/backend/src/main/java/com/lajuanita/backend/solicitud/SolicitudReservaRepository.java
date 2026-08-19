package com.lajuanita.backend.solicitud;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitudReservaRepository extends JpaRepository<SolicitudReserva, Long> {

    /**
     * La bandeja de administración.
     *
     * <p>Los {@code JOIN FETCH} traen persona, sala y uso en la misma consulta: la
     * pantalla los muestra en cada fila y sin ellos son tres consultas por
     * solicitud, el mismo N+1 que ya se resolvió en los otros listados.
     *
     * <p><b>Ordena por fecha pedida y no por fecha de carga.</b> Lo que apura una
     * solicitud es que la franja se acerca — una para mañana cargada hoy es más
     * urgente que una para el mes que viene cargada la semana pasada.
     */
    @Query("""
            SELECT s FROM SolicitudReserva s
            JOIN FETCH s.usuario
            JOIN FETCH s.sala
            JOIN FETCH s.tipoUso
            LEFT JOIN FETCH s.usuarioResuelve
            WHERE (:estado IS NULL OR s.estado = :estado)
            ORDER BY s.fecha, s.horaInicio, s.id
            """)
    Page<SolicitudReserva> listar(@Param("estado") EstadoSolicitud estado, Pageable paginado);

    /**
     * Lo que pidió una persona, de lo más nuevo a lo más viejo.
     *
     * <p>Trae todos los estados: lo que le rechazaron y lo que canceló también es
     * su historial, y es lo que evita que vuelva a pedir lo mismo.
     */
    @Query("""
            SELECT s FROM SolicitudReserva s
            JOIN FETCH s.sala
            JOIN FETCH s.tipoUso
            LEFT JOIN FETCH s.usuarioResuelve
            WHERE s.usuario.id = :idUsuario
            ORDER BY s.fechaCreacion DESC, s.id DESC
            """)
    List<SolicitudReserva> deLaPersona(@Param("idUsuario") Long idUsuario);

    /** Una sola, con todo lo que el DTO necesita. */
    @Query("""
            SELECT s FROM SolicitudReserva s
            JOIN FETCH s.usuario
            JOIN FETCH s.sala
            JOIN FETCH s.tipoUso
            LEFT JOIN FETCH s.usuarioResuelve
            WHERE s.id = :id
            """)
    Optional<SolicitudReserva> porIdConDetalle(@Param("id") Long id);
}
