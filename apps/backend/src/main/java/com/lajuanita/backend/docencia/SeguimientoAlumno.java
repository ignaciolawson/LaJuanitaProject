package com.lajuanita.backend.docencia;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

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
 * El semáforo de un alumno, según un profesor.
 *
 * <p><b>Uno por par profesor-alumno</b>, y lo garantiza un UNIQUE de `V1`. Que
 * sea por par y no por alumno es la decisión de fondo: un alumno que cursa DJ con
 * uno y producción con otro puede venir bien en una cosa y trabado en la otra, y
 * un único estado obligaría a que un profesor pise la lectura del otro.
 *
 * <p><b>{@code fechaActualizacion} no la escribe esta clase</b>, la mantiene un
 * trigger (`V14` §2). El alcance pide los estados *"con fecha de cambio"*, y como
 * ningún CHECK reclama ese sello, un UPDATE que se olvide de ponerlo no falla:
 * pasa, y la fila queda diciendo cuándo se creó el seguimiento en vez de cuándo
 * se movió. El único que no se puede olvidar es el trigger.
 */
@Entity
@Table(name = "seguimiento_alumno")
@Getter
@Setter
@NoArgsConstructor
public class SeguimientoAlumno {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_seguimiento")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_profesor", nullable = false)
    private Profesor profesor;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_alumno", nullable = false)
    private Alumno alumno;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 30)
    private EstadoSeguimiento estado = EstadoSeguimiento.VA_BIEN;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;

    /**
     * La escribe el DEFAULT al crear y el trigger al cambiar. Nunca la aplicación
     * — si algún día aparece un setter para esto, la fecha deja de ser confiable
     * y el semáforo pierde la mitad de su valor.
     *
     * <p><b>{@code @Generated} con los DOS eventos</b>, y es la primera vez en el
     * proyecto que hace falta el de UPDATE: Hibernate no relee una columna después
     * de escribir, así que sin esto la pantalla mostraría la fecha vieja
     * inmediatamente después de cambiar el estado — justo el momento en que
     * alguien la mira. Es la misma trampa de `BloqueoSala.fechaRegistro`, con la
     * vuelta de que acá quien escribe el valor es un trigger y no un DEFAULT.
     */
    @Generated(event = { EventType.INSERT, EventType.UPDATE })
    @Column(name = "fecha_actualizacion", nullable = false, insertable = false, updatable = false)
    private OffsetDateTime fechaActualizacion;
}
