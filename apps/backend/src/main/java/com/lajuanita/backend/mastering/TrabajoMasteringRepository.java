package com.lajuanita.backend.mastering;

import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TrabajoMasteringRepository extends JpaRepository<TrabajoMastering, Long> {

    /**
     * El tablero, con búsqueda y filtro por estado.
     *
     * <p>Los {@code LEFT JOIN FETCH} traen cliente y profesor de una: la fila los
     * muestra a los dos, y sin esto cada una dispara sus propias consultas.
     *
     * <p>La búsqueda cruza <b>track y cliente</b>, que son las dos preguntas que se
     * le hacen a esta pantalla: *"¿cómo viene el tema de Fulano?"* y *"¿qué le
     * hicimos a este cliente?"*. {@code COALESCE} en todo lo anulable — un
     * {@code LIKE} contra NULL da NULL y esa fila desaparece sin error, que fue el
     * bug que la búsqueda de ventas encontró primero.
     */
    @Query(value = """
            SELECT t FROM TrabajoMastering t
            LEFT JOIN FETCH t.cliente
            LEFT JOIN FETCH t.profesorAsignado pr
            LEFT JOIN FETCH pr.usuario
            WHERE (:estado IS NULL OR t.estado = :estado)
              AND (LOWER(t.nombreTrack) LIKE :patron
                OR LOWER(COALESCE(t.nombreClienteExterno, '')) LIKE :patron
                OR LOWER(COALESCE(t.cliente.nombre, '')) LIKE :patron
                OR LOWER(COALESCE(t.cliente.apellido, '')) LIKE :patron)
            """,
            countQuery = """
            SELECT count(t) FROM TrabajoMastering t
            WHERE (:estado IS NULL OR t.estado = :estado)
              AND (LOWER(t.nombreTrack) LIKE :patron
                OR LOWER(COALESCE(t.nombreClienteExterno, '')) LIKE :patron
                OR LOWER(COALESCE(t.cliente.nombre, '')) LIKE :patron
                OR LOWER(COALESCE(t.cliente.apellido, '')) LIKE :patron)
            """)
    Page<TrabajoMastering> listar(@Param("estado") EstadoTrabajo estado,
            @Param("patron") String patron,
            Pageable paginado);

    /**
     * Los trabajos de una persona, para su portal.
     *
     * <p><b>Solo por {@code cliente}</b>: no hay un segundo camino como sí lo hay
     * en "mi reserva" o "mi alumno". Un trabajo tiene un cliente y punto — y quien
     * no tiene cuenta no tiene portal, que es la mitad de los clientes de M&M.
     *
     * <p>Los cancelados vienen igual, como las reservas canceladas del portal:
     * enterarse de que un trabajo se cayó es justamente para lo que se abre esto.
     */
    @Query("""
            SELECT t FROM TrabajoMastering t
            LEFT JOIN FETCH t.profesorAsignado pr
            LEFT JOIN FETCH pr.usuario
            WHERE t.cliente.id = :idUsuario
            ORDER BY t.fechaCreacion DESC, t.id DESC
            """)
    List<TrabajoMastering> deLaPersona(@Param("idUsuario") Long idUsuario);
}
