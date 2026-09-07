package com.lajuanita.backend.solicitante.dto;

import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.solicitante.DestinoDeLaFicha;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.venta.VentaEquipoRepository;

import jakarta.validation.constraints.NotNull;

/**
 * Qué se cargó para cerrar una ficha del buzón.
 *
 * <p><b>Un tipo y un id, y no tres campos anulables.</b> Con tres, mandar dos —o
 * ninguno— es un pedido válido que la base rechaza después con un mensaje de
 * constraint; así, el pedido no se puede ni escribir mal. Del otro lado
 * {@link DestinoDeLaFicha} hace lo mismo con el compilador.
 */
public record DestinoRequest(

        @NotNull(message = "Decí qué se le cargó.")
        Tipo tipo,

        @NotNull(message = "Decí cuál.")
        Long id) {

    /**
     * Lo que una ficha puede producir.
     *
     * <p>Son tres y no cuatro: <b>Mix & Mastering no entra al buzón</b> —llega por
     * WhatsApp a Ghezz—, que es la decisión vigente del Módulo 6 y lo que `V20` ya
     * había resuelto igual.
     */
    public enum Tipo {
        RESERVA, INSCRIPCION, VENTA
    }

    /**
     * Buscar la fila y envolverla en el destino que corresponde.
     *
     * <p>Vive acá y no en el servicio porque es la traducción del pedido al
     * modelo, que es exactamente lo que un DTO hace. El servicio recibe un
     * {@code DestinoDeLaFicha} ya resuelto y no tiene que volver a mirar el tipo.
     */
    public DestinoDeLaFicha resolverCon(ReservaRepository reservas,
            InscripcionRepository inscripciones,
            VentaEquipoRepository ventas) {

        return switch (tipo) {
            case RESERVA -> new DestinoDeLaFicha.DeUnaReserva(
                    reservas.findById(id).orElseThrow(() -> noExiste("la reserva")));
            case INSCRIPCION -> new DestinoDeLaFicha.DeUnaInscripcion(
                    inscripciones.findById(id).orElseThrow(() -> noExiste("la inscripción")));
            case VENTA -> new DestinoDeLaFicha.DeUnaVenta(
                    ventas.findById(id).orElseThrow(() -> noExiste("la venta")));
        };
    }

    private RecursoNoEncontradoException noExiste(String que) {
        return new RecursoNoEncontradoException("No existe " + que + " " + id + ".");
    }
}
