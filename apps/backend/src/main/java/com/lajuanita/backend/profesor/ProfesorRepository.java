package com.lajuanita.backend.profesor;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface ProfesorRepository extends JpaRepository<Profesor, Long> {

    /**
     * Los profesores, para elegir uno al armar una inscripción.
     *
     * <p><b>No pagina, y es una decisión.</b> El resto de los listados de este
     * sistema paginan porque su tamaño lo decide el negocio creciendo — 80
     * alumnos hoy, más el año que viene. Este lo decide la nómina del estudio,
     * que son unas pocas personas, y lo que consume esta lista es un
     * {@code <select>}: paginar un selector lo empeora. Si algún día el estudio
     * tiene tantos profesores que esto incomoda, lo que corresponde no es
     * paginarlo sino convertirlo en un buscador, como el de alumnos.
     *
     * <p>El {@code JOIN FETCH} evita el N+1 al leer el nombre de cada persona.
     */
    @Query("""
            SELECT p FROM Profesor p
            JOIN FETCH p.usuario u
            WHERE (:incluirInactivos = TRUE OR p.activo = TRUE)
            ORDER BY LOWER(u.apellido), LOWER(u.nombre)
            """)
    List<Profesor> listar(@Param("incluirInactivos") boolean incluirInactivos);

    /**
     * Responde "¿esta persona da clases?" para armar el menú del portal.
     *
     * <p>Igual que en {@code AlumnoRepository}, se pregunta por la existencia de
     * la fila y no por {@code activo}: un profesor dado de baja tiene que poder
     * seguir viendo el historial de las clases que dictó, aunque ya no se le
     * asignen alumnos nuevos.
     */
    boolean existsByUsuarioId(Long idUsuario);

    /**
     * La fila de profesor de una persona. Es la puerta del portal del profesor:
     * ser profesor es una relación y no un rol, así que no lo puede decidir una
     * anotación de seguridad — hay que ir a buscar la fila.
     */
    java.util.Optional<Profesor> findByUsuarioId(Long idUsuario);
}
