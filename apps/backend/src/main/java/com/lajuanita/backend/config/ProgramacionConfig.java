package com.lajuanita.backend.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enciende las tareas programadas.
 *
 * <p><b>Sin esta clase, un {@code @Scheduled} compila y no corre nunca.</b> Es
 * exactamente la misma trampa que {@code @EnableMethodSecurity}, que este proyecto
 * ya tiene anotada: una anotación que se lee como si hiciera algo y que sin su
 * interruptor no hace nada, sin un solo error a la vista. Ahí el costo era un
 * {@code @PreAuthorize} que no autorizaba; acá es un aviso que no llega.
 *
 * <p><b>El interruptor existe para que la suite no dispare avisos.</b>
 * {@code mvn test} levanta el contexto decenas de veces; con el cron encendido,
 * cada arranque programa una tarea que puede caer en medio de un test y escribirle
 * notificaciones a una base que ese test está contando. Se apaga desde la
 * configuración de surefire en el pom, igual que el límite de intentos por IP y
 * por la misma razón que aquel: <b>no con un {@code application.properties} en
 * {@code src/test/resources}</b>, que TAPA al de {@code src/main} en vez de
 * completarlo y se llevaría puesta la configuración de la base.
 *
 * <p>Lo que sí corre en los tests es {@link com.lajuanita.backend.aviso.AvisoService},
 * llamado a mano. Es lo que hay que probar: el reloj de Spring no es nuestro.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "lajuanita.avisos.habilitado", havingValue = "true", matchIfMissing = true)
public class ProgramacionConfig {
}
