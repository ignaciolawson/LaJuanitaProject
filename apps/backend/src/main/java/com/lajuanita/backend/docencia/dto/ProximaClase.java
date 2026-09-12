package com.lajuanita.backend.docencia.dto;

import java.util.List;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Nivel;
import com.lajuanita.backend.reserva.dto.ReservaResumen;

/**
 * La próxima clase que doy, con quiénes vienen (§17 · H1 y H2).
 *
 * <p>{@code clase} puede ser {@code null}: no tener clase por delante es una
 * respuesta, no un error. Y {@code alumnos} trae lo que el profesor quiere
 * saber al abrir la agenda —quién viene, de qué nivel y por qué clase va— que
 * {@link ReservaResumen#participantes()} no tiene: ahí viaja la disciplina y no
 * el nivel, y el número de clase es una cuenta que sólo pide este cuadro.
 *
 * <p>{@code numeroDeClase} y {@code clasesContratadas} son {@code null} para
 * quien está en la clase sin inscripción —un alquiler con gente anotada—, y
 * la pantalla no dibuja "clase null de null".
 */
public record ProximaClase(ReservaResumen clase, List<AlumnoEnLaClase> alumnos) {

    public record AlumnoEnLaClase(
            Long idUsuario,
            String nombre,
            String apellido,
            Disciplina disciplina,
            Nivel nivel,
            /** "Clase 3 de 8": esta es la tercera de su inscripción. */
            Integer numeroDeClase,
            Integer clasesContratadas) {
    }
}
