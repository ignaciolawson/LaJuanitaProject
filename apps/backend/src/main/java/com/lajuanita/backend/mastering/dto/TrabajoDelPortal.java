package com.lajuanita.backend.mastering.dto;

import java.math.BigDecimal;
import java.time.LocalDate;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.mastering.EstadoTrabajo;
import com.lajuanita.backend.mastering.TipoTrabajo;
import com.lajuanita.backend.mastering.TrabajoMastering;

/**
 * Un trabajo, como lo ve su cliente.
 *
 * <p><b>Es un record aparte de {@link TrabajoResumen} y esa separación es la que
 * sostiene la regla del módulo.</b> Dos campos no cruzan:
 *
 * <ul>
 *   <li><b>{@code notasInternas}</b> — son de administración. Es lo mismo que hizo
 *       {@code ReservaDelPortal} con las notas de una reserva.
 *   <li><b>El link del premaster, mientras no esté liberado.</b> Acá se decide en
 *       el mapeo y no en la pantalla: {@link #urlPremaster} llega <b>null</b> hasta
 *       que {@code premasterLiberado} es TRUE. Si la decisión viviera en el front,
 *       el link estaría igual en la respuesta HTTP y bastaría abrir las
 *       herramientas del navegador para llevárselo — que es exactamente lo que este
 *       módulo existe para impedir.
 * </ul>
 *
 * <p>El precio sí viaja: es lo que le cobran, no un dato interno.
 */
public record TrabajoDelPortal(
        Long idTrabajo,
        TipoTrabajo tipoTrabajo,
        String nombreTrack,
        EstadoTrabajo estado,
        String profesorAsignado,
        BigDecimal precioAcordado,
        Moneda moneda,
        short revisionesIncluidas,
        short revisionesRealizadas,
        LocalDate fechaEstimada,
        LocalDate fechaEntregaReal,
        String urlMaster,
        /** Null hasta que se libera. Ver la cabecera: la decisión es de acá. */
        String urlPremaster,
        boolean premasterLiberado) {

    public static TrabajoDelPortal de(TrabajoMastering trabajo) {
        var profesor = trabajo.getProfesorAsignado();

        return new TrabajoDelPortal(
                trabajo.getId(),
                trabajo.getTipoTrabajo(),
                trabajo.getNombreTrack(),
                trabajo.getEstado(),
                profesor == null ? null
                        : profesor.getUsuario().getNombre() + " "
                                + profesor.getUsuario().getApellido(),
                trabajo.getPrecioAcordado(),
                trabajo.getMoneda(),
                trabajo.getRevisionesIncluidas(),
                trabajo.getRevisionesRealizadas(),
                trabajo.getFechaEstimada(),
                trabajo.getFechaEntregaReal(),
                trabajo.getUrlMaster(),
                trabajo.isPremasterLiberado() ? trabajo.getUrlPremaster() : null,
                trabajo.isPremasterLiberado());
    }
}
