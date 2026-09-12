package com.lajuanita.backend.solicitante.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.dto.InscripcionResumen;
import com.lajuanita.backend.usuario.dto.UsuarioResumen;

/**
 * Lo que devuelve inscribir desde el buzón: la ficha cerrada, la inscripción
 * preinscripta, la cuenta (nueva o la que ya tenía) y lo que hace falta para
 * escribirle — el molde de {@code CabinaApartada}.
 *
 * <p>{@code senia} es <b>la sugerencia del 50%</b> (P59) sobre el precio
 * acordado, para que el WhatsApp diga un número: la base no la exige y quien
 * cobra puede cobrar otra cosa. {@code vence} es hasta cuándo (P72: 24 horas);
 * null si nació activa (una beca, que no tiene qué señar).
 */
public record AlumnoInscripto(
        SolicitanteResumen ficha,
        InscripcionResumen inscripcion,
        UsuarioResumen usuario,
        String passwordTemporal,
        boolean cuentaNueva,
        BigDecimal senia,
        Moneda moneda,
        OffsetDateTime vence) {
}
