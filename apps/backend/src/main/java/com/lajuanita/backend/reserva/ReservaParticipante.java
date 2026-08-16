package com.lajuanita.backend.reserva;

import java.time.OffsetDateTime;

import com.lajuanita.backend.inscripcion.Inscripcion;
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
 * Quién asiste a una reserva, y si asistió. Reemplaza al {@code historial_clase}
 * del modelo original, porque una clase puede ser grupal y la asistencia es por
 * participante y no por reserva (P30).
 *
 * <p><b>{@link #inscripcion} es lo que descuenta la clase del curso
 * contratado</b>, y es opcional: va vacía cuando la reserva no corresponde a un
 * curso (un alquiler de cabina, por ejemplo). Cuando viene, la base exige que
 * esa inscripción sea <i>del que asiste</i> — sin eso se podía anotar a Juan
 * descontándole la clase a Ana, y el contador de las dos quedaba mal sin que
 * nadie se enterara.
 *
 * <p>La cuenta de "clases restantes" se calcula sobre estas filas. Por eso `V7`
 * prohíbe borrarlas y exige autor para cambiar la asistencia: si se pudieran
 * editar sin rastro, la respuesta a *"¿cuántas clases le quedan a Juan?"* dejaría
 * de ser verificable.
 */
@Entity
@Table(name = "reserva_participante")
@Getter
@Setter
@NoArgsConstructor
public class ReservaParticipante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_participacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_reserva", nullable = false)
    private Reserva reserva;

    /**
     * La persona, no el alumno. Quien alquila una cabina participa de su reserva
     * sin ser alumno de nada — es la decisión de {@code usuario} como raíz.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario", nullable = false)
    private Usuario usuario;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_inscripcion")
    private Inscripcion inscripcion;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado_asistencia", nullable = false, length = 20)
    private EstadoAsistencia estadoAsistencia = EstadoAsistencia.PENDIENTE;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;

    /** La escribe el DEFAULT de la base. */
    @Column(name = "fecha_registro", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaRegistro;

    /**
     * Obligatorio para cambiar {@link #estadoAsistencia}: lo exige `V7`.
     *
     * <p>Es el trigger que más importa de los dos, porque cambiar un PRESENTE por
     * un AUSENTE es lo que decide cuántas clases le quedan al alumno.
     */
    @Column(name = "id_usuario_modifico")
    private Long idUsuarioModifico;

    /** La escribe el trigger de `V7`. */
    @Column(name = "fecha_modificacion", insertable = false, updatable = false)
    private OffsetDateTime fechaModificacion;
}
