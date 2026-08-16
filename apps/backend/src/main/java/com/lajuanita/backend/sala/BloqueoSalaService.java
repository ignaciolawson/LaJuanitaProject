package com.lajuanita.backend.sala;

import java.time.LocalDate;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.sala.dto.AltaBloqueoRequest;
import com.lajuanita.backend.sala.dto.BloqueoResumen;
import com.lajuanita.backend.usuario.RecursoNoEncontradoException;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * Sacar una sala de servicio y volver a ponerla.
 *
 * <p><b>Ninguna de las tres reglas de este módulo está en este archivo</b>, y es
 * lo mismo que pasa en {@code ReservaService}: que dos bloqueos no se pisen lo
 * impide un EXCLUDE, que no se bloquee una sala con clases adentro lo impide un
 * trigger, y que no se reserve sobre un bloqueo lo impide el trigger inverso.
 * Los tres rechazan con una frase redactada para que la lea una persona y
 * {@code ManejadorDeErrores} la pasa tal cual.
 *
 * <p><b>No hay edición, a propósito.</b> Un bloqueo no tiene estados ni nada
 * colgando: cambiarlo es borrarlo y cargarlo de nuevo, un clic más. Y "extender
 * el mantenimiento dos días" por UPDATE tiene que pasar igual por el trigger de
 * reservas activas, así que no ahorra ni la comprobación cara. Si alguna vez se
 * agrega, va con {@code id_usuario_registra} reescrito: el que extiende es tan
 * autor como el que cargó.
 */
@Service
public class BloqueoSalaService {

    private final BloqueoSalaRepository bloqueos;
    private final SalaRepository salas;
    private final UsuarioRepository usuarios;

    public BloqueoSalaService(BloqueoSalaRepository bloqueos,
            SalaRepository salas,
            UsuarioRepository usuarios) {
        this.bloqueos = bloqueos;
        this.salas = salas;
        this.usuarios = usuarios;
    }

    /**
     * @param desde  desde qué día interesan. Por defecto hoy: un bloqueo vencido
     *               ya no rechaza nada y no es lo que se viene a mirar.
     * @param idSala opcional
     */
    @Transactional(readOnly = true)
    public List<BloqueoResumen> listar(LocalDate desde, Long idSala) {
        LocalDate hoy = LocalDate.now();
        return bloqueos.desde(desde == null ? hoy : desde, idSala).stream()
                .map(b -> BloqueoResumen.de(b, hoy))
                .toList();
    }

    @Transactional
    public BloqueoResumen alta(AltaBloqueoRequest solicitud, Long idAutor) {
        // Hibernate ordena los INSERT ANTES que los UPDATE, y el trigger que
        // decide si esta sala se puede bloquear lee `reserva` con SQL: ve lo que
        // está en la base, no lo que hay pendiente en la sesión. Cancelar una
        // clase y bloquear la sala en la misma transacción rechazaba el bloqueo
        // por la clase que se acababa de cancelar. Es exactamente la trampa que
        // ya obligó a un flush en `ReservaService`, del otro lado.
        bloqueos.flush();

        BloqueoSala bloqueo = new BloqueoSala();
        bloqueo.setSala(salas.findById(solicitud.idSala())
                .orElseThrow(() -> new RecursoNoEncontradoException(
                        "No existe la sala " + solicitud.idSala() + ".")));
        bloqueo.setFechaInicio(solicitud.fechaInicio());
        bloqueo.setFechaFin(solicitud.fechaFin());
        bloqueo.setMotivo(solicitud.motivo().trim());

        // Sin horas es el día entero. Los dos valores son los DEFAULT de `V1`, y
        // se ponen acá porque JPA manda siempre las dos columnas: un INSERT de
        // Hibernate nunca deja que el DEFAULT de la base entre en juego.
        if (solicitud.horaInicio() != null) {
            bloqueo.setHoraInicio(solicitud.horaInicio());
        }
        if (solicitud.horaFin() != null) {
            bloqueo.setHoraFin(solicitud.horaFin());
        }

        bloqueo.setRegistradoPor(usuarios.findById(idAutor).orElse(null));

        BloqueoSala guardado = bloqueos.saveAndFlush(bloqueo);
        return BloqueoResumen.de(guardado, LocalDate.now());
    }

    /**
     * Desbloquear.
     *
     * <p>Es un DELETE de verdad, y es la excepción que confirma la regla: en este
     * esquema no se borra el historial de clases ni el dinero, pero un bloqueo no
     * es ninguna de las dos cosas — es una nota operativa sobre el futuro. `V6` y
     * `V7` prohibieron el borrado exactamente en las tablas donde importa y
     * dejaron esta afuera.
     */
    @Transactional
    public void eliminar(Long id) {
        if (!bloqueos.existsById(id)) {
            throw new RecursoNoEncontradoException("No existe el bloqueo " + id + ".");
        }
        bloqueos.deleteById(id);

        // La otra mitad de lo mismo, y la peor de las dos: Hibernate ordena los
        // DELETE AL FINAL, después de los INSERT. Desbloquear la sala y cargar
        // la clase que estaba esperando, en la misma transacción, insertaba la
        // reserva con el bloqueo todavía en la base y `reserva_respeta_bloqueos`
        // la rechazaba.
        bloqueos.flush();
    }
}
