package com.lajuanita.backend.mastering;

import java.time.LocalDate;
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

    /**
     * Entregado hace rato y todavía sin cobrar (§9, la alerta a los 7 días).
     *
     * <p><b>"Sin cobrar" es "el estado no es {@code PAGADO}", y eso no es un atajo:
     * es la definición que el propio módulo ya tiene.</b> {@code MasteringService}
     * mueve el trabajo a {@code PAGADO} exactamente cuando lo cobrado en la moneda
     * del trabajo alcanza el precio acordado — con la comparación entre monedas
     * prohibida y todo. Rehacer acá la suma de pagos sería una segunda definición
     * de lo mismo, y este proyecto ya paga una de esas ({@code contarClasesConsumidas}
     * contra `V9` §5): el día que se separan, la pantalla dice una cosa y el aviso
     * otra, sin que nada falle.
     *
     * <p>Quedan afuera solos los tres estados que corresponden: {@code PAGADO} está
     * cobrado, {@code CANCELADO} no se entregó, y {@code A_CONFIRMAR}/{@code EN_PROCESO}
     * no llegaron a la entrega. Sobreviven {@code ENTREGADO} y {@code DEBE}, que son
     * el mismo escalón visto desde la plata.
     *
     * <p>Exige {@code fechaEntregaReal}: el aviso cuenta desde la entrega, y un
     * trabajo marcado como entregado sin fecha no tiene desde cuándo contar.
     */
    @Query("""
            SELECT t FROM TrabajoMastering t
            LEFT JOIN FETCH t.cliente
            WHERE t.estado IN (com.lajuanita.backend.mastering.EstadoTrabajo.ENTREGADO,
                               com.lajuanita.backend.mastering.EstadoTrabajo.DEBE)
              AND t.fechaEntregaReal IS NOT NULL
              AND t.fechaEntregaReal < :limite
            ORDER BY t.fechaEntregaReal
            """)
    List<TrabajoMastering> entregadosSinCobrarAntesDe(@Param("limite") LocalDate limite);
}
