package com.lajuanita.backend.pago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.usuario.Usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Plata que entró, o que se anotó como que tiene que entrar.
 *
 * <p><b>Todo pago dice qué salda, y salda exactamente una cosa.</b> Las cuatro
 * FKs son opcionales por separado y el CHECK {@code pago_tiene_destino} exige
 * que haya <i>una</i>: antes decía {@code >= 1} y dejaba apuntar a la vez a una
 * inscripción y a una venta, con el monto contado dos veces en los reportes por
 * línea de negocio. Si alguien paga dos servicios juntos, son dos filas.
 *
 * <p>Cuatro cosas que esta clase <b>no</b> hace:
 *
 * <ul>
 *   <li><b>No decide si el monto es válido.</b> Positivo, con moneda de la lista
 *       y con cotización obligatoria si es USD: los tres son CHECK de `V1`.
 *   <li><b>No se borra nunca.</b> `V6` lo prohíbe con un trigger — es historial
 *       de un negocio real. La salida es {@link EstadoPago#ANULADO}.
 *   <li><b>No deja anular sin firma.</b> `V7` exige autor, fecha y motivo, y era
 *       la única excepción del esquema que no exigía nada. Se escribe con
 *       {@link #anular}, que pone las tres juntas.
 *   <li><b>No deja invalidar un comprobante sin firma</b>, por lo mismo y con su
 *       propio juego de tres columnas. Un comprobante no se borra: se marca.
 * </ul>
 *
 * <p><b>{@code descuentoPorcentaje} es un porcentaje (0–100), no un importe</b>,
 * y {@code monto} es lo <b>efectivamente cobrado</b>, con el descuento ya
 * aplicado. Entonces la caja es la suma de {@code monto} sin recalcular nada, y
 * el porcentaje queda como registro de por qué se cobró menos que la lista. La
 * ambigüedad de leerlo como importe ya costó una vuelta de auditoría, y por eso
 * el nombre lleva la unidad adentro.
 */
@Entity
@Table(name = "pago")
@Getter
@Setter
@NoArgsConstructor
public class Pago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_pago")
    private Long id;

    /** De quién es la plata. Nunca de un `alumno`: la identidad raíz es `usuario`. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @Column(name = "id_usuario_registra")
    private Long idUsuarioRegistra;

    // -- Qué salda: exactamente uno de los cuatro ----------------------------

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_inscripcion")
    private Inscripcion inscripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_reserva")
    private Reserva reserva;

    /**
     * Los dos destinos cuyos módulos no existen todavía (6 y 3-ventas), como
     * {@code Long} y sin relación: mapearlos exigiría entidades para
     * {@code trabajo_mastering} y {@code venta_equipo}, que no hay. La FK de la
     * base sigue estando y sigue validando.
     */
    @Column(name = "id_trabajo_mastering")
    private Long idTrabajoMastering;

    @Column(name = "id_venta_equipo")
    private Long idVentaEquipo;

    // -- La plata ------------------------------------------------------------

    @Column(name = "concepto", length = 200)
    private String concepto;

    /** Lo efectivamente cobrado, con el descuento ya aplicado. */
    @Column(name = "monto", nullable = false, precision = 14, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(name = "moneda", nullable = false, length = 3)
    private Moneda moneda = Moneda.ARS;

    /** Obligatoria si la moneda es USD: sin ella el importe no se reconstruye. */
    @Column(name = "cotizacion_dolar", precision = 14, scale = 4)
    private BigDecimal cotizacionDolar;

    @Enumerated(EnumType.STRING)
    @Column(name = "medio_pago", nullable = false, length = 30)
    private MedioPago medioPago;

    /** Porcentaje 0–100. Con cualquier valor distinto de 0, el motivo es obligatorio. */
    @Column(name = "descuento_porcentaje", nullable = false, precision = 5, scale = 2)
    private BigDecimal descuentoPorcentaje = BigDecimal.ZERO;

    @Column(name = "motivo_descuento", columnDefinition = "text")
    private String motivoDescuento;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_pago", nullable = false, length = 20)
    private EstadoPago estadoPago = EstadoPago.PAGADO;

    // -- El comprobante ------------------------------------------------------

    @Column(name = "comprobante_path", length = 500)
    private String comprobantePath;

    @Column(name = "comprobante_invalido", nullable = false)
    private boolean comprobanteInvalido = false;

    @Column(name = "id_usuario_invalida")
    private Long idUsuarioInvalida;

    @Column(name = "fecha_invalidacion")
    private OffsetDateTime fechaInvalidacion;

    @Column(name = "motivo_invalidacion", columnDefinition = "text")
    private String motivoInvalidacion;

    // -- La anulación --------------------------------------------------------

    @Column(name = "id_usuario_anula")
    private Long idUsuarioAnula;

    @Column(name = "fecha_anulacion")
    private OffsetDateTime fechaAnulacion;

    @Column(name = "motivo_anulacion", columnDefinition = "text")
    private String motivoAnulacion;

    // -- Fechas --------------------------------------------------------------

    /** La del hecho: editable, puede ser anterior a la carga. */
    @Column(name = "fecha_pago", nullable = false)
    private LocalDate fechaPago = LocalDate.now();

    /** La de la carga, que la pone la base. */
    @Column(name = "fecha_registro", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaRegistro;

    // -- Las dos excepciones, cada una con sus tres firmas -------------------

    /**
     * Da de baja el pago.
     *
     * <p><b>Las tres se escriben juntas o `V7` rechaza el UPDATE</b>
     * ({@code pago_anulacion_justificada}), y por eso esto es un método y no tres
     * setters sueltos: es el mismo molde que {@code Inscripcion.firmarBajaDeNivel}.
     * El autor sale del token y la fecha del reloj — nunca del cuerpo del pedido,
     * porque entonces cualquiera firma con el nombre de otro.
     */
    public void anular(Long idAutor, String motivo) {
        this.estadoPago = EstadoPago.ANULADO;
        this.idUsuarioAnula = idAutor;
        this.fechaAnulacion = OffsetDateTime.now();
        this.motivoAnulacion = motivo;
    }

    /**
     * Marca el comprobante como inválido. <b>No lo borra</b> — es una regla dura
     * del alcance (§6) y `V7` la sostiene con las mismas tres exigencias.
     */
    public void invalidarComprobante(Long idAutor, String motivo) {
        this.comprobanteInvalido = true;
        this.idUsuarioInvalida = idAutor;
        this.fechaInvalidacion = OffsetDateTime.now();
        this.motivoInvalidacion = motivo;
    }
}
