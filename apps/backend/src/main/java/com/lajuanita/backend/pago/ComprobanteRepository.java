package com.lajuanita.backend.pago;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/**
 * Los comprobantes de un pago.
 *
 * <p><b>No hay un "traer por id" a secas, y es a propósito.</b> Las dos consultas
 * de acá piden además de quién es la fila: una exige el pago al que pertenece
 * —así una URL que cruza el comprobante de un pago con el id de otro contesta
 * "no existe" en vez de servir el archivo equivocado— y la otra exige el dueño,
 * que es el filtro de identidad del portal. Un {@code findById} suelto se puede
 * llamar por error desde cualquiera de los dos lados y <b>no falla nada</b>: la
 * pantalla anda y muestra de más, que es el modo de falla que el Módulo 4 y el 5
 * pagaron con tests escritos de a pares.
 */
public interface ComprobanteRepository extends JpaRepository<ComprobantePago, Long> {

    /**
     * Un comprobante de <b>ese</b> pago. Para administración.
     *
     * <p>El {@code id_pago} viaja en la URL porque el endpoint está anidado, y
     * verificarlo cuesta una condición: sin ella, {@code /api/pagos/9/comprobantes/3}
     * devolvería el comprobante 3 aunque sea del pago 4.
     */
    @Query("""
            SELECT c FROM ComprobantePago c
            WHERE c.id = :id AND c.pago.id = :idPago
            """)
    Optional<ComprobantePago> delPago(@Param("id") Long id, @Param("idPago") Long idPago);

    /**
     * Un comprobante de un pago <b>de esta persona</b>. Para el portal.
     *
     * <p>El id del dueño sale del {@code sub} del token, nunca de la URL. Un
     * comprobante ajeno no vuelve vacío por permisos sino por no encontrarse, que
     * es la respuesta que el portal da desde el Módulo 4: <i>"no existe"</i> no le
     * confirma a nadie que la fila está ahí.
     *
     * <p>⚠️ <b>Desde `V19` un pago puede no tener cuenta.</b> Esos quedan afuera de
     * esta consulta por la comparación misma, que es lo correcto: un pago de un
     * pagador externo no es de nadie del portal.
     */
    @Query("""
            SELECT c FROM ComprobantePago c
            WHERE c.id = :id AND c.pago.usuario.id = :idUsuario
            """)
    Optional<ComprobantePago> mioPorId(@Param("id") Long id, @Param("idUsuario") Long idUsuario);
}
