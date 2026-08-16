package com.lajuanita.backend.sala;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface SalaRepository extends JpaRepository<Sala, Long> {

    /**
     * Las salas, en el orden en que se dibujan las columnas del calendario.
     *
     * <p>No pagina, por lo mismo que el listado de profesores: son tres, y su
     * cantidad la decide el local, no el negocio creciendo.
     *
     * <p>Por defecto trae solo las activas. Una sala desactivada no acepta
     * reservas nuevas a futuro pero sí conserva las viejas, así que una pantalla
     * que muestre el pasado necesita poder pedirlas todas.
     */
    @Query("""
            SELECT s FROM Sala s
            WHERE (:incluirInactivas = TRUE OR s.activa = TRUE)
            ORDER BY s.orden, s.nombreSala
            """)
    List<Sala> listar(@Param("incluirInactivas") boolean incluirInactivas);

    /**
     * La matriz de §2.6: qué se puede hacer en cada sala.
     *
     * <p>Va en SQL nativo porque {@code sala_tipo_uso} <b>no tiene entidad, y no
     * la va a tener</b>: es una tabla de asociación con un atributo
     * ({@code advertencia}) que ninguna pantalla necesita recorrer como objeto.
     * Lo que sí necesita el calendario es la lista cruda para no ofrecer
     * combinaciones que la base va a rechazar.
     *
     * <p>La FK compuesta de {@code reserva} es quien decide de verdad. Esto
     * existe para que el formulario no ofrezca "grabación de set en la Sala 1" y
     * después explique un error.
     *
     * @return filas {@code [id_sala, id_tipo_uso, advertencia]}
     */
    @Query(value = """
            SELECT id_sala, id_tipo_uso, advertencia
            FROM sala_tipo_uso
            ORDER BY id_sala, id_tipo_uso
            """, nativeQuery = true)
    List<Object[]> matrizDeUsos();
}
