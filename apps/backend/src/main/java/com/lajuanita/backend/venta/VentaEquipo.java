package com.lajuanita.backend.venta;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

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
 * Una venta de equipamiento (§6, pantalla 6).
 *
 * <p><b>El estudio no tiene stock propio</b>: hay un acuerdo con Pioneer
 * (AlphaTheta) y se vende contra el stock de ellos (§1). Por eso esto no es un
 * inventario —no hay unidades que descontar, ni artículos que dar de alta antes
 * de venderlos— sino el registro de una operación que ya pasó: qué equipo, a
 * quién, a cuánto y quién la hizo. Es la línea más chica del negocio y el proceso
 * es ad hoc.
 *
 * <p><b>El comprador puede no tener cuenta</b>, y esa es la razón por la que hay
 * tres columnas para él. Muchos alumnos compran después del curso inicial y esos
 * sí son un {@code usuario}; el resto llega por el acuerdo con Pioneer y no se
 * registra en el sistema por comprar un CDJ. La base exige uno de los dos caminos
 * con {@code venta_comprador_identificado}. Es el mismo criterio que
 * {@code trabajo_mastering} usa con sus clientes externos, y la contracara de la
 * decisión de {@code usuario} como raíz: tener cuenta y ser cliente son cosas
 * distintas.
 *
 * <p><b>El vendedor sí es siempre un {@code usuario}</b> y la columna es NOT NULL:
 * de una venta del estudio siempre hay alguien del estudio responsable.
 *
 * <p><b>Desde `V9` se anula, y por eso desde `V9` no se borra.</b> Las cuatro
 * columnas de anulación existen y esta entidad <b>no las mapea</b>, por lo mismo
 * que {@code Egreso} tampoco: la anulación llega cuando exista la pantalla que la
 * pida. Lo que `V9` compró con esas columnas fue poder prohibir el DELETE, que es
 * la parte que sí está activa.
 */
@Entity
@Table(name = "venta_equipo")
@Getter
@Setter
@NoArgsConstructor
public class VentaEquipo {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_venta")
    private Long id;

    /** El comprador, cuando tiene cuenta. Si no, van los dos campos de abajo. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_comprador")
    private Usuario comprador;

    @Column(name = "nombre_comprador_externo", length = 150)
    private String nombreCompradorExterno;

    @Column(name = "contacto_comprador_externo", length = 150)
    private String contactoCompradorExterno;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario_vendedor", nullable = false)
    private Usuario vendedor;

    @Column(name = "categoria", length = 50)
    private String categoria;

    @Column(name = "marca", length = 100)
    private String marca;

    /** Lo único obligatorio del equipo: sin modelo la fila no dice qué se vendió. */
    @Column(name = "modelo_equipo", nullable = false, length = 150)
    private String modeloEquipo;

    @Column(name = "precio", nullable = false, precision = 14, scale = 2)
    private BigDecimal precio;

    @Enumerated(EnumType.STRING)
    @Column(name = "moneda", nullable = false, length = 3)
    private Moneda moneda = Moneda.ARS;

    @Column(name = "cotizacion_dolar", precision = 14, scale = 4)
    private BigDecimal cotizacionDolar;

    /** La fecha del HECHO, editable: una venta se puede cargar días después. */
    @Column(name = "fecha_venta", nullable = false)
    private LocalDate fechaVenta = LocalDate.now();

    @Column(name = "notas", columnDefinition = "text")
    private String notas;

    /**
     * La fecha de la CARGA, que no es la misma que {@link #fechaVenta}. La agregó
     * `V7`: esta era la única de las cinco tablas de dinero sin sello de carga, así
     * que una venta cargada hoy con fecha del mes pasado no dejaba nada que la
     * contradijera.
     *
     * <p>{@code @Generated} y no solo {@code insertable = false} porque el alta
     * devuelve la fila recién creada y la pantalla muestra este dato: sin la
     * anotación Hibernate no relee la columna y vuelve en null.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private OffsetDateTime fechaRegistro;
}
