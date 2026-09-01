package com.lajuanita.backend.sala;

import com.lajuanita.backend.inscripcion.Disciplina;

import jakarta.persistence.Column;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/**
 * Para qué se usa una sala: clase de DJ, producción, mentoría, mix & mastering,
 * alquiler de cabina o grabación de set. Los carga `V2`.
 *
 * <p>{@link #esClase} distingue las que son formación de las que son servicio.
 * <b>No impone que haya profesor asignado</b> — se puede cargar una clase en el
 * calendario antes de saber quién la toma, y esa decisión se confirmó el
 * 2026-08-16 (P37).
 */
@Entity
@Table(name = "tipo_uso")
@Getter
@Setter
@NoArgsConstructor
public class TipoUso {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_tipo_uso")
    private Long id;

    @Column(name = "codigo", nullable = false, length = 40)
    private String codigo;

    @Column(name = "nombre", nullable = false, length = 100)
    private String nombre;

    @Column(name = "es_clase", nullable = false)
    private boolean esClase;

    /**
     * De qué curso descuenta una clase de este tipo. {@code null} = no descuenta
     * (`V22`, `mejoras.md` §12 · C1).
     *
     * <p><b>Es el dato del que sale la inscripción al anotar a alguien</b>, y por
     * eso existe: la correspondencia tipo de uso → disciplina no vivía en ninguna
     * capa —estaba implícita en los nombres y en la cabeza de quien carga—, así
     * que el formulario ofrecía todas las inscripciones vigentes del alumno y se
     * podía reservar una sala para producción descontando una clase de DJ.
     *
     * <p><b>Es catálogo y no un {@code Map} en Java</b>, por el precedente que
     * escribió `V1` para la matriz sala×uso: la regla se cambia desde la base, sin
     * migración ni deploy. Un {@code Map} sería una segunda definición.
     *
     * <p>El null no es un dato faltante: `V22` lo ata con un CHECK a
     * {@link #esClase} en los dos sentidos, así que <b>no puede haber una clase
     * sin disciplina</b> —serían clases que no le bajan de ningún curso a nadie—
     * ni un uso que no es clase con una.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "disciplina", length = 20)
    private Disciplina disciplina;

    /** Color con el que se pinta en el calendario. */
    @Column(name = "color", length = 20)
    private String color;

    @Column(name = "activo", nullable = false)
    private boolean activo = true;

    /**
     * Si el portal puede pedir este uso sin que administración se lo arme (P17,
     * `V13`).
     *
     * <p><b>Es dato de catálogo y no una lista escrita en el código</b>, por lo
     * mismo que la matriz sala×uso: la alternativa era
     * {@code codigo IN ("ALQUILER_CABINA","GRABACION_SET")} en un trigger y otra
     * vez acá, dos copias de una regla que el negocio va a mover cuando Mix &
     * Mastering se pida desde el portal (Módulo 6).
     *
     * <p>No es el negado de {@link #esClase}: M&M tampoco es una clase y tampoco
     * se pide por acá. La línea que marca P17 es <i>si hay un profesor del otro
     * lado</i>, y M&M queda afuera por otra razón — tiene su propio circuito y es
     * el único servicio que puede quedar en debe.
     */
    @Column(name = "solicitable_por_usuario", nullable = false)
    private boolean solicitablePorUsuario = false;
}
