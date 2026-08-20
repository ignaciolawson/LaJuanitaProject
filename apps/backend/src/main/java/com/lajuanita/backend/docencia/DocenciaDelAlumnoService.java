package com.lajuanita.backend.docencia;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.alumno.AlumnoRepository;
import com.lajuanita.backend.docencia.dto.MaterialResumen;
import com.lajuanita.backend.docencia.dto.NotaDeAlumno;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;

/**
 * Lo que administración lee del seguimiento de un alumno: las notas de sus
 * profesores y el material que le entregaron.
 *
 * <p><b>Es una clase aparte de {@link DocenciaService} a propósito.</b> Aquella
 * tiene una propiedad escrita en su cabecera y sostenida por veinte casos: todo
 * lo que hace pasa por {@code miDocencia} y {@code verificarQueEsMiAlumno}, y no
 * hay un solo método que se los saltee. Estos dos métodos <b>tienen</b> que
 * saltearlos —administración no es profesor de nadie— y meterlos ahí convertiría
 * esa frase en una casi-verdad, que es la clase de comentario que después nadie
 * relee. Acá el alcance es otro y se ve desde el nombre del archivo.
 *
 * <p>Quién puede llamar esto lo decide {@code @PuedeLeerAdministracion} en el
 * controller: es una autorización por <b>rol</b>, no por identidad, y por eso es
 * una anotación y no un {@code WHERE} — al revés que el portal, donde el alcance
 * es la persona del token y por eso vive en la consulta.
 */
@Service
public class DocenciaDelAlumnoService {

    private final AlumnoRepository alumnos;
    private final NotaProfesorRepository notas;
    private final MaterialRepository materiales;

    public DocenciaDelAlumnoService(AlumnoRepository alumnos, NotaProfesorRepository notas,
            MaterialRepository materiales) {

        this.alumnos = alumnos;
        this.notas = notas;
        this.materiales = materiales;
    }

    /**
     * Todas las notas sobre el alumno, de todos sus profesores.
     *
     * <p>Es la mitad que faltaba de la regla de §8: <i>"sus notas privadas no las
     * ven ni el alumno ni otros profesores. <b>Administración sí</b>"</i>. La
     * primera mitad la sostiene {@code DocenciaService}; ésta es la segunda, y sin
     * ella la regla estaba escrita a medias en el sistema.
     */
    @Transactional(readOnly = true)
    public List<NotaDeAlumno> notasDe(Long idAlumno) {
        verificarQueExiste(idAlumno);

        return notas.todasSobreElAlumno(idAlumno).stream()
                .map(NotaDeAlumno::de)
                .toList();
    }

    /** El material que le llegó, publicado o no. Ver {@code todoLoDelAlumno}. */
    @Transactional(readOnly = true)
    public List<MaterialResumen> materialesDe(Long idAlumno) {
        verificarQueExiste(idAlumno);

        return materiales.todoLoDelAlumno(idAlumno).stream()
                .map(MaterialResumen::de)
                .toList();
    }

    /**
     * Un alumno que no existe contesta 404 y no una lista vacía.
     *
     * <p>Acá sí corresponde distinguir —al revés que en el portal, donde lo ajeno
     * contesta "no existe" para no confirmar que existe—: quien pregunta ya puede
     * ver la ficha de cualquier alumno, así que no hay nada que ocultarle, y una
     * lista vacía por un id equivocado se lee como <i>"este alumno no tiene
     * notas"</i>, que es una respuesta falsa a la pregunta que se hizo.
     */
    private void verificarQueExiste(Long idAlumno) {
        if (!alumnos.existsById(idAlumno)) {
            throw new RecursoNoEncontradoException("No existe el alumno " + idAlumno + ".");
        }
    }
}
