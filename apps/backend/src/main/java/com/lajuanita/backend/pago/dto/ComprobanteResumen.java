package com.lajuanita.backend.pago.dto;

import java.time.OffsetDateTime;

import com.lajuanita.backend.pago.ComprobanteEgreso;
import com.lajuanita.backend.pago.ComprobantePago;
import com.lajuanita.backend.usuario.Usuario;

/**
 * Un comprobante adjunto, como lo ve la pantalla.
 *
 * <p><b>{@code archivoPath} no viaja</b>, y es la misma decisión que
 * {@code TrabajoDelPortal} tomó con el link del premaster: la clave del
 * almacenamiento es interna, y publicarla en el JSON la deja a mano de cualquiera
 * que abra las herramientas del navegador. El archivo se baja por su endpoint, que
 * ya verificó quién pregunta. Lo que la pantalla necesita para dibujar la fila es
 * el nombre con el que se subió, no dónde quedó guardado.
 *
 * <p><b>Las dos firmas viajan enteras</b> —quién adjuntó y quién invalidó, con sus
 * fechas— porque en este esquema la firma es el dato. Un comprobante marcado
 * inválido sin decir quién lo marcó ni por qué es exactamente lo que `V7` salió a
 * arreglar.
 */
public record ComprobanteResumen(
        Long idComprobante,

        /** El nombre con el que llegó: "transferencia-agosto.pdf". */
        String nombreOriginal,

        String cargadoPor,
        OffsetDateTime fechaCreacion,

        boolean invalido,
        String invalidadoPor,
        OffsetDateTime fechaInvalidacion,
        String motivoInvalidacion) {

    public static ComprobanteResumen de(ComprobantePago comprobante) {
        return new ComprobanteResumen(
                comprobante.getId(),
                comprobante.getNombreOriginal(),
                nombreDe(comprobante.getQuienCargo()),
                comprobante.getFechaCreacion(),
                comprobante.isInvalido(),
                nombreDe(comprobante.getQuienInvalida()),
                comprobante.getFechaInvalidacion(),
                comprobante.getMotivoInvalidacion());
    }

    /**
     * El mismo resumen, para el comprobante de un egreso (§14 · C1).
     *
     * <p><b>Un solo record con dos fábricas, y no dos records iguales.</b> Es
     * literalmente la misma pregunta —qué archivo hay, quién lo subió, y si alguien
     * lo marcó inválido y por qué—, así que un segundo DTO idéntico sería un lugar
     * más donde se puede quedar viejo. Y del lado del front lo hace visible: la
     * pantalla de egresos dibuja los comprobantes con el <b>mismo componente</b>
     * que la de pagos, sin una línea nueva.
     *
     * <p>Es la misma decisión que el Módulo 4 tomó al revés con
     * {@code ReservaDelPortal}: allá se separó porque las dos lecturas mostraban
     * <i>cosas distintas</i>. Acá no hay nada que esconder ni que agregar.
     */
    public static ComprobanteResumen de(ComprobanteEgreso comprobante) {
        return new ComprobanteResumen(
                comprobante.getId(),
                comprobante.getNombreOriginal(),
                nombreDe(comprobante.getQuienCargo()),
                comprobante.getFechaCreacion(),
                comprobante.isInvalido(),
                nombreDe(comprobante.getQuienInvalida()),
                comprobante.getFechaInvalidacion(),
                comprobante.getMotivoInvalidacion());
    }

    private static String nombreDe(Usuario usuario) {
        return usuario == null ? null : usuario.getNombre() + " " + usuario.getApellido();
    }
}
