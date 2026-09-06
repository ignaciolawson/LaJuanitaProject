package com.lajuanita.backend.pago;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Los comprobantes de un egreso.
 *
 * <p><b>No hay un "traer por id" a secas, y es a propósito</b>, por lo mismo que
 * en {@link ComprobanteRepository}: la única consulta de acá pide además de qué
 * egreso es la fila, así que una URL que cruza el comprobante de un egreso con el
 * id de otro contesta "no existe" en vez de servir el archivo equivocado. Un
 * {@code findById} suelto se puede llamar por error y <b>no falla nada</b>: la
 * pantalla anda y muestra de más.
 *
 * <p><b>No hay equivalente de {@code mioPorId}</b>, y eso también es una decisión
 * y no un olvido: un egreso es plata que sale del estudio y <b>no tiene dueño del
 * lado del portal</b>. El destinatario de un sueldo no entra al sistema a
 * descargar su recibo — no hay pantalla ni endpoint que lo ofrezca. Si algún día
 * la hubiera, es una decisión de negocio nueva, no una consulta que falta.
 */
public interface ComprobanteEgresoRepository extends JpaRepository<ComprobanteEgreso, Long> {

    @Query("""
            SELECT c FROM ComprobanteEgreso c
            WHERE c.id = :id AND c.egreso.id = :idEgreso
            """)
    Optional<ComprobanteEgreso> delEgreso(@Param("id") Long id, @Param("idEgreso") Long idEgreso);
}
