package com.lajuanita.backend.sala;

import java.time.LocalDate;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BloqueoSalaRepository extends JpaRepository<BloqueoSala, Long> {

    /**
     * Los bloqueos, del más próximo al más lejano.
     *
     * <p><b>No pagina, y lo que la acota es {@code desde}</b>, no un número de
     * filas. Un bloqueo vencido no rechaza nada: la pregunta operativa es "qué
     * salas están fuera de servicio de acá en adelante", y esa lista es corta por
     * definición. El histórico se pide bajando {@code desde}.
     *
     * <p>El {@code JOIN FETCH} de la sala es obligatorio y el del autor no: la
     * columna admite NULL, así que va {@code LEFT}.
     */
    @Query("""
            SELECT b FROM BloqueoSala b
            JOIN FETCH b.sala s
            LEFT JOIN FETCH b.registradoPor
            WHERE b.fechaFin >= :desde
              AND (:idSala IS NULL OR s.id = :idSala)
            ORDER BY b.fechaInicio, s.orden, b.horaInicio
            """)
    List<BloqueoSala> desde(@Param("desde") LocalDate desde, @Param("idSala") Long idSala);
}
