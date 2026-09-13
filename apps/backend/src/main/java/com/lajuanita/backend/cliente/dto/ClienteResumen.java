package com.lajuanita.backend.cliente.dto;

import java.time.LocalDate;
import java.util.List;

import com.lajuanita.backend.tablero.LineaDeNegocio;

/**
 * Una fila de Clientes (P77 · 3): quién es, cómo se lo contacta, y qué compró.
 *
 * <p>{@code idUsuario} es nulo para quien pagó a nombre escrito y no tiene
 * cuenta: ahí {@code nombre} es el texto tal como se escribió, {@code apellido}
 * no existe, y {@code contacto} es lo que se anotó al cobrar (un teléfono, un
 * mail — texto libre). Con cuenta, van {@code email} y {@code telefono}.
 *
 * <p>No lleva un total: dos monedas no se suman, y la plata de una persona ya
 * tiene su pantalla (el estado de cuenta). Lleva cuántas veces y cuándo, que
 * es lo que dice si alguien vuelve.
 */
public record ClienteResumen(
        Long idUsuario,
        String nombre,
        String apellido,
        String email,
        String telefono,
        String contacto,
        int pagos,
        LocalDate primeraCompra,
        LocalDate ultimaCompra,
        List<LineaDeNegocio> lineas) {

    public boolean tieneCuenta() {
        return idUsuario != null;
    }
}
