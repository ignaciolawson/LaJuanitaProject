package com.lajuanita.backend.solicitud.dto;

import java.time.LocalDate;
import java.time.LocalTime;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotNull;

/**
 * El horario nuevo con el que se aprueba un pedido de mover una clase.
 *
 * <p><b>Aprobar es mover</b>: no hay un "sí" suelto. Igual que aprobar un pedido
 * de sala es cobrar la seña, acá el "sí" es la franja nueva — y por eso el
 * formulario la pide entera. Un botón de aprobar sin horario dejaría la solicitud
 * marcada APROBADA con la clase todavía en el día que la persona dijo que no
 * podía.
 *
 * <p><b>Lo único que se puede cambiar es sala, día y horario.</b> El tipo de uso y
 * el profesor quedan como estaban: mover una clase es mover una clase. Cambiarle
 * el profesor es otra cosa y tiene su lugar, que es la edición del calendario.
 *
 * <p>Y no se puede aprobar dejando todo igual — lo verifica el servicio. Sin esa
 * guarda, la solicitud queda resuelta, nadie recibe el aviso de que se movió
 * (porque no se movió) y quien pidió se queda esperando un cambio que nunca pasó.
 */
public record AprobacionReprogramacionRequest(

        @NotNull(message = "Elegí la sala.")
        Long idSala,

        @NotNull(message = "Poné la fecha nueva.")
        LocalDate fecha,

        @NotNull(message = "Poné la hora de inicio.")
        LocalTime horaInicio,

        @NotNull(message = "Poné la hora de fin.")
        LocalTime horaFin,

        /** Lo que se le quiera aclarar a la persona. Opcional. */
        String respuesta) {

    /** La regla DB-11, igual que en las otras dos altas de reserva. */
    @AssertTrue(message = "La hora de fin tiene que ser posterior a la de inicio.")
    public boolean isHorarioValido() {
        return horaInicio == null || horaFin == null || horaFin.isAfter(horaInicio);
    }
}
