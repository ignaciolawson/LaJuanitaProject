package com.lajuanita.backend.portal.dto;

import java.util.List;

import com.lajuanita.backend.sala.dto.SalaResumen;
import com.lajuanita.backend.sala.dto.TipoUsoResumen;

/**
 * Con qué se arma el formulario de "pedir una sala": las salas y los usos que un
 * usuario puede pedir.
 *
 * <p><b>Existe porque el catálogo de administración no se le puede abrir al
 * portal.</b> {@code /api/salas} y {@code /api/tipos-uso} son
 * {@code @PuedeLeerAdministracion}; bajarles el permiso para que el portal los
 * lea habría abierto de paso la matriz entera y todos los tipos de uso, que es
 * más de lo que hace falta y es la clase de decisión que después nadie recuerda
 * haber tomado.
 *
 * <p>{@link #usos} viene <b>ya filtrado a lo solicitable</b> (P17): el formulario
 * no puede ofrecer una clase de DJ, porque esa reserva la arma administración. La
 * marca la trae el catálogo, no una lista escrita acá — ver
 * {@code TipoUso.solicitablePorUsuario}. Y las salas vienen con su matriz, así que
 * el formulario tampoco ofrece grabar en la Sala 1.
 *
 * <p>Ninguna de las dos cosas autoriza nada: quien decide sigue siendo la FK
 * compuesta contra {@code sala_tipo_uso} y el trigger de `V13`.
 */
public record CatalogoParaPedir(
        List<SalaResumen> salas,
        List<TipoUsoResumen> usos) {
}
