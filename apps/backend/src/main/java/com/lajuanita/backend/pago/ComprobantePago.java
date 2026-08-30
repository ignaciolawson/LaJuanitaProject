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
 * El respaldo de que alguien pagó: un archivo adjunto a un pago.
 *
 * <p><b>Es una tabla y no la columna que `V1` tenía</b>, y el motivo está entero
 * en la cabecera de `V21`. En dos líneas: un comprobante no se borra —se marca
 * inválido, con autor, fecha y motivo, desde `V7`—, y con una sola columna el
 * comprobante correcto no tiene dónde ir salvo pisando al anterior, o sea
 * borrando la firma que se exigió justamente para que quedara rastro.
 *
 * <p>Tres cosas que esta clase <b>no</b> hace:
 *
 * <ul>
 *   <li><b>No elige el nombre con el que se guarda.</b> {@code archivoPath} es la
 *       clave opaca que devolvió {@link com.lajuanita.backend.archivo.Almacenamiento},
 *       no el nombre que trajo el archivo. El original vive en
 *       {@link #nombreOriginal} y sirve para una sola cosa: que la descarga llegue
 *       llamándose como la persona espera.
 *   <li><b>No se borra nunca.</b> `V21` §2 lo prohíbe con la misma función que
 *       protege pagos, clases y fichas del buzón.
 *   <li><b>No cambia después de adjuntado</b>, ni deshace su invalidación: `V21` §3
 *       rechaza los dos UPDATE. Lo único que se puede hacer es marcarlo inválido
 *       una vez, con {@link #invalidar}, que escribe las tres columnas juntas
 *       porque el CHECK las exige juntas.
 * </ul>
 */
@Entity
@Table(name = "comprobante_pago")
@Getter
@Setter
@NoArgsConstructor
public class ComprobantePago {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_comprobante")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_pago", nullable = false)
    private Pago pago;

    /** La clave de {@code Almacenamiento}. Opaca: no se interpreta ni se construye. */
    @Column(name = "archivo_path", nullable = false, length = 500)
    private String archivoPath;

    @Column(name = "nombre_original", nullable = false, length = 255)
    private String nombreOriginal;

    /**
     * Quién lo adjuntó. Sale del token, nunca del pedido.
     *
     * <p><b>Es una relación y no un id suelto, al revés que las firmas de
     * {@code Pago}</b>, y la diferencia es qué hace la pantalla con cada una: el id
     * del que anuló un pago no se muestra —lo que se lee es el motivo—, y acá la
     * lista dice <i>"lo adjuntó Micaela el 30/08"</i>. Con el id suelto habría que
     * ir a buscar el nombre por fila, o guardar el id y la relación a la vez, que
     * es el mismo dato dos veces esperando a discrepar.
     *
     * <p>{@code EAGER} y no {@code LAZY}, que en este proyecto es la excepción:
     * estas filas se cargan siempre por la colección de {@code Pago}, y una to-one
     * eager entra como {@code JOIN} en esa misma consulta. En {@code LAZY} sería
     * una consulta por comprobante para pintar un nombre que la fila siempre
     * muestra.
     */
    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "id_usuario_carga", nullable = false)
    private Usuario quienCargo;

    /**
     * Cuándo se adjuntó, puesta por la base.
     *
     * <p>Lleva {@link Generated} y no solo {@code insertable = false} porque
     * <b>el alta devuelve la fila recién creada y la pantalla muestra la fecha</b>.
     * Sin la anotación, Hibernate no vuelve a leer la columna después del INSERT y
     * el objeto que se devuelve la trae en null — la trampa que ya cobró cinco
     * veces en este proyecto ({@code BloqueoSala}, {@code VentaEquipo},
     * {@code SolicitudReserva}, {@code Notificacion}).
     */
    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    @Generated(event = EventType.INSERT)
    private OffsetDateTime fechaCreacion;

    // -- La reversa: no se borra, se marca -----------------------------------

    @Column(name = "invalido", nullable = false)
    private boolean invalido = false;

    /** Quién lo marcó. Por lo mismo que {@link #quienCargo}: la pantalla lo nombra. */
    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "id_usuario_invalida")
    private Usuario quienInvalida;

    @Column(name = "fecha_invalidacion")
    private OffsetDateTime fechaInvalidacion;

    @Column(name = "motivo_invalidacion", columnDefinition = "text")
    private String motivoInvalidacion;

    /**
     * Marca el comprobante como inválido. <b>No lo borra</b> — es una regla dura
     * del alcance (§6).
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
