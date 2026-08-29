package com.lajuanita.backend.solicitante.dto;

import java.time.OffsetDateTime;

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
        /** La cuenta en la que terminó. Solo si está CONVERTIDA. */
        Long idUsuario,
        OffsetDateTime fechaResolucion,
        OffsetDateTime fechaCreacion) {

    public static SolicitanteResumen de(Solicitante ficha) {
        Usuario resuelve = ficha.getUsuarioResuelve();
        Usuario cuenta = ficha.getUsuario();

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
                ficha.getFechaResolucion(),
                ficha.getFechaCreacion());
    }
}
