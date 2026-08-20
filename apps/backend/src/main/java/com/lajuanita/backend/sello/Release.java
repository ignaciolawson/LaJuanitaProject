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
 * Un lanzamiento del sello.
 *
 * <p><b>Las reglas de esta tabla las impone la base</b>, como en todo el proyecto:
 * el código es único (`V1`), el estado solo avanza y de cancelado no se sale
 * (`V1` §8.5 + `V18` §1b), <b>no se publica sin contrato adjunto</b> (`V18` §2), la
 * excepción exige motivo escrito y autor (`V18` §2, CHECK), y la fila no se borra
 * (`V18` §4). Los métodos de abajo no reemplazan nada de eso: existen para que el
 * servicio no pueda escribir media firma.
 *
 * <p><b>{@code portadaPath} guarda una clave de {@code Almacenamiento}, no una
 * URL.</b> Igual que {@code ContratoSello#archivoPath}: es opaca, la genera el
 * almacenamiento, y no se interpreta ni se construye desde acá.
 */
@Entity
@Table(name = "release")
@Getter
@Setter
@NoArgsConstructor
public class Release {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_release")
    private Long id;

    /**
     * El ID propio del sello: {@code LJ01}, {@code LJ02}…
     *
     * <p><b>Lo genera el sistema y aun así la columna es libre</b> (§15, ratificación
     * 5). Los dos hechos van juntos: los lanzamientos anteriores se cargan, y un
     * release de 2023 tiene el número que tuvo y no el que le tocaría hoy. Generar
     * es una comodidad del alta, no una restricción de la tabla — ver
     * {@code ReleaseService#proximoCodigo}.
     */
    @Column(name = "codigo_release", nullable = false, length = 20)
    private String codigoRelease;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_artista", nullable = false)
    private Artista artista;

    @Column(name = "nombre_release", nullable = false, length = 200)
    private String nombreRelease;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_release", length = 20)
    private TipoRelease tipoRelease;

    @Column(name = "genero", length = 80)
    private String genero;

    /** Clave de {@code Almacenamiento}, no una URL. Ver el comentario de la clase. */
    @Column(name = "portada_path", length = 500)
    private String portadaPath;

    /** Cuándo se planea que salga. Es la fecha que mira el aviso de los 7 días. */
    @Column(name = "fecha_estimada")
    private LocalDate fechaEstimada;

    /** Cuándo salió de verdad. */
    @Column(name = "fecha_real")
    private LocalDate fechaReal;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoRelease estado = EstadoRelease.A_CONFIRMAR;

    /** Si ya se mandó al sistema de promoción internacional (§10). */
    @Column(name = "sistema_promo", nullable = false)
    private boolean sistemaPromo = false;

    @Column(name = "notas", columnDefinition = "text")
    private String notas;

    // == La excepción de la regla dura =======================================

    @Column(name = "publicado_sin_contrato", nullable = false)
    private boolean publicadoSinContrato = false;

    @Column(name = "motivo_publicacion", columnDefinition = "text")
    private String motivoPublicacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_publica")
    private Usuario publicadoPor;

    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    // =========================================================================

    /**
     * Publicar sin contrato, dejando firmado por qué.
     *
     * <p><b>Escribe las tres cosas juntas por la misma razón que
     * {@code Inscripcion#firmarBajaDeNivel}</b>: el CHECK de `V18` rechaza la fila si
     * falta cualquiera de ellas, así que un camino que escriba solo el booleano
     * produce un 500 en vez de una excepción con sentido. Y el autor sale del token
     * y no del cuerpo del pedido — quien firma no se elige desde un formulario.
     *
     * <p>El motivo cuesta escribirlo y eso es el diseño: un bloqueo sin salida se
     * esquiva por afuera del sistema y ahí el sistema pasa a mentir. Ghezz avisó que
     * con gente cercana es flexible.
     */
    public void publicarSinContrato(String motivo, Usuario autor) {
        this.publicadoSinContrato = true;
        this.motivoPublicacion = motivo;
        this.publicadoPor = autor;
        this.estado = EstadoRelease.PUBLICADO;
        marcarSalidaSiFalta();
    }

    /**
     * Publicar como corresponde. Si no hay contrato, el trigger de `V18` rechaza y
     * el mensaje que ve la pantalla es el suyo.
     */
    public void publicar() {
        this.estado = EstadoRelease.PUBLICADO;
        marcarSalidaSiFalta();
    }

    /**
     * Un release publicado sin fecha real es un release que salió y no dice cuándo.
     *
     * <p>Se completa solo con el día de hoy, y <b>solo si falta</b>: al cargar los
     * lanzamientos viejos la fecha viene puesta y es la que vale. Pisarla con hoy
     * convertiría el catálogo histórico en una lista de releases publicados todos el
     * mismo día.
     */
    private void marcarSalidaSiFalta() {
        if (this.fechaReal == null) {
            this.fechaReal = LocalDate.now();
        }
    }
}
