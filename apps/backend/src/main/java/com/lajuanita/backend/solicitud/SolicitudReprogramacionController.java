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
import com.lajuanita.backend.solicitud.dto.AprobacionReprogramacionRequest;
import com.lajuanita.backend.solicitud.dto.RechazoRequest;
import com.lajuanita.backend.solicitud.dto.ReprogramacionResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * La bandeja de los pedidos de mover una clase.
 *
 * <p><b>Es una bandeja aparte de la de pedidos de sala, y no por prolijidad.</b>
 * Son dos ciclos de vida distintos —`V13` lo dejó escrito al descartar
 * generalizar las tablas—: uno pide <i>mover</i> algo que existe, el otro pide
 * <i>crear</i> algo que no. Y se resuelven distinto: aprobar un pedido de sala es
 * cobrar una seña; aprobar uno de estos es elegir un horario nuevo.
 *
 * <p><b>No hay POST acá.</b> Un pedido lo hace quien no puede ir, desde
 * {@code /api/me/reprogramaciones}: administración que necesita mover una clase la
 * mueve en el calendario, que para eso tiene permiso. Un alta acá sería pedirse
 * permiso a uno mismo.
 *
 * <p>Permisos como el resto de administración: <b>leer</b> suma DIRECTIVO,
 * <b>resolver</b> es ADMIN·STAFF.
 */
@RestController
@RequestMapping("/api/reprogramaciones")
public class SolicitudReprogramacionController {

    private final SolicitudReprogramacionService pedidos;

    public SolicitudReprogramacionController(SolicitudReprogramacionService pedidos) {
        this.pedidos = pedidos;
    }

    /** La bandeja. Sin filtro trae todo; la pantalla abre en PENDIENTE. */
    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<ReprogramacionResumen> listar(
            @RequestParam(required = false) EstadoReprogramacion estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return pedidos.listar(estado, pagina, tamanio);
    }

    /**
     * Aprobar: mueve la clase al horario que viene en el cuerpo.
     *
     * <p>Es un PATCH sobre la solicitud y no un PUT a {@code /api/reservas/{id}}
     * porque lo que cambia de estado es <i>esto</i>; que la clase se mueva es la
     * consecuencia. Ver {@link SolicitudReprogramacionService#aprobar}.
     */
    @PatchMapping("/{id}/aprobacion")
    @PuedeOperar
    public ReprogramacionResumen aprobar(@PathVariable Long id,
            @Valid @RequestBody AprobacionReprogramacionRequest nuevaFranja,
            Authentication quienPide) {

        return pedidos.aprobar(id, nuevaFranja, Autoridades.idDe(quienPide));
    }

    /** Rechazar, diciendo por qué. Es el único aviso que este circuito manda. */
    @PatchMapping("/{id}/rechazo")
    @PuedeOperar
    public ReprogramacionResumen rechazar(@PathVariable Long id,
            @Valid @RequestBody RechazoRequest rechazo,
            Authentication quienPide) {

        return pedidos.rechazar(id, rechazo, Autoridades.idDe(quienPide));
    }
}
