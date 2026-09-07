package com.lajuanita.backend.solicitante.dto;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.solicitante.EstadoSolicitante;
import com.lajuanita.backend.solicitante.InteresDelSolicitante;
import com.lajuanita.backend.solicitante.Solicitante;
import com.lajuanita.backend.usuario.Usuario;

/**
 * Una ficha del buzón, como la ve administración.
 *
 * <p><b>Tiene un solo lector</b>, a diferencia de {@code SolicitudResumen}, que
 * sirve a la bandeja y al portal: del otro lado de una ficha hay alguien que
 * todavía no tiene cuenta, así que no hay ninguna pantalla suya donde mostrarla.
 * El día que la haya —"seguí el estado de tu pedido"— va a hacer falta un DTO
 * aparte, porque {@code respuesta} es una nota interna: ahí se escribe "spam" y
 * "llamé tres veces y no atiende".
 */
public record SolicitanteResumen(
        Long idSolicitante,
        String nombre,
        String apellido,
        String email,
        String telefono,
        InteresDelSolicitante interes,
        String detalle,
        String mensaje,
        EstadoSolicitante estado,
        /** Nota interna de quien la atendió. Motivo obligatorio si se descartó. */
        String respuesta,
        String resueltaPor,

        /**
         * La cuenta de esta persona, si ya tiene.
         *
         * <p>⚠️ <b>Puede venir con la ficha PENDIENTE</b>, y eso es lo que cambió
         * en `V27`: tener cuenta dejó de resolver la ficha. Es una comodidad para
         * el cliente (P54), no la respuesta a lo que pidió.
         */
        Long idUsuario,

        // == Qué produjo la ficha, y en qué etapa está (P56) ==================

        Long idReserva,
        Long idInscripcion,
        Long idVentaEquipo,

        /**
         * El estado de la reserva que produjo, si produjo una.
         *
         * <p><b>Viaja para que la pantalla no tenga que ir a buscarlo</b>: es lo
         * que distingue <i>"apartada, falta la seña"</i> de <i>"se venció"</i> y de
         * <i>"listo"</i>, que son tres situaciones con acciones distintas. La ficha
         * no tiene una vida paralela — muestra el estado de lo que produjo.
         */
        EstadoReserva estadoDeLaReserva,

        // == El horario que la persona prefiere (P58) =========================

        LocalDate fechaPreferida,
        LocalTime horaPreferida,
        Integer duracionMinutos,

        OffsetDateTime fechaResolucion,
        OffsetDateTime fechaCreacion) {

    public static SolicitanteResumen de(Solicitante ficha) {
        Usuario resuelve = ficha.getUsuarioResuelve();
        Usuario cuenta = ficha.getUsuario();
        Reserva reserva = ficha.getReserva();

        return new SolicitanteResumen(
                ficha.getId(),
                ficha.getNombre(),
                ficha.getApellido(),
                ficha.getEmail(),
                ficha.getTelefono(),
                ficha.getInteres(),
                ficha.getDetalle(),
                ficha.getMensaje(),
                ficha.getEstado(),
                ficha.getRespuesta(),
                resuelve == null ? null : resuelve.getNombre() + " " + resuelve.getApellido(),
                cuenta == null ? null : cuenta.getId(),
                reserva == null ? null : reserva.getId(),
                ficha.getInscripcion() == null ? null : ficha.getInscripcion().getId(),
                ficha.getVentaEquipo() == null ? null : ficha.getVentaEquipo().getId(),
                reserva == null ? null : reserva.getEstado(),
                ficha.getFechaPreferida(),
                ficha.getHoraPreferida(),
                ficha.getDuracionMinutos(),
                ficha.getFechaResolucion(),
                ficha.getFechaCreacion());
    }
}
