package com.lajuanita.backend.notificacion.dto;

import java.time.OffsetDateTime;

import com.lajuanita.backend.notificacion.Notificacion;
import com.lajuanita.backend.notificacion.TipoNotificacion;

/**
 * Una fila de la bandeja.
 *
 * <p>No lleva el destinatario: siempre es quien está mirando. Un DTO que lo
 * trajera invitaría a una pantalla que lista las de otro.
 */
public record NotificacionResumen(
        Long idNotificacion,
        TipoNotificacion tipo,
        String titulo,
        String contenido,
        String urlDestino,
        boolean leida,
        OffsetDateTime fechaCreacion) {

    public static NotificacionResumen de(Notificacion notificacion) {
        return new NotificacionResumen(
                notificacion.getId(),
                notificacion.getTipo(),
                notificacion.getTitulo(),
                notificacion.getContenido(),
                notificacion.getUrlDestino(),
                notificacion.isLeida(),
                notificacion.getFechaCreacion());
    }
}
