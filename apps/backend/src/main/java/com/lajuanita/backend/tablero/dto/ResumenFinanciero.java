package com.lajuanita.backend.tablero.dto;

import java.util.List;

import com.lajuanita.backend.pago.dto.CajaDelPeriodo;
import com.lajuanita.backend.tablero.dto.Tablero.CobrosPendientes;
import com.lajuanita.backend.tablero.dto.Tablero.Periodo;

/**
 * Lo que ve {@code STAFF} del tablero: el resumen financiero básico (§11).
 *
 * <p><b>Es un DTO propio y un endpoint propio, no el tablero completo con
 * campos en {@code null}.</b> Esa es la decisión del módulo y conviene entender
 * por qué, porque la alternativa parecía más barata:
 *
 * <ul>
 *   <li>Un endpoint que devuelve más o menos según quién pregunte <b>cambia de
 *       significado según el que llama</b>, que es exactamente lo que el Módulo 4
 *       se prohibió al construir el portal. Y es imposible de leer en un test:
 *       hay que montar dos usuarios para saber qué contesta.</li>
 *   <li>El día que se agregue un indicador nuevo al tablero, <b>el filtro por rol
 *       es lo que se olvida</b>. Con dos DTOs, agregar un campo a {@link Tablero}
 *       no puede filtrarse a STAFF por accidente: tendría que agregarlo acá a
 *       mano.</li>
 *   <li>Un {@code null} en un DTO no dice si el dato no existe o si no te
 *       corresponde. Son dos cosas distintas y la pantalla las dibuja distinto.</li>
 * </ul>
 *
 * <p>Lo que sí es compartido son los números: la caja es {@link CajaDelPeriodo},
 * el mismo record que devuelve el Módulo 3, y los pendientes son
 * {@link CobrosPendientes}, el mismo que viaja en el tablero completo. No hay
 * nada acá que su lector no pueda ver — la diferencia con el tablero completo no
 * es de detalle, es de alcance: STAFF ve la plata que maneja todos los días y no
 * ve retención, ocupación ni actividad del sello, que son la lectura de la
 * dirección sobre el negocio.
 */
public record ResumenFinanciero(
        Periodo periodo,
        List<CajaDelPeriodo> caja,
        List<CobrosPendientes> pendientes) {
}
