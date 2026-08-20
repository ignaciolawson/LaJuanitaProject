package com.lajuanita.backend.aviso;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import com.lajuanita.backend.aviso.dto.ResumenDeAvisos;

/**
 * El reloj. Todo lo que decide está en {@link AvisoService}.
 *
 * <p>La separación no es ceremonia: <b>es lo que hace que la lógica se pueda
 * probar</b>. Si la regla viviera adentro del método anotado, probarla sería
 * esperar a que Spring lo dispare, y una suite que espera al reloj o tarda o
 * miente. Los casos llaman a {@code generar()} directamente y esta clase queda
 * con lo único que no es nuestro: cuándo.
 *
 * <h2>Por qué una vez por día y no cada hora</h2>
 *
 * <p>Los tres avisos que existen o van a existir se miden en días —7 de deuda,
 * 7 desde la entrega, 7 antes del lanzamiento—, así que correr más seguido no
 * adelantaría ninguno: descubriría el mismo hecho el mismo día, solo que más
 * temprano. Y a las 8 porque un aviso que aparece durante la jornada se lee ese
 * día; uno escrito a las 3 de la mañana también, pero además complica saber de
 * qué día es cuando algo salga mal.
 *
 * <h2>Y por qué no corre al arrancar</h2>
 *
 * <p>Deliberadamente no hay {@code initialDelay} ni nada que dispare en el
 * arranque. Un deploy no es motivo para avisar nada, y reiniciar tres veces una
 * tarde no debería tener consecuencias visibles. Que no las tendría —los avisos
 * están deduplicados por `V17`— no es razón para permitirlo: la deduplicación es
 * la red, no el diseño.
 */
@Component
public class AvisosAutomaticos {

    private static final Logger log = LoggerFactory.getLogger(AvisosAutomaticos.class);

    private final AvisoService avisos;

    public AvisosAutomaticos(AvisoService avisos) {
        this.avisos = avisos;
    }

    /**
     * La corrida diaria.
     *
     * <p><b>Se traga cualquier excepción a propósito.</b> Una tarea programada que
     * revienta deja de reprogramarse en algunos ejecutores, y el modo de falla sería
     * el peor posible: el sistema sigue andando, nadie recibe avisos nunca más, y no
     * hay ninguna pantalla donde eso se vea. Como la corrida es idempotente,
     * perderse la de hoy no cuesta nada — la de mañana rehace lo mismo, incluidos
     * los avisos de hoy.
     */
    @Scheduled(cron = "${lajuanita.avisos.cron:0 0 8 * * *}", zone = "${lajuanita.avisos.zona:America/Argentina/Buenos_Aires}")
    public void correr() {
        try {
            ResumenDeAvisos resumen = avisos.generar();
            log.info("Avisos automáticos: {} pagos pasaron a VENCIDO; {} deudas, {} entregas impagas "
                    + "y {} lanzamientos próximos; {} notificaciones escritas y {} ya estaban.",
                    resumen.pagosVencidos(), resumen.deudoresAvisados(), resumen.entregasAvisadas(),
                    resumen.lanzamientosAvisados(),
                    resumen.avisosEscritos(), resumen.avisosOmitidos());
        } catch (RuntimeException e) {
            log.error("La corrida de avisos automáticos falló. No se reintenta hoy: "
                    + "mañana rehace lo mismo, que es idempotente.", e);
        }
    }
}
