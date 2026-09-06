package com.lajuanita.backend.pago;

import java.time.LocalDate;

import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.pago.dto.AltaEgresoRequest;
import com.lajuanita.backend.pago.dto.ComprobanteResumen;
import com.lajuanita.backend.pago.dto.EgresoResumen;
import com.lajuanita.backend.pago.dto.MotivoRequest;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * Módulo 3, pantalla 5 — la plata que sale.
 *
 * <p>Ruta propia y controller propio aunque el service viva en el mismo paquete:
 * {@code /api/egresos} es otra cosa que {@code /api/pagos} y la matriz de §6 les
 * da permisos distintos de lectura — la caja la ve el DIRECTIVO, y el listado de
 * egresos también.
 */
@RestController
@RequestMapping("/api/egresos")
public class EgresoController {

    private final EgresoService egresos;
    private final ComprobanteEgresoService comprobantes;

    public EgresoController(EgresoService egresos, ComprobanteEgresoService comprobantes) {
        this.egresos = egresos;
        this.comprobantes = comprobantes;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<EgresoResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            // De qué lado del corte: `PROFESOR` son los sueldos, `OTRO` el resto
            // de los gastos (§12 · C3). Viaja como String y no como enum porque no
            // hay ningún enum de esto: es una columna nullable de `egreso` con dos
            // lecturas. Un valor desconocido no rompe nada — no coincide con
            // ninguna rama y devuelve vacío.
            @RequestParam(required = false) String destino,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return egresos.listar(buscar, desde, hasta, destino, pagina, tamanio);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public EgresoResumen registrar(@Valid @RequestBody AltaEgresoRequest solicitud,
            Authentication quienPide) {
        return egresos.registrar(solicitud, Autoridades.idDe(quienPide));
    }

    /**
     * Anular un egreso mal cargado. <b>No se edita y no se borra</b>: `V9` prohíbe
     * el DELETE, así que corregir es anular y volver a cargar.
     *
     * <p>Mismo verbo y misma forma que {@code PATCH /api/pagos/{id}/anulacion}, y
     * el mismo {@link MotivoRequest}: el motivo lo aporta quien pide, el autor sale
     * del token y la fecha del reloj.
     */
    @PatchMapping("/{id}/anulacion")
    @PuedeOperar
    public EgresoResumen anular(@PathVariable Long id,
            @Valid @RequestBody MotivoRequest solicitud,
            Authentication quienPide) {
        return egresos.anular(id, solicitud.motivo(), Autoridades.idDe(quienPide));
    }

    // == Los comprobantes (§14 · C1) =========================================
    //
    // Espejo exacto de los tres de `PagoController`, y esa simetría es el punto:
    // si se separan, "adjuntar un comprobante" significa una cosa en Pagos y otra
    // en Egresos. Van anidados bajo el egreso porque no existen sin él, y porque
    // tener el id en la URL es lo que deja verificar que el comprobante pedido es
    // de ESE egreso — ver `ComprobanteEgresoRepository`, que por eso no tiene un
    // "buscar por id" pelado.
    //
    // ⚠️ NO hay un `/api/me/...` para bajarlo, al revés que del lado del pago. Un
    // egreso no tiene dueño del lado del portal: el destinatario de un sueldo no
    // entra al sistema a descargar su recibo. Si algún día lo hiciera, es una
    // decisión de negocio nueva y no un endpoint que falta.

    /**
     * Adjuntar el comprobante de una salida de plata.
     *
     * <p><b>Va como {@code multipart} y no adentro del alta</b>: un archivo no
     * viaja en un JSON, así que la pantalla hace dos pasos —cargar el egreso,
     * adjuntarle el papel—. Hasta `V25` esto era un {@code String} que alguien
     * tipeaba, o sea un respaldo que no respaldaba nada.
     */
    @PostMapping(path = "/{idEgreso}/comprobantes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ComprobanteResumen adjuntarComprobante(@PathVariable Long idEgreso,
            @RequestPart("archivo") MultipartFile archivo,
            Authentication quienPide) {
        return comprobantes.adjuntar(idEgreso, archivo, Autoridades.idDe(quienPide));
    }

    /**
     * Bajar el comprobante.
     *
     * <p>Sale por acá y no por una ruta estática: acá adentro está el recibo de
     * sueldo de una persona, y no puede quedar en una URL que se adivina.
     */
    @GetMapping("/{idEgreso}/comprobantes/{id}/archivo")
    @PuedeLeerAdministracion
    public ResponseEntity<Resource> descargarComprobante(@PathVariable Long idEgreso,
            @PathVariable Long id) {
        return comprobantes.archivoDe(idEgreso, id).comoRespuesta();
    }

    /**
     * Marcar un comprobante como inválido. <b>No se borra.</b>
     *
     * <p>Lo que se marca es el archivo equivocado, no el egreso, y el correcto se
     * adjunta al lado sin pisar nada — que es toda la razón por la que `V25` hizo
     * una tabla en vez de dejar la columna.
     */
    @PatchMapping("/{idEgreso}/comprobantes/{id}/invalidacion")
    @PuedeOperar
    public ComprobanteResumen invalidarComprobante(@PathVariable Long idEgreso,
            @PathVariable Long id,
            @Valid @RequestBody MotivoRequest solicitud,
            Authentication quienPide) {
        return comprobantes.invalidar(idEgreso, id, solicitud.motivo(), Autoridades.idDe(quienPide));
    }
}
