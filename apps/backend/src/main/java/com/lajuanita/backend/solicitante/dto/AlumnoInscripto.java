package com.lajuanita.backend.solicitante.dto;

import java.math.BigDecimal;
import java.time.OffsetDateTime;
import java.util.List;

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
        /** El referente: quien llenó el formulario. */
        UsuarioResumen usuario,
        String passwordTemporal,
        boolean cuentaNueva,
        BigDecimal senia,
        Moneda moneda,
        OffsetDateTime vence,
        /**
         * Las cuentas de los compañeros (`V36`, P92), en el orden de la ficha:
         * una clave por cuenta nacida, cada una con su teléfono para el
         * WhatsApp. Vacía para quien vino solo. El mensaje de la seña va sólo al
         * referente (P88); a los compañeros les va su clave y el portal.
         */
        List<CuentaDeCompanero> companeros) {

    public record CuentaDeCompanero(UsuarioResumen usuario, String passwordTemporal,
            boolean cuentaNueva) {
    }
}
