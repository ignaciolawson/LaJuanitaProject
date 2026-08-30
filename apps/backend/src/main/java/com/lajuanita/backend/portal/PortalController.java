package com.lajuanita.backend.portal;

import java.time.LocalDate;
import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import com.lajuanita.backend.config.Autoridades;
import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.dto.NotificacionResumen;
import com.lajuanita.backend.docencia.dto.MaterialResumen;
import com.lajuanita.backend.pago.ComprobanteService;
import com.lajuanita.backend.pago.dto.EstadoDeCuenta;
import com.lajuanita.backend.portal.dto.CatalogoParaPedir;
import com.lajuanita.backend.portal.dto.FranjaOcupada;
import com.lajuanita.backend.portal.dto.ProgresoDelCurso;
import com.lajuanita.backend.portal.dto.ReservaDelPortal;
import com.lajuanita.backend.solicitud.SolicitudReprogramacionService;
import com.lajuanita.backend.solicitud.SolicitudReservaService;
import com.lajuanita.backend.solicitud.dto.AltaReprogramacionRequest;
import com.lajuanita.backend.solicitud.dto.AltaSolicitudRequest;
import com.lajuanita.backend.solicitud.dto.ReprogramacionResumen;
import com.lajuanita.backend.solicitud.dto.SolicitudResumen;

import jakarta.validation.Valid;

/**
 * El portal: todo lo que alguien ve y hace <b>sobre lo suyo</b>.
 *
 * <p><b>La regla de este archivo, y es una sola:</b> ningún endpoint de acá
 * recibe una identidad. El id sale siempre de {@code Autoridades.idDe(quienPide)},
 * o sea del {@code sub} del token que Spring ya verificó. No hay
 * {@code /api/me/algo/{idUsuario}} ni un {@code idUsuario} en ningún cuerpo — si
 * alguna vez hace falta mirar lo de otro, eso es una pantalla de administración y
 * va con {@code @PuedeLeerAdministracion} a su propia ruta.
 *
 * <p>Por eso están todos juntos en un controller aunque toquen cinco tablas
 * distintas: lo que tienen en común no es el tema, es el alcance, y concentrarlo
 * hace que se pueda verificar leyendo un archivo.
 *
 * <p><b>Ninguno lleva anotación de rol, y es correcto.</b> Alcanza con estar
 * autenticado: son tus reservas, tus cursos, tu cuenta. Un {@code USUARIO} sin
 * ninguna relación ve listas vacías —que es lo que tiene— y eso no es un error:
 * tener cuenta y ser alumno son cosas distintas (P18), y las secciones de
 * servicios se muestran igual porque si se ocultaran hasta tener la primera fila,
 * nadie podría hacer su primera reserva nunca (§2.2).
 *
 * <p>El que todavía debe cambiar su contraseña <b>no llega hasta acá</b>: sus
 * autoridades son {@code ROLE_PASSWORD_PENDIENTE}, que solo abre {@code /api/me} y
 * {@code /api/me/password}.
 */
@RestController
@RequestMapping("/api/me")
public class PortalController {

    private final PortalService portal;
    private final SolicitudReservaService solicitudes;
    private final SolicitudReprogramacionService reprogramaciones;
    private final NotificacionService avisos;

    /**
     * <b>Se reusa el servicio de administración, y eso no afloja el eje de
     * identidad</b>: {@code ComprobanteService} tiene dos métodos distintos, uno que
     * filtra por pago y otro que filtra por dueño, y acá se llama al segundo. La
     * alternativa —una copia en {@code PortalService}— sería una segunda forma de
     * leer el mismo archivo, que es como se cuela la que se olvida del filtro.
     */
    private final ComprobanteService comprobantes;

    public PortalController(PortalService portal,
            SolicitudReservaService solicitudes,
            SolicitudReprogramacionService reprogramaciones,
            NotificacionService avisos,
            ComprobanteService comprobantes) {
        this.portal = portal;
        this.solicitudes = solicitudes;
        this.reprogramaciones = reprogramaciones;
        this.avisos = avisos;
        this.comprobantes = comprobantes;
    }

    // == Lo que tengo ========================================================

    /** Mis clases y mis cabinas del período. La pantalla abre en la semana. */
    @GetMapping("/reservas")
    public List<ReservaDelPortal> misReservas(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta,
            Authentication quienPide) {

        return portal.misReservas(Autoridades.idDe(quienPide), desde, hasta);
    }

    /** Mi progreso: nivel, clases tomadas y clases restantes de cada curso. */
    @GetMapping("/cursos")
    public List<ProgresoDelCurso> misCursos(Authentication quienPide) {
        return portal.misCursos(Autoridades.idDe(quienPide));
    }

    /** Mi estado de cuenta: lo que contraté, lo que pagué y lo que debo. */
    @GetMapping("/estado-de-cuenta")
    public EstadoDeCuenta miEstadoDeCuenta(Authentication quienPide) {
        return portal.miEstadoDeCuenta(Autoridades.idDe(quienPide));
    }

    /**
     * Bajar un comprobante <b>mío</b>.
     *
     * <p>Es la última pantalla que el Módulo 4 dejó anotada como pendiente:
     * <i>"la descarga de comprobantes necesita el {@code StorageService} de §2.4,
     * que todavía no existe"</i>. Existe desde el Módulo 7, y el respaldo es un
     * archivo de verdad desde `V21`.
     *
     * <p><b>El id del comprobante viaja, el del dueño no</b>: sale del {@code sub}
     * del token, como todo {@code /api/me/**}. Uno ajeno contesta "no existe" —
     * decir "no podés" le confirmaría a quien prueba ids que la fila está ahí.
     *
     * <p>No cuelga de {@code /pagos/{id}/...} como el de administración porque acá
     * no hace falta: el filtro no es el pago sino de quién es la plata, y pedir el
     * id del pago sería un dato de más en la URL que igual no decide nada.
     */
    @GetMapping("/comprobantes/{id}")
    public ResponseEntity<Resource> miComprobante(@PathVariable Long id,
            Authentication quienPide) {
        return comprobantes.miArchivo(id, Autoridades.idDe(quienPide)).comoRespuesta();
    }

    /**
     * Mis materiales de clase.
     *
     * <p>Sin tramo {@code /profesor}: acá miro como alumno, lo que me dieron. Lo
     * que yo subo, si además doy clases, está en
     * {@code /api/me/profesor/materiales} — ver {@code DocenciaController}.
     */
    @GetMapping("/materiales")
    public List<MaterialResumen> misMateriales(Authentication quienPide) {
        return portal.misMateriales(Autoridades.idDe(quienPide));
    }

    // == Pedir una sala ======================================================

    /**
     * Las salas y los usos que puedo pedir, para armar el formulario.
     *
     * <p>No es {@code /api/salas}: ese es el catálogo de administración. Ver
     * {@link CatalogoParaPedir}.
     */
    @GetMapping("/catalogo")
    public CatalogoParaPedir catalogo() {
        return portal.catalogoParaPedir();
    }

    /**
     * Qué franjas están tomadas, para poder elegir con algo a la vista.
     *
     * <p>Devuelve horarios sin dueño: ver {@link FranjaOcupada}. No es la agenda.
     */
    @GetMapping("/disponibilidad")
    public List<FranjaOcupada> disponibilidad(
            @RequestParam(required = false) Long idSala,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate desde,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate hasta) {

        return portal.disponibilidad(idSala, desde, hasta);
    }

    @GetMapping("/solicitudes")
    public List<SolicitudResumen> misSolicitudes(Authentication quienPide) {
        return solicitudes.mias(Autoridades.idDe(quienPide));
    }

    /**
     * Pedir una sala.
     *
     * <p><b>Esto no crea una reserva</b>, y no puede: sin plata en SENADO o PAGADO
     * detrás, `V10` la rechaza al COMMIT, y un {@code USUARIO} no tiene cómo poner
     * plata en el sistema. Crea el pedido; la reserva nace cuando administración lo
     * aprueba y carga la seña. Ver {@code SolicitudReserva}.
     */
    @PostMapping("/solicitudes")
    @ResponseStatus(HttpStatus.CREATED)
    public SolicitudResumen pedirSala(@Valid @RequestBody AltaSolicitudRequest pedido,
            Authentication quienPide) {

        return solicitudes.pedir(pedido, Autoridades.idDe(quienPide));
    }

    /** Arrepentirse, mientras nadie la haya resuelto todavía. */
    @PatchMapping("/solicitudes/{id}/cancelacion")
    public SolicitudResumen cancelarSolicitud(@PathVariable Long id, Authentication quienPide) {
        return solicitudes.cancelar(id, Autoridades.idDe(quienPide));
    }

    // == Mover una clase =====================================================

    /**
     * Lo que pedí mover, en todos los estados.
     *
     * <p>No tiene pantalla propia: la pantalla es <b>Mis reservas</b>, que cruza
     * esta lista por {@code idReserva} y muestra en cada clase si hay un pedido
     * esperando o qué contestaron. Un pedido de mover algo se entiende al lado de
     * la cosa que se quiere mover, no en una lista aparte.
     */
    @GetMapping("/reprogramaciones")
    public List<ReprogramacionResumen> misReprogramaciones(Authentication quienPide) {
        return reprogramaciones.mios(Autoridades.idDe(quienPide));
    }

    /**
     * "No puedo ese día".
     *
     * <p><b>Esto no mueve la clase</b>, igual que pedir una sala no crea la
     * reserva: la mueve administración al aprobar, eligiendo el horario nuevo — que
     * es lo que quien pide no puede saber (qué sala queda libre, de qué profesor
     * depende). Ver {@code SolicitudReprogramacion}.
     *
     * <p>Lo puede pedir el alumno <b>y el profesor de esa clase</b> (P9): es el
     * mismo endpoint, y lo que cambia es desde qué pantalla se entra.
     */
    @PostMapping("/reprogramaciones")
    @ResponseStatus(HttpStatus.CREATED)
    public ReprogramacionResumen pedirMoverLaClase(
            @Valid @RequestBody AltaReprogramacionRequest pedido,
            Authentication quienPide) {

        return reprogramaciones.pedir(pedido, Autoridades.idDe(quienPide));
    }

    // == Mis notificaciones ==================================================

    @GetMapping("/notificaciones")
    public List<NotificacionResumen> misNotificaciones(
            @RequestParam(defaultValue = "false") boolean soloNoLeidas,
            Authentication quienPide) {

        return avisos.mias(Autoridades.idDe(quienPide), soloNoLeidas);
    }

    /** El numerito de la campanita. */
    @GetMapping("/notificaciones/sin-leer")
    public long sinLeer(Authentication quienPide) {
        return avisos.sinLeer(Autoridades.idDe(quienPide));
    }

    @PatchMapping("/notificaciones/{id}/lectura")
    public NotificacionResumen marcarLeida(@PathVariable Long id, Authentication quienPide) {
        return avisos.marcarLeida(id, Autoridades.idDe(quienPide));
    }

    /** Marcar todas. Devuelve cuántas cambiaron. */
    @PatchMapping("/notificaciones/lectura")
    public int marcarTodasLeidas(Authentication quienPide) {
        return avisos.marcarTodasLeidas(Autoridades.idDe(quienPide));
    }
}
