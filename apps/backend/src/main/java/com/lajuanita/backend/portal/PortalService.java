package com.lajuanita.backend.portal;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.inscripcion.Inscripcion;
import com.lajuanita.backend.inscripcion.InscripcionRepository;
import com.lajuanita.backend.inscripcion.InscripcionService;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.pago.dto.EstadoDeCuenta;
import com.lajuanita.backend.portal.dto.CatalogoParaPedir;
import com.lajuanita.backend.portal.dto.FranjaOcupada;
import com.lajuanita.backend.portal.dto.ProgresoDelCurso;
import com.lajuanita.backend.portal.dto.ReservaDelPortal;
import com.lajuanita.backend.reserva.EstadoAsistencia;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.reserva.Reserva;
import com.lajuanita.backend.reserva.ReservaParticipante;
import com.lajuanita.backend.reserva.ReservaParticipanteRepository;
import com.lajuanita.backend.reserva.ReservaRepository;
import com.lajuanita.backend.sala.BloqueoSala;
import com.lajuanita.backend.sala.BloqueoSalaRepository;
import com.lajuanita.backend.sala.SalaService;
import com.lajuanita.backend.sala.dto.TipoUsoResumen;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;

/**
 * Todo lo que una persona ve <b>de lo suyo</b>.
 *
 * <p><b>Este service no tiene ninguna consulta que pueda devolver lo de otro.</b>
 * Es la forma que toma acá el segundo eje de permisos del sistema: los endpoints
 * de administración se autorizan por rol —quién puede mirar la pantalla— y el
 * portal se acota por identidad —qué filas son tuyas—. No hay una anotación que
 * lo exprese, y no la hay porque no puede haberla: un alcance por identidad no es
 * un permiso que se concede, es un {@code WHERE} que no se puede omitir. Por eso
 * el id entra como parámetro en todos los métodos y sale del token en el
 * controller, nunca de la URL ni del cuerpo.
 *
 * <p>Lo que devuelve son <b>proyecciones propias</b> y no los DTO de
 * administración recortados, salvo el estado de cuenta — que es el mismo hecho
 * mirado por su dueño. Ver {@link ReservaDelPortal} y {@link ProgresoDelCurso}
 * para qué queda afuera y por qué.
 */
@Service
public class PortalService {

    /**
     * Ventana máxima de las dos consultas por rango.
     *
     * <p>Mismo techo que la agenda de administración, y por el mismo motivo: lo
     * que acota la respuesta no es una página sino el rango de fechas.
     */
    public static final int MAXIMO_DE_DIAS = 62;

    private final ReservaRepository reservas;
    private final ReservaParticipanteRepository participantes;
    private final InscripcionRepository inscripciones;
    private final InscripcionService cursos;
    private final PagoService pagos;
    private final BloqueoSalaRepository bloqueos;
    private final SalaService catalogo;

    public PortalService(ReservaRepository reservas,
            ReservaParticipanteRepository participantes,
            InscripcionRepository inscripciones,
            InscripcionService cursos,
            PagoService pagos,
            BloqueoSalaRepository bloqueos,
            SalaService catalogo) {
        this.reservas = reservas;
        this.participantes = participantes;
        this.inscripciones = inscripciones;
        this.cursos = cursos;
        this.pagos = pagos;
        this.bloqueos = bloqueos;
        this.catalogo = catalogo;
    }

    /**
     * Con qué se arma el formulario de pedido. Ver {@link CatalogoParaPedir}.
     *
     * <p>Solo salas activas: ofrecer una sala fuera de servicio es un pedido que
     * nace para ser rechazado —`V9` no deja reservar en una sala inactiva— y es el
     * mismo criterio con el que el selector de profesores ofrece solo a los que
     * siguen dando clase.
     */
    @Transactional(readOnly = true)
    public CatalogoParaPedir catalogoParaPedir() {
        return new CatalogoParaPedir(
                catalogo.listarSalas(false),
                catalogo.listarTiposDeUso(false).stream()
                        .filter(TipoUsoResumen::solicitablePorUsuario)
                        .toList());
    }

    /**
     * Mis clases y mis cabinas en un rango.
     *
     * <p>Dos consultas y no una: la lista sale de {@code deLaPersona} —que ya
     * define qué es "mía"— y la asistencia se le pega encima. No se puede pedir en
     * el mismo {@code JOIN} porque una reserva pagada sin estar anotado no tiene
     * participación, y un {@code JOIN} la perdería.
     */
    @Transactional(readOnly = true)
    public List<ReservaDelPortal> misReservas(Long idUsuario, LocalDate desde, LocalDate hasta) {
        verificarRango(desde, hasta);

        Map<Long, EstadoAsistencia> miAsistencia = new HashMap<>();
        for (ReservaParticipante p : participantes.deLaPersona(idUsuario, desde, hasta)) {
            miAsistencia.put(p.getReserva().getId(), p.getEstadoAsistencia());
        }

        return reservas.deLaPersona(idUsuario, desde, hasta,
                EstadoAsistencia.CANCELADA, EstadoPago.ENTRARON).stream()
                .map(r -> ReservaDelPortal.de(r, miAsistencia.get(r.getId())))
                .toList();
    }

    /**
     * Mi progreso: en qué nivel estoy y cuántas clases me quedan.
     *
     * <p>Devuelve lista vacía para quien no cursa nada, y eso es correcto: tener
     * cuenta y ser alumno son cosas distintas (P18). Quien alquila una cabina no
     * tiene progreso, no le falta.
     */
    @Transactional(readOnly = true)
    public List<ProgresoDelCurso> misCursos(Long idUsuario) {
        List<Inscripcion> mias = inscripciones.deLaPersona(idUsuario);
        Map<Long, Integer> consumidas = cursos.clasesConsumidas(mias);

        return mias.stream()
                .map(i -> ProgresoDelCurso.de(i, consumidas.getOrDefault(i.getId(), 0)))
                .toList();
    }

    /**
     * Mi estado de cuenta.
     *
     * <p><b>Es el mismo DTO que ve administración</b>, y acá sí corresponde: son
     * los pagos de esta persona, sus contratos y su saldo. No hay nada adentro que
     * su dueño no pueda ver — y armar una versión recortada habría significado dos
     * cuentas del mismo saldo, que es la forma más fácil de que un día no
     * coincidan.
     */
    @Transactional(readOnly = true)
    public EstadoDeCuenta miEstadoDeCuenta(Long idUsuario) {
        return pagos.estadoDeCuenta(idUsuario);
    }

    /**
     * Cuándo NO se puede pedir una sala.
     *
     * <p>Existe para que pedir una cabina no sea pedir a ciegas, y devuelve
     * <b>franjas sin dueño</b>: la agenda de administración dice quién tiene clase
     * con quién, que es información de los demás alumnos. Ver {@link FranjaOcupada}.
     *
     * <p><b>Un bloqueo se expande día por día</b>, y esa es la parte fácil de
     * hacer mal: {@code bloqueo_sala} guarda dos fechas y dos horas, y eso es una
     * franja horaria que se repite todos los días del rango — no un intervalo
     * continuo. `V6` lo leyó al revés y `V7` tuvo que deshacerlo. Acá, leído mal,
     * se dibujaría una sola franja gigante o una sola en el primer día.
     */
    @Transactional(readOnly = true)
    public List<FranjaOcupada> disponibilidad(Long idSala, LocalDate desde, LocalDate hasta) {
        verificarRango(desde, hasta);

        List<FranjaOcupada> ocupado = new ArrayList<>();

        for (Reserva r : reservas.agenda(desde, hasta, idSala, null, false, EstadoReserva.OCUPAN_LA_SALA)) {
            ocupado.add(new FranjaOcupada(r.getFecha(), r.getHoraInicio(), r.getHoraFin(),
                    FranjaOcupada.Motivo.RESERVADA));
        }

        for (BloqueoSala bloqueo : bloqueos.desde(desde, idSala)) {
            if (bloqueo.getFechaInicio().isAfter(hasta)) {
                continue;
            }
            LocalDate dia = bloqueo.getFechaInicio().isBefore(desde) ? desde : bloqueo.getFechaInicio();
            LocalDate ultimo = bloqueo.getFechaFin().isAfter(hasta) ? hasta : bloqueo.getFechaFin();

            while (!dia.isAfter(ultimo)) {
                ocupado.add(new FranjaOcupada(dia, bloqueo.getHoraInicio(), bloqueo.getHoraFin(),
                        FranjaOcupada.Motivo.BLOQUEADA));
                dia = dia.plusDays(1);
            }
        }

        return ocupado.stream()
                .sorted(Comparator.comparing(FranjaOcupada::fecha)
                        .thenComparing(FranjaOcupada::horaInicio))
                .toList();
    }

    // -------------------------------------------------------------------------

    private void verificarRango(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw new SolicitudInvalidaException("La fecha de fin no puede ser anterior a la de inicio.");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) >= MAXIMO_DE_DIAS) {
            throw new SolicitudInvalidaException(
                    "Se pide de a " + MAXIMO_DE_DIAS + " días como máximo.");
        }
    }
}
