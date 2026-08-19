package com.lajuanita.backend.solicitud;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.sala.Sala;
import com.lajuanita.backend.sala.TipoUso;
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
 * Lo que el portal SÍ puede crear: un pedido de sala.
 *
 * <p><b>Por qué existe esta tabla y no un {@code POST /api/reservas}.</b> P17
 * dejó dicho que alquilar una cabina y grabar un set los elige el usuario. Pero
 * una reserva que ocupa su franja no existe sin plata en SENADO o PAGADO detrás
 * (`V10`–`V12`), y un {@code USUARIO} <b>no tiene cómo poner plata en el
 * sistema</b>: registrar un pago es {@code @PuedeOperar}, los cinco medios son de
 * carga manual y no hay pasarela en ningún lado del alcance. Un portal que
 * insertara reservas las vería rechazadas al COMMIT, todas las veces.
 *
 * <p>Entonces el usuario pide, y <b>la reserva nace cuando administración aprueba
 * y carga la seña</b>, en una sola transacción. Elige igual sala, fecha y
 * horario; lo único que no puede es saltear el cobro.
 *
 * <p>Casi ninguna de sus reglas está en esta clase, como en el resto del
 * proyecto: que solo se pidan los usos marcados en el catálogo, que la
 * combinación sala×uso exista, que una resolución diga quién y cuándo, que una
 * aprobación tenga su reserva y un rechazo su motivo, y que una vez resuelta no
 * se toque más — todo eso es de `V13`.
 *
 * <p>Lo que sí vive acá son las <b>tres firmas que van juntas</b>: ver
 * {@link #aprobar}. Es el mismo cuidado que {@code Inscripcion.firmarBajaDeNivel}
 * y por el mismo motivo — el CHECK rechaza la fila si falta cualquiera de las
 * tres, así que ninguna se escribe por su cuenta.
 */
@Entity
@Table(name = "solicitud_reserva")
@Getter
@Setter
@NoArgsConstructor
public class SolicitudReserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud_reserva")
    private Long id;

    /**
     * Quién pide. Es {@code usuario} y no {@code alumno} a propósito: quien
     * alquila una cabina puede no cursar nada.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_sala", nullable = false)
    private Sala sala;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_tipo_uso", nullable = false)
    private TipoUso tipoUso;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    /** Lo que el que pide quiera aclarar. Opcional. */
    @Column(name = "comentario", columnDefinition = "text")
    private String comentario;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoSolicitud estado = EstadoSolicitud.PENDIENTE;

    /** Quién la resolvió. En una cancelación es el que pidió. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_resuelve")
    private Usuario usuarioResuelve;

    /** Qué le contestaron. Obligatorio al rechazar (`V13`). */
    @Column(name = "respuesta", columnDefinition = "text")
    private String respuesta;

    /**
     * La reserva que nació de este pedido.
     *
     * <p>Es la trazabilidad completa del circuito: una franja tomada por el
     * portal se puede seguir hasta quién la pidió y quién la autorizó. `V13`
     * exige que exista si —y solo si— la solicitud está APROBADA.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_reserva")
    private Reserva reserva;

    @Column(name = "fecha_resolucion")
    private OffsetDateTime fechaResolucion;

    /**
     * Cuándo se pidió. Lo pone el DEFAULT de la base.
     *
     * <p>{@code @Generated} y no solo {@code insertable = false}: el alta
     * contesta con la fila recién creada y la pantalla muestra desde cuándo está
     * esperando. Es la quinta vez que aparece esta trampa en el proyecto — sin la
     * anotación, Hibernate nunca relee la columna y devuelve null.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    // == Las resoluciones ====================================================

    /**
     * Aprobar: la reserva ya existe y esta solicitud la apunta.
     *
     * <p><b>Las tres firmas se escriben juntas</b> —estado, quién resuelve y
     * cuándo— porque el CHECK {@code solicitud_reserva_resolucion_completa}
     * rechaza la fila si falta cualquiera, y porque una resolución sin autor es
     * exactamente la trazabilidad que el relevamiento marcó como faltante en el
     * sistema actual. Ninguna de las tres tiene setter propio en el flujo: se
     * pasa por acá.
     *
     * <p>La fecha sale del reloj y el autor del token, nunca del pedido.
     */
    public void aprobar(Reserva reservaCreada, Usuario quienResuelve, String respuesta) {
        this.estado = EstadoSolicitud.APROBADA;
        this.reserva = reservaCreada;
        this.usuarioResuelve = quienResuelve;
        this.respuesta = respuesta;
        this.fechaResolucion = OffsetDateTime.now();
    }

    /** Rechazar, diciendo por qué: sin motivo la base no la deja pasar. */
    public void rechazar(String motivo, Usuario quienResuelve) {
        this.estado = EstadoSolicitud.RECHAZADA;
        this.respuesta = motivo;
        this.usuarioResuelve = quienResuelve;
        this.fechaResolucion = OffsetDateTime.now();
    }

    /** El que pidió se arrepiente. Acá el que resuelve es él mismo. */
    public void cancelar(Usuario quienPidio) {
        this.estado = EstadoSolicitud.CANCELADA;
        this.usuarioResuelve = quienPidio;
        this.fechaResolucion = OffsetDateTime.now();
    }

    public boolean estaPendiente() {
        return estado == EstadoSolicitud.PENDIENTE;
    }
}
