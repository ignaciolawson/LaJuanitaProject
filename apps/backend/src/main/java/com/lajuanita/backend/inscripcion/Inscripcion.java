package com.lajuanita.backend.inscripcion;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.profesor.Profesor;

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
 * "Juan compró el curso de DJ inicial: 8 clases, $X, con Tomás."
 *
 * <p>Era el hueco más grande del modelo original ({@code platform.md} §3.1): sin
 * esta fila no hay forma de saber cuántas clases le quedan a alguien, que es
 * justo lo que el relevamiento marca como faltante hoy.
 *
 * <p>Tres cosas que conviene tener presentes al tocar esta clase:
 *
 * <ul>
 *   <li><b>Las clases restantes no se guardan, se calculan.</b> No hay campo acá
 *       para eso: contar participaciones es la única cuenta que no se puede
 *       desincronizar. Ver {@code InscripcionRepository#contarClasesConsumidas}.
 *   <li><b>El profesor vive acá y no en el alumno</b> (P6). Es lo que permite
 *       que la misma persona tenga un profe para DJ y otro para mentoría, y lo
 *       que habilita el "cada profesor ve solo sus alumnos".
 *   <li><b>La firma de baja de nivel no es opcional.</b> Los tres campos del
 *       final los exige {@code V9}, y el que los escribe es el servicio: la base
 *       los verifica, no los completa.
 * </ul>
 */
@Entity
@Table(name = "inscripcion")
@Getter
@Setter
@NoArgsConstructor
public class Inscripcion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_inscripcion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_alumno", nullable = false)
    private Alumno alumno;

    /**
     * Profesor a cargo. Asignación explícita y opcional: que otro cubra una
     * clase suelta no le transfiere el alumno, y una inscripción puede quedar
     * sin profe asignado hasta que se decida quién la toma.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_profesor")
    private Profesor profesor;

    @Enumerated(EnumType.STRING)
    @Column(name = "disciplina", nullable = false, length = 20)
    private Disciplina disciplina;

    @Enumerated(EnumType.STRING)
    @Column(name = "nivel", length = 20)
    private Nivel nivel;

    @Column(name = "clases_contratadas", nullable = false)
    private short clasesContratadas;

    @Column(name = "precio_total", nullable = false, precision = 14, scale = 2)
    private BigDecimal precioTotal;

    @Enumerated(EnumType.STRING)
    @Column(name = "moneda", nullable = false, length = 3)
    private Moneda moneda = Moneda.ARS;

    /** Obligatoria si {@link #moneda} es {@code USD}. Lo impone la base. */
    @Column(name = "cotizacion_dolar", precision = 14, scale = 4)
    private BigDecimal cotizacionDolar;

    /**
     * Cuándo arranca el curso. Puede ir vacía: se anota primero y se acuerda el
     * día después. <b>No hay fecha de fin</b>, y es a propósito — el curso
     * termina cuando se dictaron las clases contratadas, no en una fecha.
     */
    @Column(name = "fecha_inicio")
    private LocalDate fechaInicio;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoInscripcion estado = EstadoInscripcion.ACTIVA;

    @Column(name = "notas", columnDefinition = "text")
    private String notas;

    /** La escribe el DEFAULT de la base, no la aplicación. */
    @Column(name = "fecha_creacion", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    // -- La firma que V9 exige para bajar de nivel ----------------------------

    /**
     * Los tres campos son una sola cosa: <i>quién decidió bajar el nivel, cuándo
     * y por qué</i>. {@code V9} rechaza el UPDATE si falta alguno, y también si
     * la fecha es la de una baja anterior — o la segunda baja viajaría gratis con
     * la firma de la primera. Por eso se escriben juntos, en
     * {@link #firmarBajaDeNivel(Long, String)}, y no por setters sueltos.
     */
    @Column(name = "id_usuario_baja_nivel")
    private Long idUsuarioBajaNivel;

    @Column(name = "fecha_baja_nivel")
    private OffsetDateTime fechaBajaNivel;

    @Column(name = "motivo_baja_nivel", columnDefinition = "text")
    private String motivoBajaNivel;

    /**
     * Deja la firma que la base va a pedir en el UPDATE que baja el nivel.
     *
     * <p>La fecha es siempre {@code now()} y no un valor que venga de afuera:
     * es la condición que {@code V9} verifica para que una firma no se reuse.
     */
    public void firmarBajaDeNivel(Long idAutor, String motivo) {
        this.idUsuarioBajaNivel = idAutor;
        this.fechaBajaNivel = OffsetDateTime.now();
        this.motivoBajaNivel = motivo;
    }
}
