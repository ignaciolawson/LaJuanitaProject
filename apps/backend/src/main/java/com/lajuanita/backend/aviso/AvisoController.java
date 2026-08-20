package com.lajuanita.backend.aviso;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.aviso.dto.ResumenDeAvisos;
import com.lajuanita.backend.config.PuedeOperar;

/**
 * Correr los avisos a mano.
 *
 * <p><b>Existe porque un proceso que solo se dispara solo no se puede verificar.</b>
 * El día que la bandeja esté vacía hay dos explicaciones —no hay nada que avisar, o
 * el cron dejó de correr— y sin esto no hay forma de distinguirlas sin entrar al
 * servidor a leer logs. El resumen que devuelve contesta las dos.
 *
 * <p><b>Y es seguro de ofrecer únicamente porque la corrida es idempotente.</b> Ese
 * es el orden de las cosas y no al revés: si apretarlo dos veces duplicara la
 * bandeja de todo el mundo, este endpoint no debería existir. Apretarlo diez veces
 * seguidas escribe lo mismo que apretarlo una — el UPDATE solo toca {@code DEBE} y
 * los avisos van contra el índice único de `V17`.
 *
 * <p>{@code @PuedeOperar} y no {@code @PuedeLeerAdministracion}: escribe filas. Un
 * {@code DIRECTIVO}, que lee todo y no escribe nada, tampoco es destinatario de
 * estos avisos, así que no tendría ni qué mirar después de correrlo.
 *
 * <p><b>No hay GET.</b> Los avisos se leen por la bandeja de siempre
 * ({@code /api/me/notificaciones}), que ya filtra por destinatario y no sabe ni le
 * importa si el aviso lo escribió una persona o el cron. Un endpoint de "ver los
 * avisos automáticos" sería una segunda puerta a las mismas filas, con su propia
 * chance de olvidarse el filtro.
 */
@RestController
@RequestMapping("/api/avisos")
public class AvisoController {

    private final AvisoService avisos;

    public AvisoController(AvisoService avisos) {
        this.avisos = avisos;
    }

    @PostMapping("/ejecutar")
    @PuedeOperar
    public ResumenDeAvisos ejecutar() {
        return avisos.generar();
    }
}
