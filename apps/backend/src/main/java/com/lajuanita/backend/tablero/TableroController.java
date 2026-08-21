package com.lajuanita.backend.tablero;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ContentDisposition;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeVerElTableroCompleto;
import com.lajuanita.backend.tablero.dto.ResumenFinanciero;
import com.lajuanita.backend.tablero.dto.Tablero;
import com.lajuanita.backend.tablero.informe.Trazabilidad;

/**
 * Módulo 8 — el tablero de dirección (§11).
 *
 * <p><b>Dos endpoints de lectura y ninguno de escritura</b>, y esa es la forma
 * entera del módulo:
 *
 * <ul>
 *   <li>{@code GET /api/tablero} — el tablero completo. {@code ADMIN} y
 *       {@code DIRECTIVO}.</li>
 *   <li>{@code GET /api/tablero/resumen} — el resumen financiero básico.
 *       Lo ve además {@code STAFF}.</li>
 * </ul>
 *
 * <p><b>Son dos endpoints y no uno que contesta distinto según el rol.</b> El
 * razonamiento está escrito en {@link ResumenFinanciero} y en
 * {@link PuedeVerElTableroCompleto}, y es la misma propiedad que el Módulo 4 se
 * impuso: ningún endpoint de este sistema cambia de significado según quién lo
 * llame.
 *
 * <p>Que no haya un solo {@code POST} tampoco es una etapa pendiente. §11 lo pide
 * de solo lectura y cada indicador se abre en el módulo donde ese dato se carga;
 * un tablero que además edita es un segundo lugar donde modificar lo mismo, y
 * este proyecto ya decidió esa pregunta cada vez que apareció.
 */
@RestController
@RequestMapping("/api/tablero")
public class TableroController {

    private final TableroService tablero;

    public TableroController(TableroService tablero) {
        this.tablero = tablero;
    }

    /**
     * El tablero completo del período.
     *
     * <p>{@code idSala} filtra <b>solo la grilla de ocupación</b>, que es el único
     * indicador donde la sala significa algo: la caja de una sala no existe, y los
     * alumnos de una sala tampoco. Viaja igual en el eco del período para que la
     * cabecera de trazabilidad de la exportación pueda decir con qué filtros se
     * generó el archivo.
     */
    @GetMapping
    @PuedeVerElTableroCompleto
    public Tablero completo(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Long idSala) {

        return tablero.completo(desde, hasta, idSala);
    }

    /**
     * El tablero como Excel.
     *
     * <p><b>Es de {@code ADMIN} y {@code DIRECTIVO}, igual que el tablero
     * completo</b>, y esa es la regla que hay que sostener si mañana alguien
     * agrega una exportación del resumen: <b>se exporta lo que se puede ver</b>.
     * Un endpoint de exportación con permisos más flojos que la pantalla que
     * exporta es la forma más silenciosa de filtrar datos — nadie revisa dos
     * veces un {@code .xlsx}.
     *
     * <p>Que STAFF no tenga botón de exportar no es una omisión: este archivo
     * existe para la reunión de socios, lleva una cabecera que dice quién lo
     * pidió, y la plata que STAFF necesita todos los días ya está en Caja y en
     * Deudores. Si algún día hace falta, es un endpoint más.
     *
     * <p>La ruta termina en {@code .xlsx} a propósito. Sin extensión, el archivo
     * llega llamándose "exportacion" y Windows no sabe con qué abrirlo; el
     * {@code Content-Disposition} le pone el nombre bueno igual, pero la
     * extensión en la URL es lo que hace que el enlace funcione aunque alguien lo
     * abra en otra pestaña.
     */
    @GetMapping(value = "/exportacion.xlsx",
            produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    @PuedeVerElTableroCompleto
    public ResponseEntity<byte[]> excel(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Long idSala,
            Authentication quienPide) {

        byte[] archivo = tablero.enExcel(desde, hasta, idSala, Autoridades.idDe(quienPide));
        return descarga(archivo, Trazabilidad.nombreDeArchivo(desde, hasta, "xlsx"),
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    }

    /** El mismo informe en PDF: el que se imprime y se lleva a la reunión. */
    @GetMapping(value = "/exportacion.pdf", produces = MediaType.APPLICATION_PDF_VALUE)
    @PuedeVerElTableroCompleto
    public ResponseEntity<byte[]> pdf(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Long idSala,
            Authentication quienPide) {

        byte[] archivo = tablero.enPdf(desde, hasta, idSala, Autoridades.idDe(quienPide));
        return descarga(archivo, Trazabilidad.nombreDeArchivo(desde, hasta, "pdf"),
                MediaType.APPLICATION_PDF_VALUE);
    }

    /**
     * {@code attachment} y no {@code inline}: un informe se baja, no se mira en
     * una pestaña. El contrato del sello hace lo contrario, y a propósito — un
     * PDF de un contrato se abre para leerlo.
     */
    private ResponseEntity<byte[]> descarga(byte[] archivo, String nombre, String tipo) {
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(tipo))
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        ContentDisposition.attachment().filename(nombre).build().toString())
                .body(archivo);
    }

    /**
     * El resumen financiero básico: la caja del período y la deuda viva.
     *
     * <p>Lo puede leer todo el que administra, {@code STAFF} incluido. No es "el
     * tablero recortado": es la plata que STAFF maneja todos los días, que ya ve
     * en {@code /admin/caja} y {@code /admin/deudores} — acá está junta.
     */
    @GetMapping("/resumen")
    @PuedeLeerAdministracion
    public ResumenFinanciero resumen(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {

        return tablero.resumen(desde, hasta);
    }
}
