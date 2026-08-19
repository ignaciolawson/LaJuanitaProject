package com.lajuanita.backend.solicitud;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.solicitud.dto.AprobacionRequest;
import com.lajuanita.backend.solicitud.dto.RechazoRequest;
import com.lajuanita.backend.solicitud.dto.SolicitudResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * La bandeja: los pedidos de sala que llegaron del portal.
 *
 * <p><b>Esta pantalla es la que hace que el portal exista.</b> Sin alguien que
 * lea las solicitudes, el portal escribe en una tabla que nadie mira — que es
 * exactamente lo que el cierre del Módulo 2 enseñó a no volver a hacer: el
 * endpoint existía, la pantalla no lo llamaba, y ningún test cruzaba el puente.
 *
 * <p>Permisos como el resto de administración: <b>leer</b> suma DIRECTIVO,
 * <b>resolver</b> es ADMIN·STAFF. Aprobar cobra una seña, así que cae del lado
 * de {@code @PuedeOperar} sin discusión.
 *
 * <p><b>No hay POST acá.</b> Un pedido lo crea quien lo pide, desde
 * {@code /api/me/solicitudes}: administración que necesita una sala carga la
 * reserva directo en el calendario, que para eso tiene permiso. Un alta acá sería
 * pedirle permiso a uno mismo.
 */
@RestController
@RequestMapping("/api/solicitudes-reserva")
public class SolicitudReservaController {

    private final SolicitudReservaService solicitudes;

    public SolicitudReservaController(SolicitudReservaService solicitudes) {
        this.solicitudes = solicitudes;
    }

    /** La bandeja. Sin filtro trae todo; la pantalla abre en PENDIENTE. */
    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<SolicitudResumen> listar(
            @RequestParam(required = false) EstadoSolicitud estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return solicitudes.listar(estado, pagina, tamanio);
    }

    /**
     * Aprobar: crea la reserva con su seña y avisa al que pidió.
     *
     * <p>Es un PATCH sobre la solicitud y no un POST a {@code /api/reservas}
     * porque lo que cambia es el estado de <i>esto</i>; la reserva es la
     * consecuencia. Ver {@link SolicitudReservaService#aprobar}.
     */
    @PatchMapping("/{id}/aprobacion")
    @PuedeOperar
    public SolicitudResumen aprobar(@PathVariable Long id,
            @Valid @RequestBody AprobacionRequest aprobacion,
            Authentication quienPide) {

        return solicitudes.aprobar(id, aprobacion, Autoridades.idDe(quienPide));
    }

    /** Rechazar, diciendo por qué. La base exige el motivo, no solo la pantalla. */
    @PatchMapping("/{id}/rechazo")
    @PuedeOperar
    public SolicitudResumen rechazar(@PathVariable Long id,
            @Valid @RequestBody RechazoRequest rechazo,
            Authentication quienPide) {

        return solicitudes.rechazar(id, rechazo, Autoridades.idDe(quienPide));
    }
}
