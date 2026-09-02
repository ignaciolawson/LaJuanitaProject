package com.lajuanita.backend.bandeja;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.bandeja.dto.Pendientes;
import com.lajuanita.backend.config.PuedeLeerAdministracion;

/**
 * Los contadores del menú de administración (`mejoras.md` §13 · B1).
 *
 * <p><b>Un endpoint de lectura y ninguno de escritura.</b> No hay nada que
 * escribir: cada número baja solo cuando alguien resuelve algo en la pantalla
 * que le corresponde.
 *
 * <p><b>Es un endpoint aparte del de notificaciones, y no uno solo que conteste
 * distinto según quién llame.</b> Es la misma decisión que tomó el Módulo 8 con
 * el tablero y la propiedad que se impuso el Módulo 4: ningún endpoint de este
 * sistema cambia de significado según quién lo llama. Un {@code USUARIO} no
 * tiene bandejas, así que su sidebar no pide esto — pide el suyo, que es
 * {@code GET /api/me/notificaciones/sin-leer} y existe desde el Módulo 4.
 *
 * <p>Lo ve todo el que administra, incluido {@code DIRECTIVO}: son las mismas
 * pantallas que ya ve. Esconderle el número de una sección que sí puede abrir
 * sería mentirle sobre lo que hay adentro.
 */
@RestController
@RequestMapping("/api/pendientes")
public class BandejaController {

    private final BandejaService bandeja;

    public BandejaController(BandejaService bandeja) {
        this.bandeja = bandeja;
    }

    @GetMapping
    @PuedeLeerAdministracion
    public Pendientes pendientes() {
        return bandeja.contar();
    }
}
