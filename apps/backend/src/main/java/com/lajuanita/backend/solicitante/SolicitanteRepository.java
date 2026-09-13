package com.lajuanita.backend.solicitante;

import java.time.OffsetDateTime;
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
            LEFT JOIN FETCH s.reserva
            WHERE (:estado IS NULL OR s.estado = :estado)
              AND (:soloAbiertas = FALSE OR """ + FichaAbierta.JPQL + """
                  )
            ORDER BY s.fechaCreacion, s.id
            """)
    Page<Solicitante> listar(@Param("estado") EstadoSolicitante estado,
            @Param("soloAbiertas") boolean soloAbiertas,
            Pageable paginado);

    /** Una sola, con lo que el DTO necesita. Mismos LEFT y por el mismo motivo. */
    @Query("""
            SELECT s FROM Solicitante s
            LEFT JOIN FETCH s.usuarioResuelve
            LEFT JOIN FETCH s.usuario
            LEFT JOIN FETCH s.reserva
            WHERE s.id = :id
            """)
    Optional<Solicitante> porIdConDetalle(@Param("id") Long id);

    /**
     * Cuántas fichas le deben algo a alguien. El contador del menú.
     *
     * <p>⚠️ <b>Antes era {@code countByEstado(PENDIENTE)} y ése era la mitad del
     * bug.</b> El contador dejaba de mirar en el mismo punto que la lista —al
     * crear la cuenta— así que las dos cosas que existen para que no se pierda
     * nadie se apagaban juntas. Ahora las dos leen {@link FichaAbierta}.
     *
     * <p>Es un {@code @Query} y no una consulta derivada: <b>Spring la valida al
     * levantar el contexto, no al compilar</b>, así que un {@code mvn clean
     * compile} en verde no prueba nada sobre ella — hay que arrancar la
     * aplicación.
     */
    @Query("SELECT count(s) FROM Solicitante s WHERE " + FichaAbierta.JPQL)
    long contarAbiertas();

    /**
     * Cuántas fichas <b>nadie contestó</b> desde hace rato, para el aviso
     * automático (`mejoras.md` §15 · Fase 5).
     *
     * <p>⚠️ <b>Pregunta por {@code PENDIENTE} y NO por {@link FichaAbierta}</b>, y
     * es el único lugar del sistema donde las dos difieren a propósito. Una ficha
     * con la sala apartada y la seña sin cobrar <b>está abierta</b> —le debemos
     * algo— pero <b>fue contestada</b>: alguien la atendió, le apartó el horario y
     * le escribió. Lo que falta ahí es que la persona pague, y de eso avisa la
     * deuda, con su propia regla y su propio plazo. Meterla acá sería avisar dos
     * veces del mismo hecho con dos textos distintos.
     */
    long countByEstadoAndFechaCreacionBefore(EstadoSolicitante estado, OffsetDateTime limite);

    /**
     * La más vieja sin contestar. <b>Es la que le da su clave al aviso.</b>
     *
     * <p>Ver {@code AvisoService} para por qué el aviso se identifica por ella y no
     * por la cantidad ni por el día de la corrida.
     */
    Optional<Solicitante> findFirstByEstadoAndFechaCreacionBeforeOrderByIdAsc(
            EstadoSolicitante estado, OffsetDateTime limite);
}
