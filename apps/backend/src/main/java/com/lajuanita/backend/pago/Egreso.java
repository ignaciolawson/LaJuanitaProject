package com.lajuanita.backend.pago;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.dinero.Moneda;
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
 * Plata que sale: sueldos de profesores, alquiler, equipamiento.
 *
 * <p>Vive en el paquete {@code pago} y no en uno propio porque es la otra mitad
 * de la misma pregunta — la caja de §6 no se puede contestar con los ingresos
 * solos—, y porque una tabla que solo se carga y se lista no justifica su propio
 * módulo.
 *
 * <p><b>Desde `V9` se anula, y por eso desde `V9` no se borra.</b> `V6` lo había
 * dejado fuera de la prohibición de borrado con una condición escrita: *"no tiene
 * forma de anularse, así que prohibirle el DELETE dejaría un error de carga
 * grabado para siempre"*. `V9` le dio el estado de anulación y con eso se cumplió
 * la condición.
 *
 * <p>{@code destinatario} es texto libre a propósito: la mayoría de los egresos
 * son a proveedores que nunca van a tener cuenta. {@code usuarioDestino} se llena
 * solo cuando el egreso es el pago a un profesor, que es el caso que sí hay que
 * poder cruzar.
 */
@Entity
@Table(name = "egreso")
@Getter
@Setter
@NoArgsConstructor
public class Egreso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_egreso")
    private Long id;

    @Column(name = "id_usuario_registra")
    private Long idUsuarioRegistra;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_destino")
    private Usuario usuarioDestino;

    @Column(name = "monto", nullable = false, precision = 14, scale = 2)
    private BigDecimal monto;

    @Enumerated(EnumType.STRING)
    @Column(name = "moneda", nullable = false, length = 3)
    private Moneda moneda = Moneda.ARS;

    @Column(name = "cotizacion_dolar", precision = 14, scale = 4)
    private BigDecimal cotizacionDolar;

    @Column(name = "concepto", nullable = false, length = 200)
    private String concepto;

    /** Texto libre: casi siempre un proveedor sin cuenta en el sistema. */
    @Column(name = "destinatario", length = 150)
    private String destinatario;

    @Column(name = "comprobante_path", length = 500)
    private String comprobantePath;

    @Column(name = "fecha_egreso", nullable = false)
    private LocalDate fechaEgreso = LocalDate.now();

    @Column(name = "fecha_registro", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaRegistro;
}
