package com.lajuanita.backend.pago.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.List;

import com.lajuanita.backend.dinero.Importe;
import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.MedioPago;
import com.lajuanita.backend.pago.Pago;
import com.lajuanita.backend.tablero.LineaDeNegocio;

/**
 * Una fila del listado de pagos.
 *
 * <p>{@code destino} y {@code queSalda} vienen resueltos del servidor: la
 * pantalla necesita decir <i>"Inscripción · DJ inicial"</i> y no
 * <i>"id_inscripcion: 42"</i>, y armar eso en el front obliga a cruzar cuatro
 * listas por fila para algo que acá es un {@code switch}.
 */
public record PagoResumen(
        Long idPago,

        /** Null si el pagador no tiene cuenta (`V19`). Ver {@link #pagador}. */
        Long idUsuario,
        String nombre,
        String apellido,
        String email,

        /**
         * Cómo se llama quien pagó, <b>tenga cuenta o no</b>. Siempre tiene valor.
         *
         * <p>Existe para que la pantalla tenga un solo campo que mostrar en vez de
         * un `if` por fila, y porque una fila de plata sin nombre es exactamente el
         * problema que este sistema resuelve.
         *
         * <p>⚠️ <b>Si el pago salda el curso de un grupo, es el grupo</b> —
         * <i>"Grupo 86"</i>, no el referente (P104, la misma lectura con que
         * Deudores lo nombra desde P93). La plata la debe y la paga el grupo; el
         * referente es por dónde se lo contacta, y sigue viajando en
         * {@link #nombre}/{@link #apellido} para que la pantalla lo diga abajo.
         * Resuelto acá y no en cada pantalla, que es lo que hace que <b>todo lugar
         * que nombre un pago</b> —el listado, el estado de cuenta, la corrección—
         * diga lo mismo sin repetir la regla.
         */
        String pagador,

        /** Si el pagador no tiene cuenta. La pantalla lo marca; no se le puede cruzar el estado de cuenta. */
        boolean pagadorSinCuenta,

        /**
         * El número del grupo cuando el pago salda el curso de uno de 2 o 3
         * (`V35`, P88); null en un alumno solo y en los otros tres destinos.
         *
         * <p>Es lo que le dice a la pantalla que {@link #pagador} ya es el grupo y
         * que {@link #nombre}/{@link #apellido} son el referente, para dibujarlo
         * debajo. Sin este campo la fila no puede distinguir <i>"Grupo 86"</i> de
         * alguien que se llame así.
         */
        Integer numeroGrupo,

        /** Cuál de los cuatro destinos: `INSCRIPCION`, `RESERVA`, … */
        String destino,
        Long idDestino,
        /** Ya legible: "DJ · inicial", "Sala 2 · 14/08 10:00". */
        String queSalda,

        /**
         * La línea de negocio de este pago (`mejoras.md` §12 · B1).
         *
         * <p><b>No es el destino con otro nombre</b>, y la diferencia es el motivo
         * de que exista: el destino es a qué apunta el pago —un hecho de la fila—
         * y la línea cruza el tipo de uso de la reserva. <b>La seña de una clase
         * apunta a una RESERVA y es plata de CURSOS</b>; sin ese cruce, la
         * pantalla diría que el estudio cobró por alquilar lo que cobró por
         * enseñar, que es exactamente lo que {@link LineaDeNegocio} explica.
         *
         * <p>La calcula el servidor con {@link LineaDeNegocio#EXPRESION}, la misma
         * expresión que usa el tablero. Derivarla en el front sería una segunda
         * definición, y entonces un mismo pago podría caer en un negocio en el
         * listado y en otro en el tablero, sin que nada fallara.
         */
        String lineaDeNegocio,

        String concepto,
        BigDecimal monto,
        Moneda moneda,
        BigDecimal cotizacionDolar,
        MedioPago medioPago,
        BigDecimal descuentoPorcentaje,
        String motivoDescuento,
        EstadoPago estadoPago,
        /** Si suma a la caja. Lo decide `EstadoPago.ENTRARON`, no la pantalla. */
        boolean entro,

        /**
         * Los respaldos adjuntos, en orden de carga. <b>Vacía, no null</b>, cuando
         * no hay ninguno: la pantalla dibuja "sin comprobante" y no un hueco.
         *
         * <p>Viaja en el listado y no solo en el detalle a propósito. Es la misma
         * razón por la que {@code queSalda} viene resuelto del servidor: la fila
         * tiene que poder decir <i>si este pago tiene respaldo</i> sin un pedido por
         * fila, que es justo lo que hace inservible un listado de cien pagos.
         */
        List<ComprobanteResumen> comprobantes,

        String motivoAnulacion,
        OffsetDateTime fechaAnulacion,

        LocalDate fechaPago,
        OffsetDateTime fechaRegistro) {

    /**
     * <p>⚠️ <b>Desde `V19` un pago puede no tener cuenta</b>, así que
     * {@code getUsuario()} puede venir en null y este método era uno de los cinco
     * lugares que lo asumían presente (`mejoras.md` §9.1). Sin el chequeo, listar
     * los pagos reventaba con un NPE en la primera fila de una venta cobrada a un
     * comprador externo.
     *
     * <p>Los tres campos de la persona salen en null y el nombre lo aporta
     * {@code pagador}, que <b>siempre</b> tiene valor: es el que la pantalla
     * muestra, y por eso no hay una fila que diga "sin datos".
     */
    public static PagoResumen de(Pago pago) {
        return de(pago, null);
    }

    /**
     * @param linea la que resolvió {@link LineaDeNegocio#EXPRESION}, o null
     *              cuando quien arma el DTO no la consultó — el alta y la
     *              anulación devuelven el pago que acaban de tocar y la pantalla
     *              que los llama no muestra esa columna.
     */
    public static PagoResumen de(Pago pago, String linea) {
        var persona = pago.getUsuario();

        return new PagoResumen(
                pago.getId(),
                persona == null ? null : persona.getId(),
                persona == null ? null : persona.getNombre(),
                persona == null ? null : persona.getApellido(),
                persona == null ? null : persona.getEmail(),
                pagadorDe(pago),
                persona == null,
                numeroGrupoDe(pago),
                destinoDe(pago),
                idDestinoDe(pago),
                queSaldaDe(pago),
                linea,
                pago.getConcepto(),
                Importe.normalizar(pago.getMonto()),
                pago.getMoneda(),
                pago.getCotizacionDolar(),
                pago.getMedioPago(),
                pago.getDescuentoPorcentaje(),
                pago.getMotivoDescuento(),
                pago.getEstadoPago(),
                pago.getEstadoPago().entro(),
                pago.getComprobantes().stream().map(ComprobanteResumen::de).toList(),
                pago.getMotivoAnulacion(),
                pago.getFechaAnulacion(),
                pago.getFechaPago(),
                pago.getFechaRegistro());
    }

    /**
     * El nombre de quien pagó, por el camino que sea. <b>Nunca vuelve vacío</b>: el
     * CHECK {@code pago_pagador_identificado} garantiza que uno de los dos está.
     */
    private static String pagadorDe(Pago pago) {
        // El grupo primero: la plata del curso de un grupo es del grupo, y decir
        // el nombre del referente esconde que ese pago fue por el Grupo 86 (P104).
        Integer grupo = numeroGrupoDe(pago);
        if (grupo != null) {
            return "Grupo " + grupo;
        }
        var persona = pago.getUsuario();
        if (persona != null) {
            return persona.getNombre() + " " + persona.getApellido();
        }
        return pago.getNombrePagadorExterno();
    }

    /** El número del grupo del curso que salda el pago, o null si no salda uno de grupo. */
    private static Integer numeroGrupoDe(Pago pago) {
        return pago.getInscripcion() == null ? null : pago.getInscripcion().getNumeroGrupo();
    }

    private static String destinoDe(Pago pago) {
        if (pago.getInscripcion() != null) return "INSCRIPCION";
        if (pago.getReserva() != null) return "RESERVA";
        if (pago.getIdTrabajoMastering() != null) return "TRABAJO_MASTERING";
        return "VENTA_EQUIPO";
    }

    private static Long idDestinoDe(Pago pago) {
        if (pago.getInscripcion() != null) return pago.getInscripcion().getId();
        if (pago.getReserva() != null) return pago.getReserva().getId();
        if (pago.getIdTrabajoMastering() != null) return pago.getIdTrabajoMastering();
        return pago.getIdVentaEquipo();
    }

    /**
     * Los dos destinos con módulo se nombran; los dos que todavía no lo tienen
     * salen con su id. <b>Se nombran igual</b> en vez de omitirse: una fila que
     * no dice qué salda es exactamente el problema que este sistema resuelve.
     */
    private static String queSaldaDe(Pago pago) {
        if (pago.getInscripcion() != null) {
            var inscripcion = pago.getInscripcion();
            String curso = inscripcion.getNivel() == null
                    ? inscripcion.getDisciplina().name()
                    : inscripcion.getDisciplina().name() + " · " + inscripcion.getNivel().name();
            // "DJ · INICIAL · Grupo 86": la misma forma con que `SaldoPendiente`
            // arma el detalle de una deuda de grupo. Va acá y no sólo en el
            // listado porque el estado de cuenta muestra `queSalda` y no
            // `pagador`: sin esto, la cuenta del referente dice que pagó un curso
            // de DJ y no que lo pagó por el grupo.
            return inscripcion.getNumeroGrupo() == null
                    ? curso
                    : curso + " · Grupo " + inscripcion.getNumeroGrupo();
        }
        if (pago.getReserva() != null) {
            var reserva = pago.getReserva();
            return reserva.getSala().getNombreSala() + " · " + reserva.getFecha() + " " + reserva.getHoraInicio();
        }
        if (pago.getIdTrabajoMastering() != null) {
            return "Trabajo de mastering #" + pago.getIdTrabajoMastering();
        }
        return "Venta de equipo #" + pago.getIdVentaEquipo();
    }
}
