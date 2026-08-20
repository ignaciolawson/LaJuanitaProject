package com.lajuanita.backend.notificacion;

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
 * Un aviso para una persona.
 *
 * <p>La tabla existe desde `V1` y <b>hasta el Módulo 4 nadie la escribía</b>. Eso
 * es exactamente lo que el cierre del Módulo 2 enseñó a preguntar: <i>de dónde
 * sale el primer dato de cada tabla que este módulo toca</i>. Acá sale de resolver
 * una solicitud del portal.
 *
 * <p><b>No hay envío de nada.</b> Esto es una bandeja adentro del sistema: no hay
 * mail —no existe infraestructura de correo ni se planea— ni WhatsApp, que es el
 * canal real del estudio y está fuera del alcance inicial. La notificación se ve
 * cuando la persona entra.
 *
 * <p>{@link #urlDestino} es a dónde lleva el clic. Guardar la ruta y no el id del
 * objeto es lo que permite que un aviso apunte a cualquier pantalla sin que esta
 * tabla tenga que conocerlas.
 */
@Entity
@Table(name = "notificacion")
@Getter
@Setter
@NoArgsConstructor
public class Notificacion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_notificacion")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "id_usuario_destino", nullable = false)
    private Usuario destino;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo", nullable = false, length = 50)
    private TipoNotificacion tipo;

    @Column(name = "titulo", length = 200)
    private String titulo;

    @Column(name = "contenido", nullable = false, columnDefinition = "text")
    private String contenido;

    /** A dónde lleva el clic. Una ruta del front, no un id. */
    @Column(name = "url_destino", length = 300)
    private String urlDestino;

    @Column(name = "leida", nullable = false)
    private boolean leida = false;

    /**
     * Qué HECHO se avisó, para los avisos que dispara la máquina sola.
     *
     * <p><b>Null en todo lo que escribe una persona</b> —te aprobaron la sala, te
     * movieron la clase— y con un valor solo en lo automático. La diferencia no es
     * de forma: cuando alguien resuelve dos pedidos parecidos son dos avisos y los
     * dos tienen que llegar, mientras que el cron que corre dos veces el mismo día
     * está mirando <i>el mismo hecho</i> y tiene que escribir una sola fila.
     *
     * <p>El valor se arma con los datos del hecho y <b>nunca con la fecha de la
     * corrida</b> ({@code DEUDA:u=42:ARS:desde=2026-08-01}), que es lo que hace
     * que la misma situación dé siempre la misma clave y una situación nueva dé
     * una distinta. El detalle está en el encabezado de `V17`.
     *
     * <p>Quien garantiza que no se duplique es el índice único parcial de la base,
     * no este campo ni el chequeo del servicio.
     */
    @Column(name = "clave_evento", length = 200, updatable = false)
    private String claveEvento;

    /**
     * Lo pone el DEFAULT de la base.
     *
     * <p>{@code @Generated} porque la fecha se muestra en la bandeja: es la sexta
     * vez que aparece esta trampa. Sin la anotación Hibernate no relee la columna
     * después del INSERT y el campo queda en null dentro de esa transacción.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", nullable = false, updatable = false)
    private OffsetDateTime fechaCreacion;
}
