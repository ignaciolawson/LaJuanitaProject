package com.lajuanita.backend.mastering;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

import org.hibernate.annotations.Generated;
import org.hibernate.generator.EventType;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.profesor.Profesor;
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
 * Un trabajo de mix y/o mastering (§9, Módulo 6).
 *
 * <p><b>Es el único servicio del estudio que puede quedar en debe</b> (§3). Todo
 * lo demás se seña antes de existir —`V10`, sin excepción— y M&M está excluido de
 * esa regla por {@code tipo_uso.codigo}, porque Ghezz entrega y cobra después:
 * <i>"básicamente estoy fiando el servicio"</i>. Este módulo existe para que eso
 * deje de ser un favor sin registro.
 *
 * <p><b>Los tres entregables viajan como link y no como archivo</b> (P23, §14).
 * El audio se sigue mandando por WeTransfer o Drive; el sistema guarda la URL.
 * Entonces <b>lo que se retiene es el link</b>: mientras el sistema sea donde el
 * link se publica, no mostrarlo es no entregarlo. No hay {@code StorageService}
 * detrás de esto y no hace falta.
 *
 * <p><b>El cliente puede no tener cuenta</b>, igual que el comprador de un equipo:
 * la mayoría de los trabajos de M&M son de gente que manda un track y nunca se
 * inscribe en nada. {@code trabajo_cliente_identificado} exige uno de los dos
 * caminos. Lo que sí necesita cuenta es el <b>pago</b> —{@code pago.id_usuario} es
 * NOT NULL— y por eso la pantalla lo dice antes de dejar cargar el cobro.
 *
 * <p><b>Cuatro reglas de esta fila viven en la base y no acá</b>, y conviene saber
 * cuáles antes de tocar nada: el premaster no se libera sin un pago
 * (`V1` §8.4), el estado no retrocede (`V1` §8.5), el pago que respalda un
 * premaster liberado no se puede anular ni borrar (`V6` §6) y la fila no se borra
 * (`V6` §7). Ninguna se repite en Java.
 */
@Entity
@Table(name = "trabajo_mastering")
@Getter
@Setter
@NoArgsConstructor
public class TrabajoMastering {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "id_trabajo")
    private Long id;

    /** El cliente, cuando tiene cuenta. Si no, van los dos de abajo. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_cliente_usuario")
    private Usuario cliente;

    @Column(name = "nombre_cliente_externo", length = 150)
    private String nombreClienteExterno;

    @Column(name = "contacto_cliente_externo", length = 150)
    private String contactoClienteExterno;

    /** Quién lo hace. Hoy siempre Ghezz, pero la columna no lo asume. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_profesor_asignado")
    private Profesor profesorAsignado;

    @Enumerated(EnumType.STRING)
    @Column(name = "tipo_trabajo", nullable = false, length = 20)
    private TipoTrabajo tipoTrabajo;

    @Column(name = "nombre_track", nullable = false, length = 200)
    private String nombreTrack;

    /** Puede faltar mientras el trabajo está {@code A_CONFIRMAR}: todavía se está presupuestando. */
    @Column(name = "precio_acordado", precision = 14, scale = 2)
    private BigDecimal precioAcordado;

    /**
     * USD por defecto (§14). A diferencia de `pago` y `egreso`, acá <b>no</b> se
     * exige la cotización: el precio es lo pactado al presupuestar y la cotización
     * que importa es la del día del cobro, que queda en la fila de `pago`.
     */
    @Enumerated(EnumType.STRING)
    @Column(name = "moneda", nullable = false, length = 3)
    private Moneda moneda = Moneda.USD;

    @Column(name = "cotizacion_dolar", precision = 14, scale = 4)
    private BigDecimal cotizacionDolar;

    @Column(name = "revisiones_incluidas", nullable = false)
    private Short revisionesIncluidas = 3;

    /**
     * Cuántas se hicieron. <b>Puede superar a las incluidas</b> desde `V15`: esa es
     * la alerta de §9, no un error. El techo que ponía `V6` §3 hacía imposible
     * registrar el hecho que la regla pide avisar.
     */
    @Column(name = "revisiones_realizadas", nullable = false)
    private Short revisionesRealizadas = 0;

    @Column(name = "fecha_estimada")
    private LocalDate fechaEstimada;

    @Column(name = "fecha_entrega_real")
    private LocalDate fechaEntregaReal;

    @Enumerated(EnumType.STRING)
    @Column(name = "estado", nullable = false, length = 20)
    private EstadoTrabajo estado = EstadoTrabajo.A_CONFIRMAR;

    /** Lo que mandó el cliente. */
    @Column(name = "url_material_cliente", length = 500)
    private String urlMaterialCliente;

    /** Se entrega para revisión y no se retiene. */
    @Column(name = "url_master", length = 500)
    private String urlMaster;

    /** El que se retiene hasta el pago. Es el que el cliente necesita para discográficas. */
    @Column(name = "url_premaster", length = 500)
    private String urlPremaster;

    @Column(name = "premaster_liberado", nullable = false)
    private boolean premasterLiberado = false;

    @Column(name = "liberado_sin_pago", nullable = false)
    private boolean liberadoSinPago = false;

    @Column(name = "motivo_liberacion")
    private String motivoLiberacion;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "id_usuario_libera")
    private Usuario liberadoPor;

    /** De administración. <b>No viaja al portal</b>: por eso el portal tiene su propio DTO. */
    @Column(name = "notas_internas")
    private String notasInternas;

    /**
     * La escribe la base. Necesita {@code @Generated} porque el alta devuelve la
     * fila creada y la pantalla la muestra: con {@code insertable = false} a secas,
     * Hibernate nunca relee la columna y devuelve null. Es la sexta vez que este
     * proyecto se encuentra con eso.
     */
    @Generated(event = EventType.INSERT)
    @Column(name = "fecha_creacion", insertable = false, updatable = false)
    private OffsetDateTime fechaCreacion;

    /**
     * Libera el premaster.
     *
     * <p><b>Los tres campos de la excepción se escriben juntos o no se escriben</b>,
     * igual que la firma de una baja de nivel: sin motivo la base rechaza
     * ({@code trabajo_liberacion_justificada}) y sin autor no hay a quién
     * preguntarle. Que sea un método y no tres setters sueltos es lo que impide
     * liberar sin pago "a medias".
     *
     * <p>Cuando hay pago, {@code motivo} viene vacío y el trigger de `V1` §8.4 lo
     * verifica solo. Cuando no lo hay, el motivo es la única razón por la que la
     * base deja pasar.
     */
    public void liberarPremaster(String motivo, Usuario autor) {
        this.premasterLiberado = true;

        if (motivo != null) {
            this.liberadoSinPago = true;
            this.motivoLiberacion = motivo;
            this.liberadoPor = autor;
        }
    }

    /** Suma una revisión. Puede pasarse de las incluidas: ver el campo. */
    public void registrarRevision() {
        this.revisionesRealizadas = (short) (this.revisionesRealizadas + 1);
    }
}
