package com.lajuanita.backend.solicitante.dto;

import java.math.BigDecimal;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.reserva.dto.ReservaResumen;
import com.lajuanita.backend.usuario.dto.UsuarioResumen;

/**
 * Lo que quedó hecho al apartarle la cabina a una ficha: <b>tres cosas en un solo
 * movimiento</b>.
 *
 * <p><b>Viaja completo y no un 204</b> porque cada pieza tiene un destinatario
 * distinto del otro lado de la pantalla:
 *
 * <ul>
 *   <li>{@link #passwordTemporal} es <b>la única contraseña del sistema que no se
 *       puede volver a ver</b>. Si no vuelve acá, se pierde en el mismo momento en
 *       que existe — y recuperarla es generar otra desde Personas.
 *   <li>{@link #reserva} lleva la sala, el horario y <b>el vencimiento</b>, que
 *       es lo que la pantalla necesita para armar el mensaje de WhatsApp: sin el
 *       plazo escrito, quien lee se queda tranquilo sobre un horario que se cae en
 *       24 horas.
 *   <li>{@link #ficha} vuelve ya atendida, apuntando a esa reserva.
 * </ul>
 *
 * <p><b>No reusa {@code ConversionRealizada}</b> aunque se le parezca: aquel trae
 * la ficha como quedó después de crear la cuenta —o sea todavía abierta— y acá la
 * ficha se cerró en el mismo pedido. Devolver ese record obligaría a rearmarlo con
 * una ficha distinta de la que su propio nombre promete.
 *
 * @param passwordTemporal null cuando la persona ya tenía cuenta. No es un dato
 *                         que falte: es la diferencia entre "copiá esto y
 *                         mandáselo" y "ya tiene la suya, no le mandes nada".
 * @param idPagoDeuda      la deuda anotada, para que la pantalla pueda nombrarla.
 * @param monto            lo que hay que abonar. <b>Viaja aunque la pantalla lo
 *                         acabe de mandar</b>: con él arma el mensaje de WhatsApp
 *                         sin volver a leer su propio formulario, que para
 *                         entonces ya se cerró. Y {@code ReservaResumen} no lo
 *                         tiene —una reserva no tiene precio en este esquema (P13)—,
 *                         así que sale del pago que se acaba de anotar.
 */
public record CabinaApartada(
        SolicitanteResumen ficha,
        ReservaResumen reserva,
        UsuarioResumen usuario,
        String passwordTemporal,
        boolean cuentaNueva,
        Long idPagoDeuda,
        BigDecimal monto,
        Moneda moneda) {
}
