package com.lajuanita.backend.portal.dto;

import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Un rato en que una sala no está libre, <b>sin decir por qué ni de quién</b>.
 *
 * <p>Es lo que el portal necesita para que alguien pueda pedir una cabina sin
 * pedir a ciegas, y es todo lo que puede ver: la agenda completa dice quién tiene
 * clase con quién y a qué hora, que es información de los demás alumnos. La misma
 * consulta, otra proyección.
 *
 * <p>{@link #motivo} distingue una franja tomada de una sala fuera de servicio
 * porque son dos situaciones distintas para el que pide —la segunda no se
 * arregla eligiendo otro horario cercano— pero no nombra nada ni a nadie.
 */
public record FranjaOcupada(
        LocalDate fecha,
        LocalTime horaInicio,
        LocalTime horaFin,
        Motivo motivo) {

    public enum Motivo {
        /** Ya hay algo agendado ahí. */
        RESERVADA,
        /** La sala está fuera de servicio ese día y a esa hora. */
        BLOQUEADA
    }
}
