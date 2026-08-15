package com.lajuanita.backend.usuario;

import java.util.Optional;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface UsuarioRepository extends JpaRepository<Usuario, Long> {

    /**
     * Ignora mayúsculas a propósito: el índice único de la base es sobre
     * {@code lower(email)}, así que "Mica@..." y "mica@..." son la misma
     * persona y solo una de las dos puede existir. Buscar con igualdad exacta
     * dejaría afuera a quien escribe su mail con otra capitalización.
     */
    Optional<Usuario> findByEmailIgnoreCase(String email);

    /**
     * Para detectar el teléfono repetido antes de que lo haga el índice único
     * parcial de la base y devuelva un error feo.
     */
    Optional<Usuario> findByTelefono(String telefono);

    /**
     * Listado con buscador. Busca en nombre, apellido y email a la vez, porque
     * Micaela va a tipear lo que se acuerde, no lo que el sistema espere.
     *
     * <p>El orden es por apellido y después nombre -- la razón por la que V4
     * separó las dos columnas.
     *
     * @param patron ya en minúsculas y con los {@code %} puestos; {@code "%"}
     *               para traer todo. <b>Nunca null.</b> Un parámetro nulo acá
     *               hacía fallar la consulta con
     *               {@code function lower(bytea) does not exist}: sin valor,
     *               Postgres no puede deducir el tipo del parámetro y lo liga
     *               como binario. Se arma en el servicio, ver
     *               {@code UsuarioService#patronDeBusqueda}.
     */
    @Query("""
            SELECT u FROM Usuario u
            WHERE LOWER(u.nombre)   LIKE :patron ESCAPE '\\'
               OR LOWER(u.apellido) LIKE :patron ESCAPE '\\'
               OR LOWER(u.email)    LIKE :patron ESCAPE '\\'
            ORDER BY LOWER(u.apellido), LOWER(u.nombre)
            """)
    Page<Usuario> buscar(@Param("patron") String patron, Pageable paginado);
}
