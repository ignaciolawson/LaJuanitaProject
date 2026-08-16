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
 * Una de las tres cabinas del estudio: Sala 1, Sala 2 y la cabina de grabación.
 * Las carga `V2` como dato del negocio, no como estructura.
 *
 * <p>Las tres son "cabinas" —lugares donde se toca—. La de grabación tiene
 * equipos y cámara pero no tiene silla, tele ni escritorio, y por eso no sirve
 * para todo: qué se puede hacer en cada una vive en la tabla `sala_tipo_uso` y
 * no en el código, para que el día que compren una silla se cambie desde una
 * pantalla y no con una migración.
 *
 * <p><b>{@link #activa} en {@code false} significa algo desde `V9`:</b> la sala
 * no acepta reservas nuevas a futuro, y las ya cargadas siguen valiendo. Antes
 * era una columna decorativa, que es peor que no tenerla — quien la ponía en
 * false creía que había hecho algo.
 */
@Entity
@Table(name = "sala")
@Getter
@Setter
@NoArgsConstructor
public class Sala {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_sala")
    private Long id;

    @Column(name = "nombre_sala", nullable = false, length = 100)
    private String nombreSala;

    @Column(name = "descripcion", columnDefinition = "text")
    private String descripcion;

    @Column(name = "activa", nullable = false)
    private boolean activa = true;

    /** Orden en que se dibujan las columnas del calendario. */
    @Column(name = "orden", nullable = false)
    private short orden;
}
