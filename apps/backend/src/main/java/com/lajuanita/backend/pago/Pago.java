package com.lajuanita.backend.pago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

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
    /**
     * Quién pagó, <b>cuando tiene cuenta</b>. Nullable desde `V19`.
     *
     * <p>La otra mitad es {@link #nombrePagadorExterno}, y el CHECK
     * {@code pago_pagador_identificado} exige uno de los dos. El caso que lo
     * motivó: una venta de equipo a alguien que compra por el acuerdo con
     * Pioneer y no se registra en un estudio de música por eso — antes de `V19`
     * <b>no se le podía cobrar nunca</b>, porque su plata no tenía dónde
     * colgarse.
     *
     * <p>⚠️ <b>Todo lo que lea este campo tiene que contemplar el null.</b> Cinco
     * consultas lo asumían presente y están listadas en `mejoras.md` §9.1.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    /** Quién pagó, cuando <b>no</b> tiene cuenta. Espeja `venta_equipo`. */
    @Column(name = "nombre_pagador_externo", length = 150)
    private String nombrePagadorExterno;

    /** Teléfono o mail del pagador sin cuenta. Identificar no es poder contactar. */
    @Column(name = "contacto_pagador_externo", length = 150)
    private String contactoPagadorExterno;

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

    // -- La edición ----------------------------------------------------------

    /**
     * Quién editó el pago por última vez. <b>Lo exige `V19` §2</b>
     * ({@code pago_edicion_con_autor}) cuando cambia algo que mueve plata.
     *
     * <p>Se escribe con {@link #firmarEdicion}, no con el setter: la fecha la pone
     * el trigger, y separar las dos cosas es cómo se cuela una edición sin autor.
     */
    @Column(name = "id_usuario_modifico")
    private Long idUsuarioModifico;

    /**
     * Cuándo. <b>La escribe el trigger, no la aplicación</b> — un sello que el
     * cliente elige se puede antedatar (DB-07), y hay un caso de la suite (171)
     * que prueba que una fecha mandada a mano no queda escrita.
     */
    @Column(name = "fecha_modificacion", insertable = false, updatable = false)
    @Generated(event = EventType.UPDATE)
    private OffsetDateTime fechaModificacion;

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

    // -- La edición, y las dos excepciones con sus tres firmas ---------------

    /**
     * Firma la edición. <b>Se llama siempre que se toque algo que mueve plata.</b>
     *
     * <p>Es un método y no un setter por el mismo motivo que {@link #anular}: `V19`
     * §2 rechaza el UPDATE si el autor viene en NULL, y un setter suelto se puede
     * olvidar sin que nada se queje hasta que la base contesta un 409. El autor
     * sale del token, nunca del cuerpo del pedido.
     *
     * <p><b>La fecha no se escribe acá</b>: la pone el trigger. Ver
     * {@link #fechaModificacion}.
     *
     * <p>⚠️ Hereda el límite conocido de `V7`, escrito en la cabecera de `V19`: el
     * trigger exige que la columna <i>no esté en null</i>, no que la edición de hoy
     * haya declarado su autor. Después de la primera edición firmada, una segunda
     * que no toque el campo pasa con el autor de la anterior. Por eso este método
     * se llama en cada edición aunque el valor no cambie.
     */
    public void firmarEdicion(Long idAutor) {
        this.idUsuarioModifico = idAutor;
    }

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
