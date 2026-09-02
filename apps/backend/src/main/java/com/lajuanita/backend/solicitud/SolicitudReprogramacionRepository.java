package com.lajuanita.backend.solicitud;

import java.util.List;
import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SolicitudReprogramacionRepository extends JpaRepository<SolicitudReprogramacion, Long> {

    /**
     * La bandeja de administración.
     *
     * <p><b>Ordena por la fecha de la clase que se quiere mover</b>, no por cuándo
     * se pidió. Lo que apura un pedido de estos es que la clase se acerca: una
     * clase de mañana pedida hoy es más urgente que una del mes que viene pedida
     * la semana pasada — y si nadie contesta a tiempo, la persona falta y la clase
     * se consume igual. Es el mismo criterio de {@code SolicitudReservaRepository},
     * que también ordena por lo que se vence y no por lo que llegó primero.
     */
    @Query("""
            SELECT s FROM SolicitudReprogramacion s
            JOIN FETCH s.usuario
            JOIN FETCH s.reserva r
            JOIN FETCH r.sala
            JOIN FETCH r.tipoUso
            LEFT JOIN FETCH s.usuarioResuelve
            WHERE (:estado IS NULL OR s.estado = :estado)
            ORDER BY r.fecha, r.horaInicio, s.id
            """)
    Page<SolicitudReprogramacion> listar(@Param("estado") EstadoReprogramacion estado, Pageable paginado);

    /**
     * Lo que pidió una persona, de lo más nuevo a lo más viejo.
     *
     * <p>Trae todos los estados: lo rechazado también es historial, y es lo que
     * evita volver a pedir lo mismo.
     */
    @Query("""
            SELECT s FROM SolicitudReprogramacion s
            JOIN FETCH s.usuario
            JOIN FETCH s.reserva r
            JOIN FETCH r.sala
            JOIN FETCH r.tipoUso
            LEFT JOIN FETCH s.usuarioResuelve
            WHERE s.usuario.id = :idUsuario
            ORDER BY s.fechaSolicitud DESC, s.id DESC
            """)
    List<SolicitudReprogramacion> deLaPersona(@Param("idUsuario") Long idUsuario);

    /** Una sola, con todo lo que el DTO necesita. */
    @Query("""
            SELECT s FROM SolicitudReprogramacion s
            JOIN FETCH s.usuario
            JOIN FETCH s.reserva r
            JOIN FETCH r.sala
            JOIN FETCH r.tipoUso
            LEFT JOIN FETCH s.usuarioResuelve
            WHERE s.id = :id
            """)
    Optional<SolicitudReprogramacion> porIdConDetalle(@Param("id") Long id);

    /**
     * ¿Esa clase ya tiene un pedido esperando respuesta?
     *
     * <p><b>Es un chequeo de servicio y la base no lo sostiene</b>, a diferencia de
     * casi todo el resto de este proyecto: hacerlo bien pide un índice único
     * parcial sobre {@code (id_reserva) WHERE estado = 'PENDIENTE'}, o sea una
     * migración, y esta tanda no toca el esquema. Queda anotado con su costo real,
     * que es chico y visible: entre esta consulta y el INSERT entra otro pedido, y
     * el resultado son <b>dos pedidos sobre la misma clase</b> en la bandeja. Quien
     * los atienda los ve juntos —la bandeja ordena por la fecha de la clase— y
     * aprobar el segundo mueve la clase otra vez, que es exactamente lo que pasaría
     * si los moviera a mano. Lo que no puede pasar es que una solicitud ya resuelta
     * se reabra: eso lo sostiene el trigger de `V13`.
     */
    boolean existsByReservaIdAndEstado(Long idReserva, EstadoReprogramacion estado);

    /** Cuántos pedidos de cambio esperan respuesta. El contador del menú. */
    long countByEstado(EstadoReprogramacion estado);
}
