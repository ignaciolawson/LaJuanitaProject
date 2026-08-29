package com.lajuanita.backend.aviso;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.aviso.dto.ResumenDeAvisos;
import com.lajuanita.backend.mastering.TrabajoMastering;
import com.lajuanita.backend.mastering.TrabajoMasteringRepository;
import com.lajuanita.backend.notificacion.NotificacionService;
import com.lajuanita.backend.notificacion.TipoNotificacion;
import com.lajuanita.backend.pago.PagoRepository;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.pago.dto.Deudor;
import com.lajuanita.backend.sello.Release;
import com.lajuanita.backend.sello.ReleaseRepository;
import com.lajuanita.backend.usuario.Rol;
import com.lajuanita.backend.usuario.Usuario;
import com.lajuanita.backend.usuario.UsuarioRepository;

/**
 * El disparador automático de avisos.
 *
 * <p><b>Tres módulos pidieron esta pieza por escrito y ninguno la construyó</b>,
 * cada uno anotando lo mismo: <i>"corre sin que nadie pida nada, necesita un
 * scheduler y necesita decidir qué pasa si corre dos veces el mismo día; es del
 * módulo que construya notificaciones automáticas"</i>. El Módulo 4 la dejó
 * anotada para la deuda a los 7 días (§6) y el Módulo 6 para la entrega impaga a
 * los 7 días (§9). Se construyó una vez, para los tres — <b>y el tercero, el aviso
 * previo al lanzamiento (§10), llegó después y costó una consulta y un bloque de
 * quince líneas.</b> Ese es el resultado de haberla hecho antes del Módulo 7 y no
 * adentro: el aviso terminó siendo una regla más y no infraestructura descubierta a
 * mitad de camino, que es lo que le pasó al `StorageService` dos módulos seguidos.
 *
 * <h2>Lo que decide, que es más que "mandar avisos"</h2>
 *
 * <p><b>1 · Los avisos van a administración, no a la persona involucrada.</b> Es
 * lo que dicen las dos reglas duras leídas de cerca: la deuda la persigue el
 * estudio, y la pantalla de deudores es administrativa. En M&amp;M no podría ser
 * de otra forma aunque se quisiera — la mitad de los clientes son externos sin
 * cuenta, y una notificación necesita un {@code usuario} destino.
 *
 * <p><b>2 · Le llega a quien puede hacer algo</b>, o sea {@code ADMIN} y
 * {@code STAFF}: los mismos de {@code @PuedeOperar}. {@code DIRECTIVO} ve todas
 * las pantallas y no escribe nada, así que un aviso de <i>"cobrale a este"</i> le
 * llegaría para no poder hacerlo.
 *
 * <p><b>3 · Un aviso por hecho, no uno por día.</b> Lo que la bandeja avisa es el
 * momento en que algo cruzó la línea; el estado permanente es lo que muestran
 * {@code /admin/deudores} y el tablero de M&amp;M, que están hechos para eso. Un
 * recordatorio diario de la misma deuda convierte la bandeja en ruido, y entonces
 * el aviso que sí importa pasa desapercibido. Y no es una puerta que se cierra:
 * si la deuda se salda y vuelve, la clave cambia y el aviso vuelve a salir — está
 * explicado en el encabezado de `V17`.
 *
 * <p><b>4 · Correrlo de más no hace nada.</b> Todo lo que hace es idempotente por
 * construcción y no por cuidado: el UPDATE solo toca {@code DEBE}, y los avisos van
 * contra un índice único. Eso es lo que hace
 * que la corrida manual sea segura de ofrecer.
 *
 * <h2>Lo que deliberadamente NO hace</h2>
 *
 * <p><b>No manda nada.</b> Sigue siendo la bandeja adentro del sistema que definió
 * el Módulo 4: no hay infraestructura de correo, no se planea, y el canal real del
 * estudio es WhatsApp, que está fuera del alcance inicial. Si algún día los avisos
 * tienen que <i>llegar</i>, el envío se cuelga de acá; lo que esta clase resuelve
 * —qué hecho, a quién, y una sola vez— haría falta igual.
 */
@Service
public class AvisoService {

    /**
     * Cuántos días antes avisa un lanzamiento (§10).
     *
     * <p>Coincide con {@code PagoService.DIAS_PARA_VENCER} y aun así es su propia
     * constante: que los tres avisos usen siete días hoy es una coincidencia del
     * negocio, no una regla compartida. Atarlos haría que cambiar el vencimiento de
     * una deuda moviera, sin que nadie lo pida, cuándo se avisa un lanzamiento.
     */
    public static final int DIAS_ANTES_DEL_LANZAMIENTO = 7;

    private final PagoRepository pagos;
    private final PagoService pagoService;
    private final TrabajoMasteringRepository trabajos;
    private final ReleaseRepository releases;
    private final UsuarioRepository usuarios;
    private final NotificacionService notificaciones;

    public AvisoService(PagoRepository pagos,
            PagoService pagoService,
            TrabajoMasteringRepository trabajos,
            ReleaseRepository releases,
            UsuarioRepository usuarios,
            NotificacionService notificaciones) {
        this.pagos = pagos;
        this.pagoService = pagoService;
        this.trabajos = trabajos;
        this.releases = releases;
        this.usuarios = usuarios;
        this.notificaciones = notificaciones;
    }

    /**
     * Una corrida completa.
     *
     * <p>Todo en una transacción: si algo falla no queda media bandeja escrita, y
     * la corrida siguiente rehace lo mismo desde cero. Se lo puede permitir porque
     * es idempotente — sin eso, reintentar sería duplicar.
     */
    @Transactional
    public ResumenDeAvisos generar() {
        LocalDate hoy = LocalDate.now();
        LocalDate limite = hoy.minusDays(PagoService.DIAS_PARA_VENCER);

        // Primero se escribe el estado, después se avisa. Al revés, un aviso
        // podría hablar de una deuda que la corrida todavía no marcó vencida.
        int vencidos = pagos.marcarVencidos(limite);

        List<Aviso> pendientes = new ArrayList<>();
        int deudas = agregarDeudasVencidas(pendientes, hoy);
        int entregas = agregarEntregasImpagas(pendientes, limite, hoy);
        int lanzamientos = agregarLanzamientosProximos(pendientes, hoy);

        int[] escritos = escribir(pendientes);

        return new ResumenDeAvisos(hoy, vencidos, deudas, entregas, lanzamientos,
                escritos[0], escritos[1]);
    }

    // == Las tres reglas =====================================================

    /**
     * §6 — <i>"alerta automática si alguien lleva más de 7 días en estado 'debe'"</i>.
     *
     * <p><b>Lee la misma lista que la pantalla de deudores</b>, con su mismo
     * cálculo de antigüedad y su misma bandera {@code vencido}, en vez de escribir
     * una segunda consulta de "quién debe". Es la regla que este proyecto ya tiene
     * escrita para los conjuntos de estados —<i>cuando el conjunto ya tiene nombre,
     * usá el nombre</i>— aplicada a una definición entera: el día que cambie qué
     * cuenta como deuda, la pantalla y el aviso cambian juntos porque son la misma
     * consulta. Separarlas es cómo {@code contarClasesConsumidas} terminó pudiendo
     * contradecir a `V9` §5.
     */
    private int agregarDeudasVencidas(List<Aviso> pendientes, LocalDate hoy) {
        List<Deudor> vencidos = pagoService.deudores().stream().filter(Deudor::vencido).toList();

        for (Deudor deudor : vencidos) {
            // Desde `V19` un deudor puede no tener cuenta, y entonces `apellido` es
            // null: sin esto el aviso decía "Juan null debe...".
            String quien = deudor.apellido() == null
                    ? deudor.nombre()
                    : deudor.nombre() + " " + deudor.apellido();
            long cuantos = deudor.cantidadDePagos();

            // ⚠️ **La clave describe el HECHO, y sin cuenta el hecho se identifica
            // por el nombre.** Con `u=%d` sobre un id nulo, todos los deudores sin
            // cuenta compartían la clave `u=null` y el índice parcial de `V17`
            // dejaba pasar **un solo aviso para todos**: el segundo deudor externo
            // no se avisaba nunca y nadie se enteraba, porque el primero sí llegó.
            String clave = deudor.idUsuario() != null
                    ? "DEUDA:u=%d:%s:desde=%s".formatted(
                            deudor.idUsuario(), deudor.moneda(), deudor.desde())
                    : "DEUDA:ext=%s:%s:desde=%s".formatted(
                            quien, deudor.moneda(), deudor.desde());

            pendientes.add(new Aviso(
                    TipoNotificacion.DEUDA_VENCIDA,
                    clave,
                    "Deuda vencida: " + quien,
                    "%s debe %s %s desde hace %d días (%d %s). El aviso salta a los %d."
                            .formatted(quien, deudor.moneda(), plata(deudor.adeudado()),
                                    deudor.diasDeAtraso(), cuantos,
                                    cuantos == 1 ? "pago pendiente" : "pagos pendientes",
                                    PagoService.DIAS_PARA_VENCER),
                    // Sin cuenta no hay estado de cuenta al que llevar: el aviso
                    // manda a la pantalla de deudores, donde la fila sí está. Un
                    // link a `/estado-de-cuenta/null` es peor que uno más general.
                    deudor.idUsuario() != null
                            ? "/admin/estado-de-cuenta/" + deudor.idUsuario()
                            : "/admin/deudores"));
        }
        return vencidos.size();
    }

    /**
     * §9 — <i>"alerta si pasan más de 7 días desde la entrega sin pago"</i>.
     *
     * <p>Es el <i>"básicamente estoy fiando el servicio"</i> de Ghezz visto desde el
     * otro lado: mientras el premaster está retenido la regla se sostiene sola, y
     * desde que se libera lo único que queda es acordarse de cobrar.
     */
    private int agregarEntregasImpagas(List<Aviso> pendientes, LocalDate limite, LocalDate hoy) {
        List<TrabajoMastering> impagos = trabajos.entregadosSinCobrarAntesDe(limite);

        for (TrabajoMastering trabajo : impagos) {
            long dias = ChronoUnit.DAYS.between(trabajo.getFechaEntregaReal(), hoy);
            String precio = trabajo.getPrecioAcordado() == null
                    ? "sin precio acordado"
                    : trabajo.getMoneda().name() + " " + plata(trabajo.getPrecioAcordado());

            pendientes.add(new Aviso(
                    TipoNotificacion.ENTREGA_IMPAGA,
                    "ENTREGA_IMPAGA:t=%d:entrega=%s".formatted(
                            trabajo.getId(), trabajo.getFechaEntregaReal()),
                    "Entregado sin cobrar: " + trabajo.getNombreTrack(),
                    "\"%s\" (%s) se entregó hace %d días y sigue sin cobrarse — %s."
                            .formatted(trabajo.getNombreTrack(), nombreDelCliente(trabajo),
                                    dias, precio),
                    "/admin/mix-mastering"));
        }
        return impagos.size();
    }

    /**
     * §10 — <i>"alertas 7 días antes de la fecha de lanzamiento"</i>.
     *
     * <p><b>Es el aviso que estrenó esta máquina en vez de pedirla.</b> Los otros dos
     * venían anotados por escrito desde los Módulos 4 y 6 con la misma frase —<i>"es
     * del módulo que construya notificaciones automáticas"</i>— y ninguno existía.
     * Este llegó cuando el disparador ya estaba: costó una consulta y este bloque.
     * Ese era el argumento para construirla antes del Módulo 7 y no adentro.
     *
     * <p>Mira {@code fechaEstimada} y no {@code fechaReal}: el aviso existe para
     * llegar <b>antes</b>, y la fecha real recién existe cuando ya salió. Un release
     * todavía en {@code A_CONFIRMAR} a siete días entra, y es justamente el que más
     * conviene mirar — el aviso sirve para preguntarse si llega, no para celebrar
     * uno que ya está listo.
     */
    private int agregarLanzamientosProximos(List<Aviso> pendientes, LocalDate hoy) {
        List<Release> proximos = releases.queSalenEntre(hoy, hoy.plusDays(DIAS_ANTES_DEL_LANZAMIENTO));

        for (Release release : proximos) {
            long dias = ChronoUnit.DAYS.between(hoy, release.getFechaEstimada());

            pendientes.add(new Aviso(
                    TipoNotificacion.RELEASE_PROXIMO,
                    "RELEASE_PROXIMO:r=%d:fecha=%s".formatted(
                            release.getId(), release.getFechaEstimada()),
                    "Sale en %s: %s".formatted(
                            dias == 0 ? "el dia" : dias == 1 ? "1 dia" : dias + " dias",
                            release.getCodigoRelease()),
                    "%s — \"%s\" de %s sale el %s y esta en %s."
                            .formatted(release.getCodigoRelease(), release.getNombreRelease(),
                                    release.getArtista().getNombreArtistico(),
                                    release.getFechaEstimada(), release.getEstado()),
                    "/admin/sello"));
        }
        return proximos.size();
    }

    // == La escritura ========================================================

    /**
     * Escribir lo que falte, a cada persona de administración.
     *
     * <p>Una sola consulta para saber qué ya está, en vez de una por aviso: una
     * corrida normal del segundo día tiene todo repetido, y preguntar de a uno son
     * tantas consultas como deudas haya.
     *
     * <p><b>Filtrar acá no es lo que garantiza que no se duplique</b> — eso es el
     * índice único de `V17`. Entre esta consulta y el insert se puede meter otra
     * corrida, que es el mismo agujero exacto que tenía el chequeo de email
     * duplicado en {@code UsuarioService} y que solo cerró el índice de la base. Si
     * llega a pasar, la corrida entera falla y la siguiente la rehace: es
     * idempotente, así que reintentar es gratis.
     *
     * @return {@code [escritos, omitidos]}
     */
    private int[] escribir(List<Aviso> pendientes) {
        if (pendientes.isEmpty()) {
            return new int[] { 0, 0 };
        }

        List<Usuario> destinatarios = usuarios.activosConRol(List.of(Rol.ADMIN, Rol.STAFF));
        if (destinatarios.isEmpty()) {
            return new int[] { 0, 0 };
        }

        Set<String> claves = new LinkedHashSet<>(pendientes.stream().map(Aviso::clave).toList());
        Set<String> yaEstan = notificaciones.yaAvisados(claves);

        int escritos = 0;
        int omitidos = 0;
        for (Aviso aviso : pendientes) {
            for (Usuario destino : destinatarios) {
                if (yaEstan.contains(destino.getId() + NotificacionService.SEPARADOR + aviso.clave())) {
                    omitidos++;
                    continue;
                }
                notificaciones.avisar(destino, aviso.tipo(), aviso.titulo(),
                        aviso.contenido(), aviso.url(), aviso.clave());
                escritos++;
            }
        }
        return new int[] { escritos, omitidos };
    }

    // == Auxiliares ==========================================================

    /**
     * El cliente puede no tener cuenta: es la misma asimetría que la venta de
     * equipos y que el cobro de M&amp;M. Un aviso que dijera "null" sería peor que
     * uno que admite no saber el nombre.
     */
    private String nombreDelCliente(TrabajoMastering trabajo) {
        if (trabajo.getCliente() != null) {
            return trabajo.getCliente().getNombre() + " " + trabajo.getCliente().getApellido();
        }
        return trabajo.getNombreClienteExterno() != null
                ? trabajo.getNombreClienteExterno()
                : "cliente sin identificar";
    }

    private String plata(BigDecimal monto) {
        return monto.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }

    /** Un aviso ya redactado, antes de saber a quién le va. */
    private record Aviso(TipoNotificacion tipo, String clave, String titulo,
            String contenido, String url) {
    }
}
