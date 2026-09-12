package com.lajuanita.backend.solicitante.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Nivel;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Inscribir a quien pidió un curso desde la web, desde su ficha (§16 · B2 1.1,
 * P59 · P64 · P66 · P72).
 *
 * <p>Es {@code AltaInscripcionRequest} sin el alumno —sale de la ficha— y sin la
 * seña: <b>desde el buzón la inscripción nace PREINSCRIPTA</b>, con 24 horas
 * para señar. La persona todavía no pagó nada, y lo que se le manda por
 * WhatsApp es justamente eso: te anotamos, la seña es tanto, hasta cuándo.
 *
 * <p>Todo lo demás viene <b>prellenado por la pantalla desde el catálogo y la
 * ficha</b> y editable (P66: <i>"que sea todo modificable"</i>): la disciplina
 * de {@code solicitante.disciplina}, el nivel de {@code nivelSugerido}, precio
 * y clases del programa. {@code nivel} puede venir vacío: entonces el servidor
 * usa la sugerencia de la ficha, para que el prellenado no viva en dos lados.
 */
public record InscribirDesdeElBuzonRequest(

        @NotNull(message = "Elegí el programa.")
        Disciplina disciplina,

        Nivel nivel,

        /** Opcional (P37, P66): se asigna al inscribir si se sabe, y se edita después. */
        Long idProfesor,

        /** Opcional salvo para un programa sin estándar (la mentoría, P65). */
        @Positive(message = "La cantidad de clases tiene que ser mayor a cero.")
        Short clasesContratadas,

        @NotNull(message = "Poné el precio total del programa.")
        @PositiveOrZero(message = "El precio no puede ser negativo.")
        BigDecimal precioTotal,

        Moneda moneda,

        BigDecimal cotizacionDolar,

        LocalDate fechaInicio,

        String notas) {
}
