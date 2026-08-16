package com.lajuanita.backend.reserva;

import java.time.LocalDate;
import java.util.List;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.config.PuedeLeerAdministracion;
import com.lajuanita.backend.config.PuedeOperar;
import com.lajuanita.backend.reserva.dto.AltaParticipanteRequest;
import com.lajuanita.backend.reserva.dto.AltaReservaRequest;
import com.lajuanita.backend.reserva.dto.EdicionReservaRequest;
import com.lajuanita.backend.reserva.dto.ParticipanteResumen;
import com.lajuanita.backend.reserva.dto.ReservaResumen;
import com.lajuanita.backend.reserva.dto.UsoDeSala;

import jakarta.validation.Valid;

/**
 * Módulo 2 — Horarios y salas. El corazón operativo.
 *
 * <p>Resuelve el problema que el relevamiento marca como más caro: Ghezz
 * enterándose tarde de un cambio de sala.
 *
 * <p><b>Todo lo de acá es administración por ahora.</b> El alcance dice que los
 * profesores ven el calendario y los alumnos ven solo sus reservas, pero eso es
 * el Módulo 5 y el Módulo 4: hoy no hay forma de que un profesor entre a ver lo
 * suyo, y darle {@code @PuedeLeerAdministracion} a un profesor le daría de paso
 * el listado de alumnos entero. El filtro {@code idProfesor} existe para que
 * administración mire la agenda de uno; el portal del profesor va a salir de ahí.
 *
 * <p><b>Lo que este módulo todavía no trae:</b> la seña. El trigger que exige
 * plata detrás de cada reserva necesita un {@code pago} apuntándole, y esa tabla
 * no tiene módulo hasta el 3 — activarlo hoy dejaría sin poder cargar ningún
 * alquiler de cabina. Decidido con Ignacio el 2026-08-16; la herramienta está
 * escrita en la cabecera de `V9`.
 */
@RestController
@RequestMapping("/api/reservas")
public class ReservaController {

    private final ReservaService reservas;

    public ReservaController(ReservaService reservas) {
        this.reservas = reservas;
    }

    /**
     * La agenda de un rango de fechas. <b>No pagina</b>: una semana se dibuja
     * entera o la respuesta engaña. Lo que la acota es el rango, con techo de
     * {@link ReservaService#MAXIMO_DE_DIAS} días.
     */
    @GetMapping
    @PuedeLeerAdministracion
    public List<ReservaResumen> agenda(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Long idSala,
            @RequestParam(required = false) Long idProfesor,
            @RequestParam(defaultValue = "false") boolean incluirCanceladas) {

        return reservas.agenda(desde, hasta, idSala, idProfesor, incluirCanceladas);
    }

    /**
     * Pantalla 4 — el historial de uso por sala y período.
     *
     * <p>Va antes que {@code /{id}} a propósito: si quedara debajo, Spring
     * intentaría leer "uso" como un id y devolvería un 400 en vez del informe.
     */
    @GetMapping("/uso")
    @PuedeLeerAdministracion
    public List<UsoDeSala> uso(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            @RequestParam(required = false) Long idSala) {

        return reservas.uso(desde, hasta, idSala);
    }

    @GetMapping("/{id}")
    @PuedeLeerAdministracion
    public ReservaResumen porId(@PathVariable Long id) {
        return reservas.porId(id);
    }

    @PostMapping
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ReservaResumen alta(@Valid @RequestBody AltaReservaRequest solicitud,
            Authentication quienPide) {
        return reservas.alta(solicitud, Autoridades.idDe(quienPide));
    }

    /** Mover una reserva de sala, día u horario. Queda firmado quién lo hizo. */
    @PutMapping("/{id}")
    @PuedeOperar
    public ReservaResumen editar(@PathVariable Long id,
            @Valid @RequestBody EdicionReservaRequest solicitud,
            Authentication quienPide) {
        return reservas.editar(id, solicitud, Autoridades.idDe(quienPide));
    }

    /** Cancelar, finalizar o reactivar. Nunca borra: es historial de clases. */
    @PatchMapping("/{id}/estado")
    @PuedeOperar
    public ReservaResumen cambiarEstado(@PathVariable Long id,
            @RequestParam EstadoReserva estado,
            Authentication quienPide) {
        return reservas.cambiarEstado(id, estado, Autoridades.idDe(quienPide));
    }

    // -- Quiénes asisten ------------------------------------------------------

    @PostMapping("/{id}/participantes")
    @PuedeOperar
    @ResponseStatus(HttpStatus.CREATED)
    public ParticipanteResumen agregarParticipante(@PathVariable Long id,
            @Valid @RequestBody AltaParticipanteRequest solicitud) {
        return reservas.agregarParticipante(id, solicitud);
    }

    /**
     * Tomar lista.
     *
     * <p>Sacar a alguien de la clase es {@code estado=CANCELADA}, no un DELETE:
     * la fila es la que sostiene la cuenta de clases restantes.
     */
    @PatchMapping("/participantes/{idParticipacion}")
    @PuedeOperar
    public ParticipanteResumen cambiarAsistencia(@PathVariable Long idParticipacion,
            @RequestParam EstadoAsistencia estado,
            Authentication quienPide) {
        return reservas.cambiarAsistencia(idParticipacion, estado, Autoridades.idDe(quienPide));
    }
}
