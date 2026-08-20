package com.lajuanita.backend.docencia.dto;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.docencia.NotaProfesor;

/**
 * Una nota, <b>como la ve administración</b>: con el nombre de quien la escribió.
 *
 * <p><b>Existe en vez de agregarle un campo a {@link NotaResumen}, y la razón es
 * la regla, no la comodidad.</b> Aquel es la nota como la ve su autor, que ya
 * sabe que es suya; acá el autor <i>es</i> el dato — una ficha con notas de tres
 * profesores sin decir de quién es cada una no se puede leer. Son dos lecturas
 * distintas del mismo registro, y {@code ReservaDelPortal} sentó el precedente:
 * cuando dos pantallas necesitan campos distintos del mismo dato, se parten los
 * DTO en vez de publicar de más "por si acaso".
 *
 * <p><b>Que administración las vea es una regla explícita de §8</b> —"sus notas
 * privadas no las ven ni el alumno ni otros profesores. Administración sí"— y no
 * una excepción que se coló: es quien atiende al alumno cuando el profesor no
 * está.
 *
 * <p>No lleva {@code idAlumno}: viene en la URL, y la nota nunca se mueve de
 * alumno. Tampoco lleva {@code idParticipacion} — administración no cuelga notas
 * de clases, solo las lee, y para leerlas la fecha de la clase alcanza.
 */
public record NotaDeAlumno(
        Long idNota,
        Long idProfesor,
        String profesor,
        /** Null si la nota es general y no de una clase. */
        LocalDate fechaDeLaClase,
        String contenido,
        OffsetDateTime fechaCreacion,
        OffsetDateTime fechaModificacion) {

    public static NotaDeAlumno de(NotaProfesor nota) {
        var participacion = nota.getParticipacion();
        var profesor = nota.getProfesor();

        return new NotaDeAlumno(
                nota.getId(),
                profesor.getId(),
                profesor.getUsuario().getNombre() + " " + profesor.getUsuario().getApellido(),
                participacion == null ? null : participacion.getReserva().getFecha(),
                nota.getContenido(),
                nota.getFechaCreacion(),
                nota.getFechaModificacion());
    }
}
