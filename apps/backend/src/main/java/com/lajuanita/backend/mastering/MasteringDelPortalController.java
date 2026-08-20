package com.lajuanita.backend.mastering;

import java.util.List;

import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.mastering.dto.TrabajoDelPortal;

/**
 * Mis trabajos de M&M, para el cliente que tiene cuenta.
 *
 * <p><b>Está separado de {@link MasteringController} porque son dos modelos de
 * autorización distintos</b>, no dos grupos de rutas. Aquel se acota por
 * <b>rol</b>, con anotación; este se acota por <b>identidad</b>, y el alcance vive
 * en el {@code WHERE} de la consulta: el id sale del token y no hay ningún endpoint
 * acá que reciba uno. Mezclarlos en una clase haría que un método cambie de
 * significado según quién lo llame, que es justo lo que el Módulo 4 evitó.
 *
 * <p><b>Es de solo lectura, y eso es una decisión del 2026-08-19.</b> El portal no
 * pide trabajos: el canal real es WhatsApp y <b>la mayoría de los clientes de M&M
 * son externos sin cuenta</b>, así que un formulario de pedido serviría a una
 * minoría y agregaría un segundo ciclo de vida —como el de
 * {@code solicitud_reserva}— para sostenerlo. Si algún día se construye, el estado
 * {@code A_CONFIRMAR} ya existe para eso.
 *
 * <p><b>Lo que esta pantalla sí hace es entregar el premaster</b> cuando está
 * liberado: es el otro extremo de la regla del módulo. El link llega o no llega
 * según {@code premaster_liberado}, y esa decisión se toma en
 * {@link TrabajoDelPortal} —en el mapeo, no en el front— porque un link escondido
 * en la pantalla viaja igual en la respuesta HTTP.
 */
@RestController
@RequestMapping("/api/me/mastering")
public class MasteringDelPortalController {

    private final MasteringService mastering;

    public MasteringDelPortalController(MasteringService mastering) {
        this.mastering = mastering;
    }

    @GetMapping
    public List<TrabajoDelPortal> mios(Authentication quienPide) {
        return mastering.mios(Autoridades.idDe(quienPide));
    }
}
