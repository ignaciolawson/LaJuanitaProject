package com.lajuanita.backend.sala;

import jakarta.persistence.Column;
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
