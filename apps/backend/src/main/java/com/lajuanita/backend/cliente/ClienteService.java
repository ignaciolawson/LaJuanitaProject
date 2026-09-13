package com.lajuanita.backend.cliente;

import java.time.LocalDate;
import java.util.Arrays;
import java.util.List;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.cliente.dto.ClienteResumen;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.tablero.LineaDeNegocio;
import com.lajuanita.backend.usuario.Busqueda;

/**
 * Clientes (P77 · 3). Sólo lee: un cliente no se crea acá — se vuelve cliente
 * pagando, y eso lo escribe {@code PagoService}.
 */
@Service
public class ClienteService {

    private final ClienteRepository clientes;

    public ClienteService(ClienteRepository clientes) {
        this.clientes = clientes;
    }

    @Transactional(readOnly = true)
    public Page<ClienteResumen> listar(String buscar, Pageable paginado) {
        List<String> entraron = EstadoPago.ENTRARON.stream().map(Enum::name).toList();
        return clientes.listar(entraron, Busqueda.patron(buscar), paginado).map(ClienteService::fila);
    }

    private static ClienteResumen fila(Object[] f) {
        return new ClienteResumen(
                f[0] == null ? null : ((Number) f[0]).longValue(),
                (String) f[1],
                (String) f[2],
                (String) f[3],
                (String) f[4],
                (String) f[5],
                ((Number) f[6]).intValue(),
                // Hibernate 7 ya entrega LocalDate para una columna DATE (no java.sql.Date).
                (LocalDate) f[7],
                (LocalDate) f[8],
                lineas((String) f[9]));
    }

    /** {@code "CURSOS,VENTA_EQUIPOS"} → la lista, en el orden del enum. */
    private static List<LineaDeNegocio> lineas(String agregadas) {
        if (agregadas == null || agregadas.isBlank()) {
            return List.of();
        }
        List<String> nombres = Arrays.asList(agregadas.split(","));
        return Arrays.stream(LineaDeNegocio.values())
                .filter(l -> nombres.contains(l.name()))
                .toList();
    }
}
