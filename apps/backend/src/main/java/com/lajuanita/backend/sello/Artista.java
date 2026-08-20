package com.lajuanita.backend.sello;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.usuario.Usuario;

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
 * Un artista del sello.
 *
 * <p><b>Es una ficha que administra el estudio, no una cuenta</b> (P24, cerrada el
 * 2026-08-20): los artistas no entran al sistema, y lo que pasa con un release se
 * lo cuenta Ghezz como hasta ahora. Esa respuesta hizo que este módulo sea la mitad
 * de grande de lo que podía haber sido — sin portal propio, sin decidir qué ve un
 * artista de su release, y sin un tercer eje de autorización por identidad.
 *
 * <p><b>{@link #usuario} existe igual y es nullable</b>, como en `V1`: es la puerta
 * dejada abierta para el día que sí entren. Que hoy esté siempre en null no es un
 * campo muerto — es la diferencia entre agregarle login a los artistas con una
 * pantalla, o con una migración sobre una tabla que ya tiene datos reales.
 *
 * <p>`V6` le puso un índice único parcial sobre esa columna: <b>una persona es un
 * artista, no varios</b>. Con dos fichas, "los releases de Ghezz" devuelve la mitad
 * — y Ghezz es el caso testigo, porque es profesor, staff y artista a la vez.
 */
@Entity
@Table(name = "artista")
@Getter
@Setter
@NoArgsConstructor
public class Artista {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_artista")
    private Long id;

    /** La cuenta, si algún día la tiene. Ver el comentario de la clase. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario")
    private Usuario usuario;

    @Column(name = "nombre_artistico", nullable = false, length = 150)
    private String nombreArtistico;

    @Column(name = "nombre_real", length = 150)
    private String nombreReal;

    @Column(name = "email_contacto", length = 150)
    private String emailContacto;

    @Column(name = "telefono", length = 40)
    private String telefono;

    @Column(name = "instagram", length = 100)
    private String instagram;

    /**
     * Si el sello ya cerró con él.
     *
     * <p>No es lo mismo que tener contrato: se confirma un artista mucho antes de
     * que haya un PDF firmado, y la regla dura mira el contrato y no esta bandera.
     */
    @Column(name = "confirmado", nullable = false)
    private boolean confirmado = false;

    @Column(name = "bio", columnDefinition = "text")
    private String bio;

    /**
     * `V1` la llamó {@code fecha_alta} y no {@code fecha_creacion}, que es el nombre
     * acordado para lo nuevo (DB-08). No se renombra: no vale una migración por sí
     * sola, y `V18` no tocó esta tabla.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_alta", nullable = false, updatable = false)
    private OffsetDateTime fechaAlta;
}
