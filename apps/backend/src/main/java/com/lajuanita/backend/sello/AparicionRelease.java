package com.lajuanita.backend.sello;

import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.usuario.Usuario;

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
 * Dónde sonó un release (P25).
 *
 * <p>Hoy Ghezz busca a mano si algún DJ tocó los temas: revisa sets, radios,
 * playlists. Esto es esa libreta, adentro del sistema. <b>Se carga a mano y no hay
 * ninguna integración con plataformas</b> — las dos mitades se confirmaron en la
 * misma frase, a propósito, para que la respuesta no significara dos cosas.
 *
 * <p><b>Que esta tabla quede vacía no es una falla del sistema.</b> Textual:
 * <i>"si en el futuro no lo usan, que no lo usen y fue"</i>. La pantalla tiene que
 * leerse bien con cero filas, igual que el informe de uso de salas con una sala sin
 * uso.
 */
@Entity
@Table(name = "aparicion_release")
@Getter
@Setter
@NoArgsConstructor
public class AparicionRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_aparicion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_release", nullable = false)
    private Release release;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_aparicion", nullable = false, length = 20)
    private TipoAparicion tipoAparicion;

    /** "Radio Metro", "Boiler Room", "playlist Techno Bunker". */
    @Column(name = "donde", nullable = false, length = 200)
    private String donde;

    /** Quién lo puso, si se sabe. Una playlist no tiene autor a la vista. */
    @Column(name = "quien", length = 150)
    private String quien;

    @Column(name = "fecha")
    private LocalDate fecha;

    @Column(name = "url", length = 500)
    private String url;

    @Column(name = "notas", columnDefinition = "text")
    private String notas;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_carga")
    private Usuario cargadoPor;

    /**
     * La jerarquía de "popularidad", calculada por la base.
     *
     * <p><b>Es de solo lectura desde acá</b> ({@code insertable/updatable = false}):
     * es una columna generada y Postgres rechaza cualquier INSERT que le mande un
     * valor. {@code @Generated} porque el alta devuelve la fila recién creada — sin
     * eso Hibernate no la relee y el campo vuelve en null, que es la sexta vez que
     * este proyecto pisa esa trampa.
     *
     * <p>Vive en la base y no en {@link TipoAparicion} para que el tablero del
     * Módulo 8 no escriba un segundo CASE que pueda quedar distinto.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "orden_relevancia", insertable = false, updatable = false)
    private Short ordenRelevancia;

    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;
}
