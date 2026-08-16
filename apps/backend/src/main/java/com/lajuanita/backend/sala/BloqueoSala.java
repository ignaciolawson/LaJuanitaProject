package com.lajuanita.backend.sala;

import java.time.LocalDate;
import java.time.LocalTime;
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
 * Una sala fuera de servicio: mantenimiento, un evento, la reforma de la cabina.
 *
 * <p><b>Una fila es una franja horaria que se repite todos los días del rango</b>,
 * no un intervalo continuo. "De 9 a 13 toda la semana que viene" es una fila, y
 * la sala queda libre de 13 en adelante todos esos días. Esa lectura no es una
 * preferencia: es la que justifica que la tabla tenga dos fechas <i>y</i> dos
 * horas en vez de dos timestamps, y `V7` tuvo que reescribir el EXCLUDE de `V6`
 * justamente porque lo leía del otro modo. Si esto se cambia, se cambia en los
 * dos triggers de `V1` y en el EXCLUDE de `V7` a la vez.
 *
 * <p>Tres cosas que esta clase <b>no</b> hace:
 *
 * <ul>
 *   <li><b>No valida que no se pise con otro bloqueo.</b> Lo hace
 *       {@code bloqueo_sin_solapamiento}, un EXCLUDE en dos dimensiones —rango de
 *       fechas y franja horaria— por la misma razón que el de {@code reserva}: es
 *       lo único que aguanta dos personas cargando a la vez.
 *   <li><b>No valida que la sala esté libre.</b> Lo hace el trigger
 *       {@code bloqueo_sin_reservas_activas}: primero se cancelan o se mueven las
 *       clases, después se bloquea. El camino inverso —reservar sobre un bloqueo—
 *       lo corta {@code reserva_respeta_bloqueos}.
 *   <li><b>No mapea {@code dias} ni {@code franja}.</b> Son columnas generadas
 *       que existen para el EXCLUDE. `V7` las escribió con un CASE que devuelve
 *       NULL en vez de explotar, justamente para que los dos CHECK de `V1` sigan
 *       siendo los que expliquen el error.
 * </ul>
 */
@Entity
@Table(name = "bloqueo_sala")
@Getter
@Setter
@NoArgsConstructor
public class BloqueoSala {

    /** Día entero, cuando el alta no dice horas. Son los DEFAULT de `V1`. */
    public static final LocalTime DESDE_QUE_ABRE = LocalTime.of(0, 0);
    public static final LocalTime HASTA_QUE_CIERRA = LocalTime.of(23, 59);

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_bloqueo")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_sala", nullable = false)
    private Sala sala;

    /**
     * Quién lo cargó.
     *
     * <p>Va como relación y no como un {@code Long} suelto —que es lo que hace
     * {@code Reserva} con sus dos columnas de auditoría— porque acá el dato
     * <b>se muestra</b>: el listado dice quién bloqueó la sala y cuándo. Un id
     * pelado obligaría a la pantalla a cruzar contra el listado de usuarios.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_registra")
    private Usuario registradoPor;

    @Column(name = "fecha_inicio", nullable = false)
    private LocalDate fechaInicio;

    /** El último día bloqueado, <b>inclusive</b>: los triggers usan {@code BETWEEN}. */
    @Column(name = "fecha_fin", nullable = false)
    private LocalDate fechaFin;

    @Column(name = "hora_inicio", nullable = false)
    private LocalTime horaInicio = DESDE_QUE_ABRE;

    /** Exclusiva: un bloqueo que termina a las 13:00 no ocupa las 13:00. */
    @Column(name = "hora_fin", nullable = false)
    private LocalTime horaFin = HASTA_QUE_CIERRA;

    @Column(name = "motivo", nullable = false, columnDefinition = "text")
    private String motivo;

    /**
     * Cuándo se cargó. Lo pone el DEFAULT de la base.
     *
     * <p><b>{@code @Generated} y no solo {@code insertable = false}</b>, que es
     * lo que hacen las otras cuatro entidades con su sello de carga. La
     * diferencia es que acá el dato <b>se devuelve</b>: sin la anotación,
     * Hibernate deja el campo en null después del INSERT —nunca lo relee— y el
     * alta contesta con la fila recién creada y la fecha vacía. Las otras cuatro
     * no lo exponen en ningún DTO y por eso nunca se notó.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_registro", nullable = false, updatable = false)
    private OffsetDateTime fechaRegistro;

    /** Si el bloqueo todavía tiene efecto sobre alguna fecha de hoy en adelante. */
    public boolean estaVigente(LocalDate hoy) {
        return !fechaFin.isBefore(hoy);
    }
}
