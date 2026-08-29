package com.lajuanita.backend.solicitante;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

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
 * Una ficha del buzón: alguien completó un formulario de la landing.
 *
 * <p><b>Es la única tabla del sistema que escribe gente sin cuenta.</b> Todo lo
 * demás cuelga de un {@code usuario} —que es la raíz de identidad de este
 * esquema—, y acá justamente no puede: la persona todavía no existe para el
 * sistema, y el trámite de esta ficha es hacerla existir.
 *
 * <p><b>Por qué es una tabla y no una notificación</b> (§9.4): una notificación
 * se lee y se va; esto tiene ciclo de vida —pendiente, convertido, descartado— y
 * lo que garantiza es que quede <b>la lista de a quién no se contestó</b>. Ese
 * era el agujero.
 *
 * <p>Casi ninguna de sus reglas está en esta clase, como en el resto del
 * proyecto: que una resolución diga quién y cuándo, que una conversión tenga su
 * cuenta y un descarte su motivo, que una ficha resuelta no se toque nunca más y
 * que no se borre — todo eso es `V20`.
 *
 * <p>Lo que sí vive acá son las <b>firmas que van juntas</b>: ver
 * {@link #convertir}. Mismo cuidado que {@code SolicitudReserva.aprobar} y por el
 * mismo motivo — el CHECK rechaza la fila si falta cualquiera de las tres, así que
 * ninguna se escribe por su cuenta.
 */
@Entity
@Table(name = "solicitante")
@Getter
@Setter
@NoArgsConstructor
public class Solicitante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitante")
    private Long id;

    /**
     * Nombre y apellido separados desde el formulario, no un campo único partido
     * después. Es la lección de `V4` aplicada a tiempo: allá hubo que adivinar
     * dónde terminaba el nombre.
     */
    @Column(name = "nombre", nullable = false, length = 80)
    private String nombre;

    @Column(name = "apellido", nullable = false, length = 80)
    private String apellido;

    @Column(name = "email", nullable = false, length = 150)
    private String email;

    /**
     * Obligatorio, a diferencia del registro público.
     *
     * <p>El motivo es el canal: la contraseña temporal se pasa por WhatsApp, así
     * que una ficha sin teléfono no se puede convertir.
     */
    @Column(name = "telefono", nullable = false, length = 40)
    private String telefono;

    @Enumerated(EnumType.STRING)
    @Column(name = "interes", nullable = false, length = 30)
    private InteresDelSolicitante interes;

    /** El resto del formulario, armado en texto por quien lo manda. */
    @Column(name = "detalle", columnDefinition = "text")
    private String detalle;

    /** Lo que la persona escribió con sus palabras. */
    @Column(name = "mensaje", columnDefinition = "text")
    private String mensaje;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoSolicitante estado = EstadoSolicitante.PENDIENTE;

    /** Quién la atendió. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_resuelve")
    private Usuario usuarioResuelve;

    /**
     * La cuenta en la que terminó la ficha.
     *
     * <p>Una sola columna para los dos caminos de la conversión —cuenta nueva, o
     * la que la persona ya tenía—, porque para el buzón son el mismo hecho: ya
     * hay a quién cargarle el curso. `V20` exige que exista si —y solo si— la
     * ficha está CONVERTIDA.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    /** Obligatorio al descartar (`V20`). */
    @Column(name = "respuesta", columnDefinition = "text")
    private String respuesta;

    @Column(name = "fecha_resolucion")
    private OffsetDateTime fechaResolucion;

    /**
     * Cuándo llegó. Lo pone el DEFAULT de la base.
     *
     * <p>{@code @Generated} y no solo {@code insertable = false}: el alta contesta
     * con la fila creada y el buzón muestra desde cuándo espera. Sin la anotación
     * Hibernate nunca relee la columna y devuelve null — la sexta vez que aparece
     * esta trampa en el proyecto.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    // == Las resoluciones ====================================================

    /**
     * La persona ya está adentro del sistema.
     *
     * <p><b>Las tres firmas se escriben juntas</b> —estado, cuenta y quién/cuándo—
     * porque los CHECK {@code solicitante_resolucion_completa} y
     * {@code solicitante_convertido_tiene_cuenta} rechazan la fila si falta
     * cualquiera. Ninguna se escribe por su cuenta en el flujo: se pasa por acá.
     *
     * <p>La fecha sale del reloj y el autor del token, nunca del pedido.
     *
     * <p><b>No pide una nota</b>, al revés que el descarte. `V20` no la exige y
     * pedir una frase que después se descarta es peor que no pedirla — el mismo
     * criterio con el que cancelar un release pide confirmación y no motivo.
     */
    public void convertir(Usuario cuenta, Usuario quienResuelve) {
        this.estado = EstadoSolicitante.CONVERTIDO;
        this.usuario = cuenta;
        this.usuarioResuelve = quienResuelve;
        this.fechaResolucion = OffsetDateTime.now();
    }

    /** Descartar, diciendo por qué: sin motivo la base no la deja pasar. */
    public void descartar(String motivo, Usuario quienResuelve) {
        this.estado = EstadoSolicitante.DESCARTADO;
        this.respuesta = motivo;
        this.usuarioResuelve = quienResuelve;
        this.fechaResolucion = OffsetDateTime.now();
    }

    public boolean estaPendiente() {
        return estado == EstadoSolicitante.PENDIENTE;
    }
}
