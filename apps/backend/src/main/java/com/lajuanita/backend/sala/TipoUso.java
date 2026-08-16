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
}
