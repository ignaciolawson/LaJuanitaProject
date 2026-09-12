package com.lajuanita.backend.inscripcion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.Nivel;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import com.lajuanita.backend.dinero.Moneda;

/**
 * Alta de una inscripción: quién cursa qué, con quién, cuántas clases y por
 * cuánto.
 *
 * <p>A diferencia del alta de alumno, acá no hay dos caminos: el alumno tiene
 * que existir. Inscribir a alguien que todavía no es alumno es primero darlo de
 * alta como alumno, que es una operación distinta y con su propia pantalla.
 */
public record AltaInscripcionRequest(

        @NotNull(message = "Decí a qué alumno se inscribe.")
        Long idAlumno,

        /** Opcional: se puede anotar a alguien y decidir después quién lo toma. */
        Long idProfesor,

        @NotNull(message = "Elegí la disciplina.")
        Disciplina disciplina,

        Nivel nivel,

        /**
         * Opcional. Si no viene, se completa con las clases de fábrica de la
         * disciplina — DJ 8, Producción 16 (§13, P34). La mentoría no tiene una,
         * así que ahí es obligatorio decirlo.
         */
        @Positive(message = "La cantidad de clases tiene que ser mayor a cero.")
        Short clasesContratadas,

        /**
         * Cero es válido: una beca es un precio, no una inscripción sin precio.
         * El curso se paga completo antes de empezar (§1), pero eso lo registra
         * el Módulo 3 — acá vive cuánto se acordó, no cuánto entró.
         */
        @NotNull(message = "Poné el precio total del curso.")
        @PositiveOrZero(message = "El precio no puede ser negativo.")
        BigDecimal precioTotal,

        /** Opcional: en null se toma {@code ARS}. */
        Moneda moneda,

        /** Obligatoria si la moneda es {@code USD}; lo verifica la base. */
        BigDecimal cotizacionDolar,

        LocalDate fechaInicio,

        String notas,

        /**
         * La seña, si entró junto con la inscripción (P59, §16 · Fase 6).
         *
         * <p><b>Opcional, y el significado de que falte no es "sin plata"</b>: es
         * que la inscripción nace {@code PREINSCRIPTA} con 24 horas para señar
         * (`V30`, P72). Con seña nace {@code ACTIVA} y el pago entra
         * {@code SENADO} en la misma transacción. Una inscripción en cero (una
         * beca) no tiene qué señar y nace activa sin esto.
         */
        @Valid SenaDeInscripcionRequest sena) {
}
