package com.lajuanita.backend.docencia.dto;

import java.time.LocalDate;
import java.util.List;

/**
 * "Mi historial de clases dictadas", que Ghezz pidió textual.
 *
 * <p><b>Cuenta clases, no calcula plata</b>, y esa línea es P20 sin resolver: el
 * alcance pregunta si la liquidación al profesor se calcula sola a partir de esto
 * o se carga a mano, y <b>nadie contestó</b>. Este módulo entrega el insumo —el
 * número de clases dictadas en un período, que es el dato que Ghezz quería tener
 * sin llevar un Excel— y deja la liquidación para cuando exista la respuesta.
 * Inventar una tarifa por clase acá sería decidir por el cliente algo que le
 * cuesta plata.
 *
 * <p>{@link #alumnosAtendidos} no es la suma de participantes: es cuántas
 * personas distintas pasaron. Una clase grupal de tres cuenta como una clase y
 * tres alumnos, y un alumno que fue a ocho clases cuenta una vez.
 */
public record ClasesDictadas(
        LocalDate desde,
        LocalDate hasta,
        long clases,
        long alumnosAtendidos,
        List<PorTipo> porTipo) {

    /** Cuántas de cada cosa: clases de DJ, producción, mentorías. */
    public record PorTipo(String tipoUso, long clases) {
    }
}
