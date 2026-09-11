package com.lajuanita.backend.programa;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Lo que se vende como curso: una fila por disciplina, con su precio de hoy
 * (`V28`, P63 — cierra P13).
 *
 * <p><b>La inscripción no apunta acá.</b> Copia el precio al inscribir y guarda
 * el suyo: el catálogo dice cuánto sale hoy, la inscripción dice cuánto se
 * acordó ese día, y si el catálogo sube en marzo la de febrero no cambia. La
 * unión entre las dos es {@link #disciplina}, con el mismo CHECK en las dos
 * tablas.
 *
 * <p><b>{@link #precio} en {@code null} significa "todavía no hay precio"</b>
 * — la mentoría nace así (P63: <i>"precio a confirmar"</i>). No es cero: cero en
 * este esquema es una beca.
 *
 * <p><b>Se desactiva, no se borra</b>: un trigger de `V28` §3 rechaza el DELETE,
 * porque el alta de inscripción lee de acá cuántas clases trae la disciplina.
 * Es el mismo criterio de {@code Sala.activa}.
 */
@Entity
@Table(name = "programa")
@Getter
@Setter
@NoArgsConstructor
public class Programa {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_programa")
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "disciplina", nullable = false, length = 20, updatable = false)
    private Disciplina disciplina;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "descripcion", columnDefinition = "text")
    private String descripcion;

    @Column(name = "precio", precision = 14, scale = 2)
    private BigDecimal precio;

    @Enumerated(EnumType.STRING)
    @Column(name = "moneda", nullable = false, length = 3)
    private Moneda moneda = Moneda.ARS;

    @Enumerated(EnumType.STRING)
    @Column(name = "cobro", nullable = false, length = 10)
    private Cobro cobro;

    /** Cuántas clases trae de fábrica. {@code null} = sin estándar (la mentoría). */
    @Column(name = "clases_estandar")
    private Short clasesEstandar;

    @Column(name = "duracion_minutos", nullable = false)
    private short duracionMinutos = 90;

    @Column(name = "activo", nullable = false)
    private boolean activo = true;

    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;
}
