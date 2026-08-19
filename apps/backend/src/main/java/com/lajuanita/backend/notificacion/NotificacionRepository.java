package com.lajuanita.backend.notificacion;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface NotificacionRepository extends JpaRepository<Notificacion, Long> {

    /**
     * La bandeja de una persona, de lo más nuevo a lo más viejo.
     *
     * <p><b>El filtro por destinatario no es opcional en ningún camino</b>: no hay
     * ninguna consulta en esta interfaz que devuelva notificaciones de otro. Es la
     * forma que toma acá el eje "solo lo mío" — no alcanza con que el controller
     * lo pida bien, tiene que no haber una consulta que permita lo contrario.
     */
    @Query("""
            SELECT n FROM Notificacion n
            WHERE n.destino.id = :idUsuario
              AND (:soloNoLeidas = FALSE OR n.leida = FALSE)
            ORDER BY n.fechaCreacion DESC, n.id DESC
            """)
    List<Notificacion> deLaPersona(@Param("idUsuario") Long idUsuario,
            @Param("soloNoLeidas") boolean soloNoLeidas);

    /** El numerito del campanita. */
    long countByDestinoIdAndLeidaFalse(Long idUsuario);

    /**
     * "Marcar todas como leídas", en una sola sentencia.
     *
     * <p>Es un {@code @Modifying} y no un bucle de {@code save()} a propósito:
     * cargar cien notificaciones para tocarles un booleano es cien filas en la
     * sesión para nada.
     */
    @Modifying
    @Query("""
            UPDATE Notificacion n SET n.leida = TRUE
            WHERE n.destino.id = :idUsuario AND n.leida = FALSE
            """)
    int marcarTodasLeidas(@Param("idUsuario") Long idUsuario);
}
