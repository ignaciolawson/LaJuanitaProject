package com.lajuanita.backend.tablero;

import java.time.LocalDate;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeVerElTableroCompleto;
import com.lajuanita.backend.tablero.dto.ResumenFinanciero;
import com.lajuanita.backend.tablero.dto.Tablero;

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
