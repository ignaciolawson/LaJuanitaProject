package com.lajuanita.backend.pago;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.usuario.Usuario;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
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
 * El respaldo de que La Juanita pagó: un archivo adjunto a un egreso.
 *
 * <p><b>Es el espejo exacto de {@link ComprobantePago}</b>, y esa simetría es el
 * punto (`V25`). Si las dos se separan, "adjuntar un comprobante" significa una
 * cosa en Pagos y otra en Egresos.
 *
 * <p>⚠️ <b>Del lado del egreso la regla pesa más, aunque sea la misma.</b> Un
 * cobro sin comprobante lo reclama el que pagó; <b>una salida de plata sin
 * comprobante no la reclama nadie</b> — el que la cobró está contento y el que la
 * firmó es el mismo que la cargó. Este archivo es la única prueba de que ese
 * sueldo se pagó.
 *
 * <p>Lo que esta clase <b>no</b> hace, igual que su espejo: no elige el nombre con
 * el que se guarda ({@code archivoPath} es la clave opaca de
 * {@link com.lajuanita.backend.archivo.Almacenamiento}), no se borra nunca (`V25`
 * §2) y no cambia después de adjuntada ni deshace su invalidación (`V25` §3).
 */
@Entity
@Table(name = "comprobante_egreso")
@Getter
@Setter
@NoArgsConstructor
public class ComprobanteEgreso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_comprobante")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_egreso", nullable = false)
    private Egreso egreso;

    /** La clave de {@code Almacenamiento}. Opaca: no se interpreta ni se construye. */
    @Column(name = "archivo_path", nullable = false, length = 500)
    private String archivoPath;

    @Column(name = "nombre_original", nullable = false, length = 255)
    private String nombreOriginal;

    /**
     * Quién lo adjuntó. Sale del token, nunca del pedido.
     *
     * <p>{@code EAGER} por lo mismo que en {@link ComprobantePago}: estas filas se
     * cargan siempre por la colección de {@code Egreso}, y una to-one eager entra
     * como {@code JOIN} en esa consulta. En {@code LAZY} sería una consulta por
     * comprobante para pintar un nombre que la fila siempre muestra.
     */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_usuario_carga", nullable = false)
    private Usuario quienCargo;

    /**
     * Cuándo se adjuntó, puesta por la base.
     *
     * <p>Lleva {@link Generated} y no solo {@code insertable = false} porque el
     * alta devuelve la fila recién creada y la pantalla muestra la fecha. Sin la
     * anotación Hibernate no vuelve a leer la columna después del INSERT y el
     * objeto la trae en null — la trampa que ya cobró seis veces en este proyecto.
     */
    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    @Generated(event = EventType.INSERT)
    private OffsetDateTime fechaCreacion;

    // -- La reversa: no se borra, se marca -----------------------------------

    @Column(name = "invalido", nullable = false)
    private boolean invalido = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario_invalida")
    private Usuario quienInvalida;

    @Column(name = "fecha_invalidacion")
    private OffsetDateTime fechaInvalidacion;

    @Column(name = "motivo_invalidacion", columnDefinition = "text")
    private String motivoInvalidacion;

    /**
     * Marca el comprobante como inválido. <b>No lo borra.</b>
     *
     * <p>Las tres se escriben juntas o el CHECK rechaza el UPDATE, y por eso esto
     * es un método y no tres setters sueltos: mismo molde que {@code Pago.anular} y
     * que {@code Inscripcion.firmarBajaDeNivel}. El autor sale del token y la fecha
     * del reloj, nunca del cuerpo del pedido.
     */
    public void invalidar(Usuario autor, String motivo) {
        this.invalido = true;
        this.quienInvalida = autor;
        this.fechaInvalidacion = OffsetDateTime.now();
        this.motivoInvalidacion = motivo;
    }
}
