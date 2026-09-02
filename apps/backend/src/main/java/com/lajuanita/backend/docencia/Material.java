package com.lajuanita.backend.docencia;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.reserva.Reserva;

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
 * Material de clase: un link a algo que el profesor quiere que el alumno tenga.
 *
 * <p><b>Hoy solo por link, y no es una limitación del módulo sino de la tabla —
 * que lo dice desde `V1`:</b> <i>"los archivos pesados no se guardan acá: se
 * guarda el link"</i>. {@code archivo_path} existe y queda esperando al
 * {@code StorageService} de §2.4, que todavía no existe en ninguna forma; el
 * CHECK {@code material_tiene_contenido} acepta cualquiera de los dos, así que el
 * módulo entra entero sin arrastrar la infraestructura de archivos. Cuando esa
 * pieza se construya —la va a necesitar el Módulo 6, que retiene el premaster
 * hasta que el pago esté registrado— este campo se llena y nada más cambia.
 *
 * <p><b>{@link #visibleAlumno} es la regla dura de §8</b>: el material se ve solo
 * si el profesor lo habilitó. Sirve para preparar algo con anticipación y
 * mostrarlo el día de la clase, que es exactamente cómo se usa un material de
 * cursada.
 *
 * <p>O es de un alumno, o es grupal — nunca las dos ni ninguna, y eso lo sostiene
 * un CHECK de `V1`.
 */
@Entity
@Table(name = "material")
@Getter
@Setter
@NoArgsConstructor
public class Material {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_material")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_profesor", nullable = false)
    private Profesor profesor;

    /**
     * De qué curso es este material — <b>dice el programa Y el alumno</b> (`V23`).
     *
     * <p>Una {@code inscripcion} es el contrato de un alumno (alumno +
     * disciplina + nivel), así que con esta sola columna el material tiene
     * destinatario y programa. Reemplaza al par {@code id_alumno} +
     * {@code es_grupal}, que definía el destinatario entre los dos y dejaba una
     * tercera posibilidad —"grupal"— que no filtraba por nada: el material iba a
     * TODOS los alumnos del estudio.
     */
    @ManyToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "id_inscripcion", nullable = false)
    private Inscripcion inscripcion;

    /**
     * De qué clase es, si es de una. {@code null} = del curso entero (`V23`,
     * §18 · P41: <i>"puede ser del curso entero"</i>).
     *
     * <p>⚠️ <b>No es libre</b>: `V23` §5 exige con un trigger que esa clase sea
     * una en la que el alumno de {@link #inscripcion} participó <i>con esa
     * inscripción</i>. Sin esa regla se podría colgar material de la inscripción
     * de Juan sobre una clase de Ana —las dos columnas serían válidas por
     * separado y la fila mentiría igual—, que es el mismo agujero que `V1` §8.2
     * cierra del otro lado.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_reserva")
    private Reserva reserva;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    /** Texto libre: "Sample pack", "Apunte", "Video". No hay catálogo todavía. */
    @Column(name = "tipo", length = 50)
    private String tipo;

    /** Espera al StorageService. Ver la cabecera. */
    @Column(name = "archivo_path", length = 500)
    private String archivoPath;

    @Column(name = "url_externa", length = 500)
    private String urlExterna;

    @Column(name = "visible_alumno", nullable = false)
    private boolean visibleAlumno = true;

    /** Lo pone el DEFAULT de la base; `@Generated` porque el alta lo devuelve. */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_subida", nullable = false, updatable = false)
    private OffsetDateTime fechaSubida;
}
