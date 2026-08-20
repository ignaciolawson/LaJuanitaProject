package com.lajuanita.backend.sello;

import java.time.LocalDate;
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
 * El contrato que respalda a un artista o a un release.
 *
 * <p><b>Es el archivo que obligó a construir el {@code StorageService}</b> (P38,
 * §15). {@code archivo_path} es {@code NOT NULL} desde `V1` y la columna se llama
 * <i>path</i>, no <i>url</i>: el esquema apostó desde el primer día a que el PDF se
 * sube, y la respuesta del cliente confirmó esa apuesta. Un link al Drive de otro
 * se cae, se mueve o se revoca sin que el estudio se entere, y el sistema seguiría
 * diciendo que el release tiene su respaldo.
 *
 * <p><b>{@link #release} es nullable, y de ahí sale la parte no obvia de la regla
 * dura.</b> `V1` lo dejó así con su propio comentario: un contrato puede cubrir al
 * artista en general y no a un lanzamiento. Entonces un release está respaldado por
 * un contrato <b>suyo o uno general de su artista</b> — dos caminos, igual que la
 * seña de `V10`, donde el dinero detrás de una reserva llega por un pago propio o
 * por la inscripción que cubre la clase.
 *
 * <p><b>Se puede borrar, salvo que respalde algo ya publicado</b> (`V18` §3). Es la
 * excepción que también tiene {@code bloqueo_sala}, y por el mismo razonamiento:
 * `V6` §7 prohibió el DELETE solo donde hay una anulación documentada que deje una
 * salida. Un contrato no tiene estado de anulación — es un documento, no un asiento
 * — así que prohibirlo dejaría el PDF equivocado adjunto para siempre a un artista
 * real.
 */
@Entity
@Table(name = "contrato_sello")
@Getter
@Setter
@NoArgsConstructor
public class ContratoSello {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_contrato")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_artista", nullable = false)
    private Artista artista;

    /** Null = cubre al artista en general. Ver el comentario de la clase. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_release")
    private Release release;

    /** Clave de {@code Almacenamiento}. Opaca: no se interpreta ni se arma acá. */
    @Column(name = "archivo_path", nullable = false, length = 500)
    private String archivoPath;

    /**
     * <b>No se guarda el nombre original del archivo, y es deliberado.</b> `V1` no
     * tiene esa columna y no vale una migración por un nombre: la descarga arma uno
     * legible con el código del release y el artista, que además le sirve más a
     * quien lo baja que {@code escaneo_final_v2.pdf}.
     */
    @Column(name = "fecha_firma")
    private LocalDate fechaFirma;

    @Column(name = "observaciones", columnDefinition = "text")
    private String observaciones;

    /** `V1` la llamó {@code fecha_carga}; ver la nota de DB-08 en {@code Artista}. */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_carga", nullable = false, updatable = false)
    private OffsetDateTime fechaCarga;
}
