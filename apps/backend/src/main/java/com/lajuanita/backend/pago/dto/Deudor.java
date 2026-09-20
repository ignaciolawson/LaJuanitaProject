package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

/**
 * Una deuda: <b>una fila por cosa que se debe</b>, no por persona. La pantalla
 * agrupa por persona (§17 · H9); el scheduler y el tablero leen las filas.
 *
 * <p>Dos formas, que {@link #motivo} distingue: la <b>deuda anotada</b> (una
 * fila de {@code pago} en DEBE/VENCIDO, con {@link #idPago}) y la <b>calculada</b>
 * (una cosa con precio a la que lo cobrado en su moneda no le alcanza, con el id
 * de esa cosa, su {@link #precio} y su {@link #cobrado}). Ver {@link MotivoDeDeuda}
 * y {@code SaldoPendiente}.
 *
 * <p>Sin cuenta (`V19`), {@link #idUsuario} es null y la persona es {@link #nombre}
 * + {@link #telefono} tal como se escribieron: <b>no se la omite</b> — una deuda
 * que no aparece en Deudores es una deuda que nadie va a ir a cobrar.
 */
public record Deudor(
        Long idUsuario,
        String nombre,
        String apellido,
        String email,
        String telefono,

        String moneda,
        /** Lo que falta: el monto de la deuda anotada, o {@code precio - cobrado}. */
        BigDecimal adeudado,

        LocalDate desde,
        int diasDeAtraso,
        boolean vencido,

        // == De qué se trata ==================================================

        MotivoDeDeuda motivo,
        /** Qué es, para leerlo: la disciplina, "Alquiler de cabina en Sala 2, 12/09/2026 14:00", el track, el equipo. */
        String detalle,
        /** El pago en DEBE/VENCIDO, sólo en {@link MotivoDeDeuda#DEUDA_ANOTADA}: es lo que se cobra. */
        Long idPago,
        /** Exactamente uno de los cuatro, en las calculadas; en la anotada, el destino del pago. */
        Long idInscripcion,
        Long idReserva,
        Long idTrabajoMastering,
        Long idVentaEquipo,
        /** El precio de la cosa y lo que ya entró en su moneda; null en la anotada. */
        BigDecimal precio,
        BigDecimal cobrado,
        /** El plazo, cuando lo hay: la preinscripción. */
        OffsetDateTime vence,
        /**
         * La disciplina, cuando la deuda es de un programa — lo que el aviso de
         * preinscripción nombra y lo que la pantalla escribe como "Programa de DJ".
         * Null en las demás.
         *
         * <p>⚠️ <b>Viene de su propia columna desde §23 · B2.</b> Antes se le pasaba
         * {@link #detalle}, que para una inscripción <i>era</i> la disciplina pelada
         * — hasta que `V35` le agregó " · Grupo 8" y la pantalla empezó a decir
         * <i>"Programa de undefined"</i>.
         */
        String disciplina,
        /**
         * El número del grupo cuando la deuda es de una inscripción de 2 o 3
         * (`V35`, P88); null en un alumno solo y en las otras tres clases de deuda.
         *
         * <p><b>Es lo que hace que Deudores nombre al grupo y no al referente</b>
         * (P93): la plata la debe el grupo, el referente es por dónde se la reclama.
         */
        Integer numeroGrupo) {
}
