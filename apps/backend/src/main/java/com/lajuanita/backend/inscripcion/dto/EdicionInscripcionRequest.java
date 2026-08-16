package com.lajuanita.backend.inscripcion.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.inscripcion.Moneda;
import com.lajuanita.backend.inscripcion.Nivel;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;

/**
 * Edición de una inscripción ya cargada.
 *
 * <p><b>La disciplina y el alumno no están.</b> Cambiar cualquiera de los dos no
 * es corregir esta inscripción, es otra inscripción: el índice único de "una
 * activa por disciplina" y las clases ya dictadas cuelgan de esta fila. Se
 * cancela y se crea la que corresponde.
 *
 * <p>{@link #clasesContratadas} sí se edita, y es la salida que nombra el
 * mensaje del trigger de {@code V9} cuando una inscripción se queda sin clases:
 * <i>"para dar más clases hay que ampliar la inscripción"</i>.
 */
public record EdicionInscripcionRequest(

        Long idProfesor,

        Nivel nivel,

        @NotNull(message = "Poné la cantidad de clases.")
        @Positive(message = "La cantidad de clases tiene que ser mayor a cero.")
        Short clasesContratadas,

        /**
         * El precio se puede corregir mientras nadie lo haya pagado todavía.
         *
         * <p>Cuando el Módulo 3 traiga {@code pago} apuntando a la inscripción,
         * esto va a necesitar el mismo tratamiento que tiene anular un pago
         * —autor, fecha y motivo— porque va a estar cambiando un importe que ya
         * tiene plata contra él. Hoy no hay a qué contradecir.
         */
        @NotNull(message = "Poné el precio total del curso.")
        @PositiveOrZero(message = "El precio no puede ser negativo.")
        BigDecimal precioTotal,

        @NotNull(message = "Elegí la moneda.")
        Moneda moneda,

        BigDecimal cotizacionDolar,

        LocalDate fechaInicio,

        String notas,

        /**
         * Solo hace falta cuando el nivel <b>baja</b>. Subirlo o completarlo por
         * primera vez no se firma: no es una decisión discutible.
         *
         * <p>Quién y cuándo no vienen de acá — los pone el servidor con el
         * usuario del token y la hora del momento. Que el cliente pudiera elegir
         * el autor de una firma vaciaría de sentido a la firma.
         */
        String motivoBajaNivel) {
}
