package com.lajuanita.backend.reserva;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.OffsetDateTime;

import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.sala.Sala;
import com.lajuanita.backend.sala.TipoUso;

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
 * Un bloque de tiempo en una sala: una clase, un alquiler, una sesión de
 * mastering o una grabación.
 *
 * <p><b>Quiénes participan no está acá</b>, está en {@link ReservaParticipante}:
 * una clase puede ser grupal y cada alumno viene de su propia inscripción (P30).
 *
 * <p>Cuatro cosas que esta clase <b>no</b> hace y conviene saber:
 *
 * <ul>
 *   <li><b>No valida el solapamiento.</b> Lo hace un EXCLUDE de Postgres, que es
 *       la única forma de que aguante dos personas reservando en el mismo
 *       instante — dos triggers leyendo en paralelo no se ven y dejan pasar los
 *       dos. Es la regla más importante del sistema.
 *   <li><b>No valida la sala contra el tipo de uso.</b> Lo hace una FK compuesta
 *       contra {@code sala_tipo_uso}: grabar un set en la Sala 1 es imposible.
 *   <li><b>No mapea {@code periodo}.</b> Es una columna generada
 *       ({@code tsrange}) que existe para el EXCLUDE. Se computa <b>antes</b> que
 *       los CHECK, así que unas horas invertidas explotan ahí con un error que no
 *       nombra ninguna constraint — por eso el orden de las horas se valida en el
 *       DTO y no acá (DB-11).
 *   <li><b>No se borra nunca.</b> `V7` lo prohíbe con un trigger: es historial de
 *       clases. La salida es {@link EstadoReserva#CANCELADA}.
 * </ul>
 */
@Entity
@Table(name = "reserva")
@Getter
@Setter
@NoArgsConstructor
public class Reserva {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_reserva")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_sala", nullable = false)
    private Sala sala;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_tipo_uso", nullable = false)
    private TipoUso tipoUso;

    /**
     * Opcional a propósito (P37, confirmado el 2026-08-16): una clase se puede
     * cargar en el calendario antes de saber qué profe la toma.
     *
     * <p>Un profesor en NULL además no choca nunca contra la EXCLUDE de `V9` que
     * impide que el mismo profe esté en dos salas a la vez — que es lo correcto,
     * porque un alquiler de cabina no ocupa la agenda de nadie.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_profesor")
    private Profesor profesor;

    @Column(name = "fecha", nullable = false)
    private LocalDate fecha;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio;

    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoReserva estado = EstadoReserva.CONFIRMADA;

    @Column(name = "notas", columnDefinition = "text")
    private String notas;

    /**
     * Ninguna clase se pierde (P2): cuando una se reprograma, la reserva nueva
     * apunta acá a la que reemplaza, y la vieja queda
     * {@link EstadoReserva#REPROGRAMADA}. Un índice único impide que dos digan
     * reemplazar a la misma.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_reserva_recupera")
    private Reserva reservaRecupera;

    @Column(name = "motivo_reprogramacion", columnDefinition = "text")
    private String motivoReprogramacion;

    @Column(name = "id_usuario_creo")
    private Long idUsuarioCreo;

    /**
     * Quién hizo el último cambio que le importa a alguien.
     *
     * <p><b>No es opcional cuando se edita:</b> `V7` rechaza el UPDATE que toque
     * estado, fecha, horas o sala si esto queda en NULL. Es la mitad de *"el
     * historial de clases no se elimina; se edita con auditoría"*, y el motivo es
     * que la disputa acá es cara a cara con un alumno que paga: *"yo esa clase la
     * di"*, *"a mí me marcaron ausente y fui"*.
     */
    @Column(name = "id_usuario_modifico")
    private Long idUsuarioModifico;

    /** La escribe el DEFAULT de la base. */
    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    /**
     * La escribe el <b>trigger</b> de `V7`, no la aplicación: un sello de
     * auditoría que el cliente puede elegir se puede antedatar.
     */
    @Column(name = "fecha_modificacion", insertable = false, updatable = false)
    private OffsetDateTime fechaModificacion;
}
