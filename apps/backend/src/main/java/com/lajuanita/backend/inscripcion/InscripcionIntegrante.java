package com.lajuanita.backend.inscripcion;

import com.lajuanita.backend.alumno.Alumno;

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

/**
 * Quién cursa una inscripción: una fila por persona, de 1 a 3 (`V35`, P87).
 *
 * <p>Es la tabla que reemplazó a {@code inscripcion.id_alumno}. El alumno solo
 * es un grupo de 1; el grupo de 2 o 3 comparte la inscripción entera —precio,
 * seña, nivel, clases, estado— y lo único que sigue siendo de cada uno es la
 * asistencia y las notas del profesor, que cuelgan de la participación.
 *
 * <p><b>Sin setters, a propósito.</b> Los integrantes son fijos al nacer
 * (`V35` §4 c): la base rechaza el DELETE y el UPDATE, y un grupo que cambia
 * se cancela y se rehace (P89). La única forma de crear uno es
 * {@link Inscripcion#agregarIntegrante}, que mantiene los dos lados de la
 * relación.
 */
@Entity
@Table(name = "inscripcion_integrante")
@Getter
@NoArgsConstructor
public class InscripcionIntegrante {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_integrante")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_inscripcion", nullable = false)
    private Inscripcion inscripcion;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_alumno", nullable = false)
    private Alumno alumno;

    /**
     * Exactamente uno por inscripción (`V35` §2): a él le va el WhatsApp de la
     * seña y bajo su nombre está la deuda del grupo en Deudores (P88).
     */
    @Column(name = "referente", nullable = false)
    private boolean referente;

    InscripcionIntegrante(Inscripcion inscripcion, Alumno alumno, boolean referente) {
        this.inscripcion = inscripcion;
        this.alumno = alumno;
        this.referente = referente;
    }
}
