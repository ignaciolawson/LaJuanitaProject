package com.lajuanita.backend.mastering.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.mastering.EstadoTrabajo;
import com.lajuanita.backend.mastering.TipoTrabajo;
import com.lajuanita.backend.mastering.TrabajoMastering;

/**
 * Un trabajo, como lo ve administración.
 *
 * <p><b>Trae {@link #notasInternas} y por eso no puede ser el DTO del portal.</b>
 * Ese es {@code TrabajoDelPortal}, que además esconde el premaster mientras no
 * esté liberado. Partirlos en dos es la misma decisión que tomó
 * {@code ReservaDelPortal}: reusar este habría publicado las notas internas el día
 * que alguien armara la pantalla del cliente sin mirar.
 *
 * <p>{@link #cobrado} no sale de esta fila sino de {@code pago}: es la suma de lo
 * que entró contra este trabajo, en la moneda del trabajo. La plata vive en `pago`
 * y acá solo se muestra — sumar las dos cosas contaría el mismo billete dos veces.
 */
public record TrabajoResumen(
        Long idTrabajo,
        Long idClienteUsuario,
        /** Ya armado: el de la cuenta si la tiene, si no el externo. */
        String cliente,
        String contactoClienteExterno,
        boolean clienteTieneCuenta,
        Long idProfesorAsignado,
        String profesorAsignado,
        TipoTrabajo tipoTrabajo,
        String nombreTrack,
        BigDecimal precioAcordado,
        Moneda moneda,
        BigDecimal cobrado,
        short revisionesIncluidas,
        short revisionesRealizadas,
        LocalDate fechaEstimada,
        LocalDate fechaEntregaReal,
        EstadoTrabajo estado,
        String urlMaterialCliente,
        String urlMaster,
        String urlPremaster,
        boolean premasterLiberado,
        boolean liberadoSinPago,
        String motivoLiberacion,
        String notasInternas,
        OffsetDateTime fechaCreacion) {

    public static TrabajoResumen de(TrabajoMastering trabajo, BigDecimal cobrado) {
        var cliente = trabajo.getCliente();

        return new TrabajoResumen(
                trabajo.getId(),
                cliente == null ? null : cliente.getId(),
                cliente == null
                        ? trabajo.getNombreClienteExterno()
                        : cliente.getNombre() + " " + cliente.getApellido(),
                trabajo.getContactoClienteExterno(),
                cliente != null,
                trabajo.getProfesorAsignado() == null ? null : trabajo.getProfesorAsignado().getId(),
                trabajo.getProfesorAsignado() == null ? null
                        : trabajo.getProfesorAsignado().getUsuario().getNombre() + " "
                                + trabajo.getProfesorAsignado().getUsuario().getApellido(),
                trabajo.getTipoTrabajo(),
                trabajo.getNombreTrack(),
                trabajo.getPrecioAcordado(),
                trabajo.getMoneda(),
                cobrado,
                trabajo.getRevisionesIncluidas(),
                trabajo.getRevisionesRealizadas(),
                trabajo.getFechaEstimada(),
                trabajo.getFechaEntregaReal(),
                trabajo.getEstado(),
                trabajo.getUrlMaterialCliente(),
                trabajo.getUrlMaster(),
                trabajo.getUrlPremaster(),
                trabajo.isPremasterLiberado(),
                trabajo.isLiberadoSinPago(),
                trabajo.getMotivoLiberacion(),
                trabajo.getNotasInternas(),
                trabajo.getFechaCreacion());
    }
}
