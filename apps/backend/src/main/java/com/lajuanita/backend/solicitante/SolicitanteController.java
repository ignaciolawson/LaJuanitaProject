package com.lajuanita.backend.solicitante;

import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.pago.dto.MotivoRequest;
import com.lajuanita.backend.solicitante.dto.AltaSolicitanteRequest;
import com.lajuanita.backend.solicitante.dto.ConversionRealizada;
import com.lajuanita.backend.solicitante.dto.SolicitanteResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * El buzón: lo que llega de los formularios de la landing.
 *
 * <p><b>Este controller tiene el único POST público del sistema que no es
 * autenticarse ni registrarse</b>, y esa es su particularidad entera. El resto de
 * la API asume que del otro lado hay una cuenta; acá del otro lado hay alguien
 * que todavía no la tiene, que es justamente el trámite.
 *
 * <p>La ruta pública y las administrativas conviven en la misma clase a propósito:
 * son las dos puntas de una ficha, y separarlas dejaría la regla de "quién
 * atiende" lejos de la de "quién escribe". Los permisos los ponen las
 * anotaciones, método por método, y {@code SeguridadConfig} deja pasar
 * <b>solo el POST</b> a esta ruta — un GET sin token sigue siendo 401, que
 * importa porque el listado tiene teléfonos y mails de gente real.
 *
 * <p>Permisos como el resto de administración: <b>leer</b> suma DIRECTIVO,
 * <b>resolver</b> es ADMIN·STAFF. Convertir crea una cuenta, así que cae del lado
 * de {@code @PuedeOperar} sin discusión.
 */
@RestController
@RequestMapping("/api/solicitantes")
public class SolicitanteController {

    private final SolicitanteService solicitantes;

    public SolicitanteController(SolicitanteService solicitantes) {
        this.solicitantes = solicitantes;
    }

    /**
     * Entra un formulario de la landing. <b>Público.</b>
     *
     * <p>Contesta la ficha creada y no un 204 vacío por una razón de la landing:
     * el formulario necesita poder decir <i>"lo recibimos"</i> con algo que lo
     * respalde. Hoy dice eso mismo sin haber mandado nada, que es el agujero que
     * este endpoint cierra.
     */
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public SolicitanteResumen recibir(@Valid @RequestBody AltaSolicitanteRequest formulario) {
        return solicitantes.recibir(formulario);
    }

    /** El buzón. Sin filtro trae todo; la pantalla abre en PENDIENTE. */
    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<SolicitanteResumen> listar(
            @RequestParam(required = false) EstadoSolicitante estado,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return solicitantes.listar(estado, pagina, tamanio);
    }

    /**
     * Convertir la ficha en una cuenta.
     *
     * <p>Es un POST y no un PATCH —al revés que el descarte— porque <b>crea un
     * recurso</b>: una cuenta que antes no existía, con su contraseña temporal.
     * El cambio de estado de la ficha es la consecuencia, no el hecho.
     */
    @PostMapping("/{id}/conversion")
    @PuedeOperar
    public ConversionRealizada convertir(@PathVariable Long id, Authentication quienPide) {
        return solicitantes.convertir(id, Autoridades.idDe(quienPide));
    }

    /** Descartar, diciendo por qué. La base exige el motivo, no solo la pantalla. */
    @PatchMapping("/{id}/descarte")
    @PuedeOperar
    public SolicitanteResumen descartar(@PathVariable Long id,
            @Valid @RequestBody MotivoRequest motivo,
            Authentication quienPide) {

        return solicitantes.descartar(id, motivo, Autoridades.idDe(quienPide));
    }
}
