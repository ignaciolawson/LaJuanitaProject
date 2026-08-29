package com.lajuanita.backend.solicitud;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

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
 * "No puedo ese día": el pedido de mover una clase que todavía no pasó.
 *
 * <p><b>La tabla existe desde `V1` y hasta tenía su trigger; lo que no existía
 * era nadie que escribiera en ella.</b> `V13` le puso el candado de "una
 * solicitud resuelta es final" al pasar, sin tener todavía un escritor. Este es
 * ese escritor, y llega dos etapas después.
 *
 * <p><b>Es otro ciclo de vida que {@code SolicitudReserva}, y por eso son dos
 * tablas.</b> `V13` lo dejó escrito al descartar generalizarlas: una pide
 * <i>mover</i> algo que ya existe y termina en un cambio de horario; la otra pide
 * <i>crear</i> algo que no existe y termina pariendo una fila con su plata.
 * Comparten la palabra "solicitud" y nada más.
 *
 * <p><b>Lo que esta tabla pide es una FECHA suelta, y eso decide el circuito
 * entero.</b> {@code fecha_alternativa_solicitada} es un {@code DATE} y además
 * es opcional: no hay hora, no hay sala. O sea que <b>acá no se puede aprobar
 * "tal como se pidió"</b>, que es la regla del otro circuito — y está bien que no
 * se pueda: quien pide mover una clase no sabe qué sala queda libre ni de qué
 * profesor depende. Elige el día que le viene bien, o ni eso; el horario lo pone
 * administración al aprobar.
 */
@Entity
@Table(name = "solicitud_reprogramacion")
@Getter
@Setter
@NoArgsConstructor
public class SolicitudReprogramacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_solicitud")
    private Long id;

    /**
     * Quién pide.
     *
     * <p>Puede ser el alumno o <b>el profesor de esa clase</b> (P9, contestada el
     * 2026-08-29). Es la misma columna para los dos: lo que cambia es desde qué
     * pantalla se entra, no qué se escribe.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_reserva", nullable = false)
    private Reserva reserva;

    /** Por qué no puede. Obligatorio desde `V1`: sin esto no hay nada que evaluar. */
    @Column(name = "motivo", nullable = false, columnDefinition = "text")
    private String motivo;

    /**
     * El día que le vendría bien. <b>Opcional</b>, y es una preferencia, no una
     * reserva: sin hora ni sala no alcanza para crear nada.
     */
    @Column(name = "fecha_alternativa_solicitada")
    private LocalDate fechaAlternativaSolicitada;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoReprogramacion estado = EstadoReprogramacion.PENDIENTE;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_resuelve")
    private Usuario usuarioResuelve;

    /** Qué le contestaron. Al rechazar viaja adentro de la notificación. */
    @Column(name = "respuesta", columnDefinition = "text")
    private String respuesta;

    /**
     * Cuándo se pidió.
     *
     * <p>Se llama {@code fecha_solicitud} y no {@code fecha_creacion} porque la
     * tabla es de `V1`: es uno de los seis nombres distintos que DB-08 dejó
     * anotados. No se renombra desde acá — hacerlo pide una migración, y esta
     * tanda no toca el esquema.
     *
     * <p>{@code @Generated} y no solo {@code insertable = false}: el alta contesta
     * con la fila creada y la pantalla muestra desde cuándo espera.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_solicitud", nullable = false, updatable = false)
    private OffsetDateTime fechaSolicitud;

    @Column(name = "fecha_resolucion")
    private OffsetDateTime fechaResolucion;

    // == Las resoluciones ====================================================

    /**
     * Aprobar: la clase ya se movió.
     *
     * <p><b>Las tres firmas se escriben juntas</b> —estado, quién resuelve y
     * cuándo— porque el CHECK {@code solicitud_resolucion_completa} rechaza la
     * fila si falta cualquiera. La fecha sale del reloj y el autor del token.
     */
    public void aprobar(Usuario quienResuelve, String respuesta) {
        this.estado = EstadoReprogramacion.APROBADA;
        this.usuarioResuelve = quienResuelve;
        this.respuesta = respuesta;
        this.fechaResolucion = OffsetDateTime.now();
    }

    /** Rechazar, diciendo por qué. */
    public void rechazar(String motivo, Usuario quienResuelve) {
        this.estado = EstadoReprogramacion.RECHAZADA;
        this.respuesta = motivo;
        this.usuarioResuelve = quienResuelve;
        this.fechaResolucion = OffsetDateTime.now();
    }

    public boolean estaPendiente() {
        return estado == EstadoReprogramacion.PENDIENTE;
    }
}
