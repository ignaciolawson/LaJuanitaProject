package com.lajuanita.backend.solicitante;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.venta.VentaEquipo;

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

    // == Qué produjo la ficha (`V27` §1, P56) ================================
    //
    // Las tres son la trazabilidad **y** el cierre automático a la vez: el estado
    // ATENDIDO no se puede escribir sin una de ellas y ninguna de ellas se puede
    // escribir sin el estado (`solicitante_atendido_produjo_algo`, en los dos
    // sentidos). Es la forma que `pago` tiene desde `V1` con sus cuatro destinos.
    //
    // No hay FK a `trabajo_mastering`: Mix & Mastering no entra al buzón — llega
    // por WhatsApp a Ghezz, decisión vigente del Módulo 6.

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_reserva")
    private Reserva reserva;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_inscripcion")
    private Inscripcion inscripcion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_venta_equipo")
    private VentaEquipo ventaEquipo;

    // == El horario que la persona prefiere (`V27` §3, P58) ==================
    //
    // Los tres son opcionales, y no por prolijidad: exigirlos en el formulario de
    // la web pierde a quien sólo quería preguntar cuánto sale. El que sabe lo que
    // quiere los llena y el alta se precarga; el que no, la ficha se lee como
    // siempre.
    //
    // ⚠️ Son una **preferencia**, no una reserva: la landing no ve disponibilidad.

    @Column(name = "fecha_preferida")
    private LocalDate fechaPreferida;

    @Column(name = "hora_preferida")
    private LocalTime horaPreferida;

    /** En minutos. La hora de fin la calcula el sistema: "2 horas" es lo que se piensa. */
    @Column(name = "duracion_minutos")
    private Integer duracionMinutos;

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
     * La persona ya tiene cuenta en el sistema.
     *
     * <p>⚠️ <b>Esto NO resuelve la ficha, y ése es el cambio de `V27`.</b> Antes
     * escribía {@code CONVERTIDO} y la ficha se iba de la lista — con la persona
     * todavía sin su reserva. La cuenta es <b>una comodidad para el cliente</b>
     * (P54: <i>"lo que son servicios no exige cuenta… es más para la comodidad del
     * cliente"</i>), así que se anota y la ficha sigue abierta hasta que exista lo
     * que pidieron.
     *
     * <p>Por eso tampoco firma: no hay resolución que firmar todavía, y
     * {@code solicitante_resolucion_completa} ata la firma al estado.
     */
    public void darleCuenta(Usuario cuenta) {
        this.usuario = cuenta;
    }

    /**
     * La ficha produjo lo que le pedían, y queda cerrada apuntando a eso.
     *
     * <p><b>Escribe el destino, el estado y la firma juntos</b>, por la misma razón
     * que {@code Release#publicarSinContrato}: el CHECK
     * {@code solicitante_atendido_produjo_algo} es una equivalencia en los dos
     * sentidos, así que un camino que escriba sólo el estado —o sólo la FK—
     * produce un 500 en vez de una excepción con sentido.
     *
     * <p>La fecha sale del reloj y el autor del token, nunca del pedido.
     *
     * <p><b>No pide una nota</b>, al revés que el descarte: lo que la ficha
     * produjo <i>es</i> la explicación, y está enlazado. Pedir una frase que
     * después nadie lee es peor que no pedirla.
     */
    public void atender(DestinoDeLaFicha destino, Usuario quienResuelve) {
        destino.anotarEn(this);
        this.estado = EstadoSolicitante.ATENDIDO;
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
