package com.lajuanita.backend.sello;

import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

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
 * Un tema de un EP o de un álbum (P51–P53).
 *
 * <p><b>Las reglas las impone `V26`, no esta clase.</b> Sólo un EP o un álbum
 * llevan temas (§2), el rango se verifica <b>al publicar</b> y no al cargar cada
 * fila (§3), y no se saca un tema que sostiene el rango de un release ya publicado
 * (§4). Ninguna de las tres se puede escribir acá: la primera y la tercera cruzan
 * dos tablas, y la segunda tiene que mirar una transición de estado.
 *
 * <p><b>El {@code orden} lo asigna siempre el servidor</b> — {@code max + 1} al
 * agregar, intercambio al mover. Por eso el UNIQUE de `V26` es
 * {@code DEFERRABLE INITIALLY DEFERRED}: un duplicado sólo puede venir de un bug
 * nuestro, nunca de algo que alguien tipeó, así que que el rechazo llegue al COMMIT
 * no le cuesta nada a nadie — y a cambio se puede intercambiar dos posiciones sin
 * que el primer UPDATE choque contra el segundo tema.
 *
 * <p><b>{@code artistaInvitado} es texto libre y no una FK a {@code artista}</b>:
 * un feat. puede ser cualquiera, y casi nunca está firmado por el sello.
 */
@Entity
@Table(name = "cancion_release")
@Getter
@Setter
@NoArgsConstructor
public class CancionRelease {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_cancion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_release", nullable = false)
    private Release release;

    @Column(name = "orden", nullable = false)
    private Short orden;

    @Column(name = "titulo", nullable = false, length = 200)
    private String titulo;

    /**
     * En segundos.
     *
     * <p>La pantalla escribe y lee {@code mm:ss}; guardar el texto haría que sumar
     * la duración de un álbum fuera parsear once cadenas.
     */
    @Column(name = "duracion_segundos")
    private Integer duracionSegundos;

    @Column(name = "artista_invitado", length = 200)
    private String artistaInvitado;

    /**
     * El código internacional de la grabación, el que piden las distribuidoras.
     *
     * <p>Se guarda como se escribió: `V26` acepta las dos formas —con y sin
     * guiones— y verifica la forma con un CHECK, porque un ISRC que no es un ISRC
     * se publica como si lo fuera. <b>No es único a propósito</b>: la misma
     * grabación sale como single y como tema de un álbum con el mismo código, que
     * es justamente para lo que sirve.
     */
    @Column(name = "isrc", length = 20)
    private String isrc;

    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;
}
