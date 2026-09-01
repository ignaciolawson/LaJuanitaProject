package com.lajuanita.backend.reserva.dto;

import jakarta.validation.constraints.NotNull;

/**
 * Anotar a alguien en una reserva.
 *
 * <p>⚠️ <b>Ya no lleva {@code idInscripcion}, y eso es todo el punto de
 * `mejoras.md` §12 · C1.</b> Lo llevaba, opcional, y la pantalla lo llenaba con
 * un {@code <select>} llamado "Descuenta de" que ofrecía TODAS las inscripciones
 * vigentes de la persona sin mirar para qué era la reserva — así que se podía
 * reservar una sala para producción y descontarle una clase de DJ sin querer.
 *
 * <p><b>Ahora la elige el servidor</b>, a partir de la disciplina del tipo de uso
 * de la reserva ({@code tipo_uso.disciplina}, `V22`). Sacar el campo del DTO es
 * parte del arreglo y no una limpieza: dejarlo e ignorarlo haría que quien lo
 * mandara creyera que decide algo. Lo que se elige mal en silencio no falla.
 *
 * <p>Las reglas que se disparan al anotar siguen siendo de la base: que la
 * inscripción sea del que asiste (`V1` §8.2), que nadie esté en dos salas a la vez
 * (`V9`) y que no se consuman más clases que las contratadas (`V9` §5). El mensaje
 * de esta última nombra la salida —ampliar la inscripción— y llega tal cual a la
 * pantalla.
 */
public record AltaParticipanteRequest(

        @NotNull(message = "Elegí a quién anotar.")
        Long idUsuario,

        String observaciones) {
}
