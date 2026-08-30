package com.lajuanita.backend.pago;

import java.time.LocalDate;
import java.util.List;

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
import org.springframework.web.bind.annotation.PutMapping;
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
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.dto.AltaPagoRequest;
import com.lajuanita.backend.pago.dto.CajaDelPeriodo;
import com.lajuanita.backend.pago.dto.ComprobanteResumen;
import com.lajuanita.backend.pago.dto.Deudor;
import com.lajuanita.backend.pago.dto.EdicionPagoRequest;
import com.lajuanita.backend.pago.dto.EstadoDeCuenta;
import com.lajuanita.backend.pago.dto.MotivoRequest;
import com.lajuanita.backend.pago.dto.PagoResumen;
import com.lajuanita.backend.usuario.dto.Pagina;

import jakarta.validation.Valid;

/**
 * Módulo 3 — Pagos y Cobros. Unifica el Excel financiero con el Notion operativo.
 *
 * <p><b>Todo lo de acá es administración.</b> El alcance dice que un alumno ve su
 * propio estado de cuenta y descarga su comprobante, pero eso es el Módulo 4:
 * hoy no hay forma de que entre a ver lo suyo, y darle
 * {@code @PuedeLeerAdministracion} le abriría de paso la caja del estudio. El
 * filtro {@code idUsuario} existe para que administración mire la cuenta de uno,
 * y el portal del alumno va a salir de ahí.
 *
 * <p><b>El alumno sí baja su comprobante, y desde el 2026-08-30 existe</b>
 * ({@code GET /api/me/comprobantes/{id}}): la deuda más vieja del módulo, que
 * esperaba al {@code StorageService} de §2.4. Sigue siendo otro endpoint con otro
 * filtro —el id sale del token—, nunca éste con un permiso más flojo.
 *
 * <p>Las dos operaciones de reversa son {@code PATCH} y no {@code DELETE} a
 * propósito, y eso no es estilo REST: <b>en este esquema la plata no se borra</b>
 * (`V6`), y un comprobante tampoco (§6). Las dos exigen motivo, y el autor y la
 * fecha los pone el servidor.
 */
@RestController
@RequestMapping("/api/pagos")
public class PagoController {

    private final PagoService pagos;
    private final ComprobanteService comprobantes;

    public PagoController(PagoService pagos, ComprobanteService comprobantes) {
        this.pagos = pagos;
        this.comprobantes = comprobantes;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pagina<PagoResumen> listar(
            @RequestParam(required = false) String buscar,
            @RequestParam(required = false) Long idUsuario,
            @RequestParam(required = false) EstadoPago estado,
            @RequestParam(required = false) Moneda moneda,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(defaultValue = "0") int pagina,
            @RequestParam(defaultValue = "20") int tamanio) {

        return pagos.listar(buscar, idUsuario, estado, moneda, desde, hasta, pagina, tamanio);
    }

    /**
     * La caja del período, una fila por moneda (§6, pantalla 3).
     *
     * <p>Va antes que {@code /{id}}: debajo, Spring leería "caja" como un id y
     * devolvería un 400 en vez del informe.
     */
    @GetMapping("/caja")
    @PuedeLeerAdministracion
    public List<CajaDelPeriodo> caja(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {
        return pagos.caja(desde, hasta);
    }

    /** Quién debe, cuánto y hace cuántos días (§6, pantalla 4). */
    @GetMapping("/deudores")
    @PuedeLeerAdministracion
    public List<Deudor> deudores() {
        return pagos.deudores();
    }

    /** El estado de cuenta de una persona (§6, pantalla 2). */
    @GetMapping("/estado-de-cuenta/{idUsuario}")
    @PuedeLeerAdministracion
    public EstadoDeCuenta estadoDeCuenta(@PathVariable Long idUsuario) {
        return pagos.estadoDeCuenta(idUsuario);
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public PagoResumen porId(@PathVariable Long id) {
        return pagos.porId(id);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public PagoResumen registrar(@Valid @RequestBody AltaPagoRequest solicitud,
            Authentication quienPide) {
        return pagos.registrar(solicitud, Autoridades.idDe(quienPide));
    }

    /**
     * Corregir un pago mal cargado (`V19` §2).
     *
     * <p><b>`PUT` y no `PATCH`</b>: llega el pago entero y se guarda entero, que es
     * lo que hace el formulario. Los `PATCH` de esta clase son otra cosa — cada uno
     * es <i>una transición con su propia regla</i> (anular, invalidar el
     * comprobante), no una edición de campos.
     *
     * <p>Queda firmado quién editó: lo exige {@code pago_edicion_con_autor}, y el
     * autor sale del token. No se editan ni el pagador ni el destino — ver
     * {@link EdicionPagoRequest}.
     */
    @PutMapping("/{id}")
    @PuedeOperar
    public PagoResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionPagoRequest solicitud,
            Authentication quienPide) {
        return pagos.editar(id, solicitud, Autoridades.idDe(quienPide));
    }

    /** Anular un pago ya cargado. No se borra nunca (P15). */
    @PatchMapping("/{id}/anulacion")
    @PuedeOperar
    public PagoResumen anular(@PathVariable Long id,
            @Valid @RequestBody MotivoRequest solicitud,
            Authentication quienPide) {
        return pagos.anular(id, solicitud.motivo(), Autoridades.idDe(quienPide));
    }

    // == Los comprobantes ====================================================
    //
    // Anidados bajo el pago porque no existen sin él, y porque tener el id del pago
    // en la URL es lo que deja verificar que el comprobante pedido es de ESE pago.
    // Ver `ComprobanteRepository`, que por eso no tiene un "buscar por id" pelado.

    /**
     * Adjuntar un comprobante.
     *
     * <p><b>Va como {@code multipart} y no adentro del alta del pago</b>, que es lo
     * que cambió con `V21`: hasta entonces el comprobante era un {@code String} que
     * alguien tipeaba en el formulario, o sea un respaldo que no respaldaba nada.
     * Un archivo no viaja en un JSON, así que la pantalla hace dos pasos —crear el
     * pago, adjuntarle el archivo— y por eso las dos altas que crean una seña
     * devuelven el id del pago que crearon.
     *
     * <p>El tipo lo decide el contenido y no la extensión, y el nombre con el que se
     * guarda lo elige el sistema: las dos cosas las hace {@code Almacenamiento}.
     */
    @PostMapping(path = "/{idPago}/comprobantes", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ComprobanteResumen adjuntarComprobante(@PathVariable Long idPago,
            @RequestPart("archivo") MultipartFile archivo,
            Authentication quienPide) {
        return comprobantes.adjuntar(idPago, archivo, Autoridades.idDe(quienPide));
    }

    /**
     * Bajar un comprobante.
     *
     * <p>Sale por acá y no por una ruta estática: un comprobante tiene el nombre y
     * el banco de una persona, así que no puede quedar en una URL que se adivina o
     * se comparte sin querer. Quien llega acá ya pasó por la anotación — y el alumno
     * baja el suyo por {@code /api/me/comprobantes/{id}}, que es otro endpoint con
     * otro filtro, no éste con un permiso más flojo.
     */
    @GetMapping("/{idPago}/comprobantes/{id}/archivo")
    @PuedeLeerAdministracion
    public ResponseEntity<Resource> descargarComprobante(@PathVariable Long idPago,
            @PathVariable Long id) {
        return comprobantes.archivoDe(idPago, id).comoRespuesta();
    }

    /**
     * Marcar un comprobante como inválido. <b>Tampoco se borra</b> (§6).
     *
     * <p>Antes esto vivía sobre el pago —{@code PATCH /{id}/comprobante-invalido}—
     * porque el comprobante era una columna suya. Con `V21` cada respaldo es una
     * fila con su propia firma: lo que se marca es el archivo equivocado, no el
     * pago, y el correcto se adjunta al lado sin pisar nada.
     */
    @PatchMapping("/{idPago}/comprobantes/{id}/invalidacion")
    @PuedeOperar
    public ComprobanteResumen invalidarComprobante(@PathVariable Long idPago,
            @PathVariable Long id,
            @Valid @RequestBody MotivoRequest solicitud,
            Authentication quienPide) {
        return comprobantes.invalidar(idPago, id, solicitud.motivo(), Autoridades.idDe(quienPide));
    }
}
