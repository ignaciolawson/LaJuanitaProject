package com.lajuanita.backend.docencia;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.alumno.Alumno;
import com.lajuanita.backend.profesor.Profesor;
import com.lajuanita.backend.reserva.ReservaParticipante;

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
 * Lo que un profesor anota sobre un alumno, para sí mismo.
 *
 * <p><b>Es privada, y esa es su razón de existir.</b> No la ve el alumno ni otro
 * profesor; administración sí (§8). Es el reemplazo del Excel paralelo que Ghezz
 * lleva hoy porque el Notion no le alcanza — y un Excel paralelo existe
 * justamente porque nadie quiere escribir "le cuesta la mezcla" en un campo que
 * el alumno puede abrir.
 *
 * <p><b>La privacidad la sostiene el service, no la base</b>, y está decidido así
 * en la cabecera de `V14`: "mi alumno" tiene dos caminos y escribir ese JOIN
 * doble una segunda vez en SQL costaría más de lo que compra para una regla de
 * lectura. Lo que la base sí verifica es lo local: que
 * {@link #participacion}, si viene, sea una clase <b>de ese alumno</b> —sin eso
 * la nota queda colgada de la sesión equivocada.
 *
 * <p>{@link #participacion} es opcional. Con ella la nota es "lo de la clase del
 * martes"; sin ella es una observación general, que también es un gesto real.
 */
@Entity
@Table(name = "nota_profesor")
@Getter
@Setter
@NoArgsConstructor
public class NotaProfesor {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_nota")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_profesor", nullable = false)
    private Profesor profesor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_alumno", nullable = false)
    private Alumno alumno;

    /** La sesión sobre la que es la nota. Opcional: ver la cabecera. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_participacion")
    private ReservaParticipante participacion;

    @Column(name = "contenido", nullable = false, columnDefinition = "text")
    private String contenido;

    /** Lo pone el DEFAULT de la base; `@Generated` porque el alta la devuelve. */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    @Column(name = "fecha_modificacion")
    private OffsetDateTime fechaModificacion;

    /**
     * Corregir lo escrito.
     *
     * <p>El texto y la fecha se mueven juntos, por lo mismo que las tres firmas
     * de una anulación: una nota editada que dice que es de hace un mes hace
     * dudar de todo el seguimiento. Acá la base no lo exige —no hay CHECK que lo
     * reclame— así que el único que puede olvidarse es quien escriba un setter
     * suelto. Por eso el cambio pasa por acá.
     */
    public void corregir(String texto) {
        this.contenido = texto;
        this.fechaModificacion = OffsetDateTime.now();
    }
}
