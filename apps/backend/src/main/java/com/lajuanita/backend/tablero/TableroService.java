package com.lajuanita.backend.tablero;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.lajuanita.backend.dinero.Moneda;
import com.lajuanita.backend.inscripcion.Disciplina;
import com.lajuanita.backend.inscripcion.EstadoInscripcion;
import com.lajuanita.backend.mastering.EstadoTrabajo;
import com.lajuanita.backend.pago.EstadoPago;
import com.lajuanita.backend.pago.PagoService;
import com.lajuanita.backend.pago.dto.CajaDelPeriodo;
import com.lajuanita.backend.reserva.EstadoReserva;
import com.lajuanita.backend.sello.EstadoRelease;
import com.lajuanita.backend.tablero.dto.ResumenFinanciero;
import com.lajuanita.backend.tablero.dto.Tablero;
import com.lajuanita.backend.tablero.dto.Tablero.AlumnosPorServicio;
import com.lajuanita.backend.tablero.dto.Tablero.CobrosPendientes;
import com.lajuanita.backend.tablero.dto.Tablero.IngresosDeLinea;
import com.lajuanita.backend.tablero.dto.Tablero.MixMastering;
import com.lajuanita.backend.tablero.dto.Tablero.Ocupacion;
import com.lajuanita.backend.tablero.dto.Tablero.Periodo;
import com.lajuanita.backend.tablero.dto.Tablero.Retencion;
import com.lajuanita.backend.tablero.dto.Tablero.Sello;
import com.lajuanita.backend.usuario.SolicitudInvalidaException;

/**
 * El tablero de dirección (§11). <b>Solo lectura, de punta a punta.</b>
 *
 * <p>No hay un solo método que escriba, y no es una omisión que haya que
 * completar después: el tablero abre cada indicador en su módulo, así que
 * corregir un número se hace donde ese número se carga. Un tablero que además
 * edita es un segundo lugar donde se puede modificar lo mismo.
 *
 * <p><b>Lo único que este servicio agrega sobre las consultas es rellenar los
 * ceros</b>, y esa es su razón de ser. §11 pide que sin datos en el período se
 * muestre <i>cero y no vacío</i>, y una consulta agrupada devuelve solo las
 * categorías que tuvieron filas: un mes sin ventas no trae la línea de venta de
 * equipos, y la pantalla la dibujaría ausente. Ausente se lee como <i>el sistema
 * perdió el dato</i>. Así que las categorías las pone el enum —las disciplinas,
 * las monedas, las líneas, los estados— y la base solo llena las que tienen
 * algo.
 *
 * <p><b>La caja no se calcula acá.</b> Sale de {@link PagoService#caja}, que
 * existe desde el Módulo 3 y ya resuelve ingresos, egresos, neto y adeudado por
 * moneda. Repetir esa suma habría sido la tercera copia de una definición en
 * este proyecto, y la peor de las tres: dos pantallas mostrando totales
 * distintos del mismo mes.
 */
@Service
public class TableroService {

    /**
     * El período máximo, igual que la caja y el informe de uso: un año.
     *
     * <p>Lo que acota el pedido no es el tamaño de la respuesta —el tablero
     * devuelve unas decenas de filas para cualquier período— sino el trabajo que
     * la base hace para armarlo. Sin techo, un pedido de diez años barre todas
     * las tablas grandes del sistema a la vez.
     */
    public static final int MAXIMO_DE_DIAS_DEL_PERIODO = 366;

    /**
     * La franja de atención del estudio: 10 a 18 (§13, confirmado por el cliente).
     *
     * <p>La grilla de ocupación <b>siempre</b> cubre estas horas, haya o no
     * reservas, y se estira si alguna cae afuera. Sin este piso, un período
     * tranquilo devolvería una grilla de dos filas y la pantalla mostraría un
     * estudio que abre a las 15 — que es el tipo de conclusión equivocada que un
     * tablero tiene prohibido inducir.
     *
     * <p>La última franja dibujada es la de las 17, porque una reserva que empieza
     * a las 18 ya está fuera del horario. Se estira sola si existe.
     */
    /**
     * El cero de los importes, con la escala que usan las columnas de plata.
     *
     * <p>{@code BigDecimal.ZERO} pelado sale como {@code 0} en el JSON mientras
     * los importes con plata salen como {@code 5000.00}: el mismo campo con dos
     * formatos, y quien lo lea tiene que soportar los dos. Es chico y es la clase
     * de cosa que después obliga a un {@code if} en la pantalla.
     */
    private static final BigDecimal SIN_PLATA = BigDecimal.ZERO.setScale(2);

    public static final int HORA_DE_APERTURA = 10;
    public static final int HORA_DE_CIERRE = 18;

    private final TableroRepository tablero;
    private final PagoService pagos;

    public TableroService(TableroRepository tablero, PagoService pagos) {
        this.tablero = tablero;
        this.pagos = pagos;
    }

    /**
     * El tablero completo: {@code ADMIN} y {@code DIRECTIVO}.
     *
     * <p>Ocho indicadores en un solo viaje. Podrían ser ocho endpoints y sería
     * peor: la pantalla dibuja un tablero, no ocho paneles que llegan en momentos
     * distintos, y con ocho pedidos el período de cada uno podría diferir del de
     * los demás si alguien cambia el filtro a mitad de la carga.
     */
    @Transactional(readOnly = true)
    public Tablero completo(LocalDate desde, LocalDate hasta, Long idSala) {
        verificarPeriodo(desde, hasta);

        return new Tablero(
                new Periodo(desde, hasta, idSala),
                pagos.caja(desde, hasta),
                alumnosPorServicio(),
                ingresosPorLinea(desde, hasta),
                ocupacion(desde, hasta, idSala),
                cobrosPendientes(),
                retencion(),
                mixMastering(desde, hasta),
                sello(desde, hasta));
    }

    /**
     * El resumen financiero básico: lo que ve {@code STAFF}.
     *
     * <p>Es un método aparte y no {@code completo()} recortado. Ver
     * {@link ResumenFinanciero} para el razonamiento: ningún endpoint de este
     * sistema cambia de significado según quién lo llame.
     */
    @Transactional(readOnly = true)
    public ResumenFinanciero resumen(LocalDate desde, LocalDate hasta) {
        verificarPeriodo(desde, hasta);

        return new ResumenFinanciero(
                new Periodo(desde, hasta, null),
                pagos.caja(desde, hasta),
                cobrosPendientes());
    }

    // == Los indicadores ======================================================

    /**
     * Foto de hoy: quién está cursando qué.
     *
     * <p>Todas las disciplinas aparecen aunque no tengan a nadie — una academia
     * que este mes no tiene ningún alumno de producción necesita ver ese cero, no
     * una lista sin la fila. El nivel no se rellena de la misma forma: los niveles
     * que no existen no se inventan, porque una grilla de disciplina × nivel con
     * nueve casillas casi todas vacías esconde las tres que importan.
     */
    private List<AlumnosPorServicio> alumnosPorServicio() {
        List<String> vigentes = EstadoInscripcion.VIGENTES.stream().map(Enum::name).toList();

        List<AlumnosPorServicio> filas = new ArrayList<>();
        List<String> conDatos = new ArrayList<>();

        for (Object[] fila : tablero.alumnosPorServicio(vigentes)) {
            String disciplina = (String) fila[0];
            conDatos.add(disciplina);
            filas.add(new AlumnosPorServicio(
                    disciplina,
                    (String) fila[1],
                    ((Number) fila[2]).longValue(),
                    ((Number) fila[3]).longValue()));
        }

        for (Disciplina disciplina : Disciplina.values()) {
            if (!conDatos.contains(disciplina.name())) {
                filas.add(new AlumnosPorServicio(disciplina.name(), null, 0, 0));
            }
        }
        return filas;
    }

    /**
     * Del período: de dónde salió la plata que entró.
     *
     * <p>Las dos monedas × las seis líneas, siempre. §11 pide los ingresos "en ARS
     * y USD", así que la fila en dólares en cero es parte de la respuesta: dice
     * que este mes no entró nada del exterior, que es un dato y no un hueco.
     */
    private List<IngresosDeLinea> ingresosPorLinea(LocalDate desde, LocalDate hasta) {
        Map<String, Object[]> porClave = new HashMap<>();
        List<String> entraron = EstadoPago.ENTRARON.stream().map(Enum::name).toList();

        for (Object[] fila : tablero.ingresosPorLinea(desde, hasta, entraron)) {
            porClave.put(fila[0] + "|" + fila[1], fila);
        }

        List<IngresosDeLinea> filas = new ArrayList<>();
        for (Moneda moneda : Moneda.values()) {
            for (LineaDeNegocio linea : LineaDeNegocio.values()) {
                Object[] fila = porClave.get(moneda.name() + "|" + linea.name());
                filas.add(new IngresosDeLinea(
                        moneda.name(),
                        linea.name(),
                        fila == null ? SIN_PLATA : (BigDecimal) fila[2],
                        fila == null ? 0 : ((Number) fila[3]).longValue()));
            }
        }
        return filas;
    }

    /**
     * Del período: cuándo se llena el estudio.
     *
     * <p>La grilla se arma acá y viaja completa. Las horas que cubre son la franja
     * de atención más cualquier hora en que de verdad hubo algo — una clase a las
     * 20 tiene que verse, y un período sin nada igual dibuja el horario del
     * estudio en cero.
     */
    private Ocupacion ocupacion(LocalDate desde, LocalDate hasta, Long idSala) {
        List<String> ocupan = EstadoReserva.OCUPAN_LA_SALA.stream().map(Enum::name).toList();

        Map<String, Object[]> porCasilla = new HashMap<>();
        TreeSet<Integer> horas = new TreeSet<>();
        for (int hora = HORA_DE_APERTURA; hora < HORA_DE_CIERRE; hora++) {
            horas.add(hora);
        }

        for (Object[] fila : tablero.ocupacionPorFranja(desde, hasta, idSala, ocupan)) {
            int hora = ((Number) fila[1]).intValue();
            horas.add(hora);
            porCasilla.put(fila[0] + "|" + hora, fila);
        }

        List<Ocupacion.Franja> franjas = new ArrayList<>();
        for (int dia = 1; dia <= 7; dia++) {
            for (Integer hora : horas) {
                Object[] fila = porCasilla.get(dia + "|" + hora);
                franjas.add(new Ocupacion.Franja(
                        dia,
                        hora,
                        fila == null ? 0 : ((Number) fila[2]).longValue(),
                        fila == null ? SIN_PLATA : redondear(fila[3])));
            }
        }
        return new Ocupacion(List.copyOf(horas), franjas);
    }

    /** Foto de hoy: la plata que se anotó y no entró. Las dos monedas, siempre. */
    private List<CobrosPendientes> cobrosPendientes() {
        List<String> adeudados = EstadoPago.ADEUDADOS.stream().map(Enum::name).toList();

        Map<String, Object[]> porMoneda = new HashMap<>();
        for (Object[] fila : tablero.cobrosPendientes(adeudados)) {
            porMoneda.put((String) fila[0], fila);
        }

        List<CobrosPendientes> filas = new ArrayList<>();
        for (Moneda moneda : Moneda.values()) {
            Object[] fila = porMoneda.get(moneda.name());
            filas.add(new CobrosPendientes(
                    moneda.name(),
                    fila == null ? SIN_PLATA : (BigDecimal) fila[1],
                    fila == null ? 0 : ((Number) fila[2]).longValue(),
                    fila == null ? SIN_PLATA : (BigDecimal) fila[3],
                    fila == null ? 0 : ((Number) fila[4]).longValue()));
        }
        return filas;
    }

    /**
     * La tasa de retención (P26).
     *
     * <p><b>Con denominador cero la tasa es {@code null}, no cero.</b> Un 0% se
     * lee como "se fueron todos"; lo que pasa es que todavía no hay nadie cuya
     * ventana de 10 meses haya cerrado. Es la misma distinción que el semáforo del
     * Módulo 5 hace entre "va bien" y "sin marcar": un valor que nadie puso no es
     * un valor malo.
     */
    private Retencion retencion() {
        List<String> ocupan = EstadoReserva.OCUPAN_LA_SALA.stream().map(Enum::name).toList();

        Object[] fila = tablero.retencion(ocupan).get(0);
        long denominador = ((Number) fila[0]).longValue();
        long retenidos = ((Number) fila[1]).longValue();

        BigDecimal tasa = denominador == 0 ? null
                : BigDecimal.valueOf(retenidos)
                        .multiply(BigDecimal.valueOf(100))
                        .divide(BigDecimal.valueOf(denominador), 1, RoundingMode.HALF_UP);

        return new Retencion(denominador, retenidos, tasa);
    }

    /** Mix &amp; Mastering: los estados de hoy, las entregas del período. */
    private MixMastering mixMastering(LocalDate desde, LocalDate hasta) {
        Map<String, Long> porEstado = new LinkedHashMap<>();
        for (EstadoTrabajo estado : EstadoTrabajo.values()) {
            porEstado.put(estado.name(), 0L);
        }

        long entregados = 0;
        long revisionesDeMas = 0;
        for (Object[] fila : tablero.mixMastering(desde, hasta)) {
            porEstado.put((String) fila[0], ((Number) fila[1]).longValue());
            entregados += ((Number) fila[2]).longValue();
            revisionesDeMas += ((Number) fila[3]).longValue();
        }

        return new MixMastering(
                porEstado.entrySet().stream()
                        .map(e -> new MixMastering.PorEstado(e.getKey(), e.getValue())).toList(),
                entregados,
                revisionesDeMas);
    }

    /** El sello: los releases de hoy, lo publicado y lo que sonó en el período. */
    private Sello sello(LocalDate desde, LocalDate hasta) {
        Map<String, Long> porEstado = new LinkedHashMap<>();
        for (EstadoRelease estado : EstadoRelease.values()) {
            porEstado.put(estado.name(), 0L);
        }

        long publicados = 0;
        long sinContrato = 0;
        for (Object[] fila : tablero.sello(desde, hasta)) {
            porEstado.put((String) fila[0], ((Number) fila[1]).longValue());
            publicados += ((Number) fila[2]).longValue();
            sinContrato += ((Number) fila[3]).longValue();
        }

        List<Sello.Aparicion> apariciones = tablero.aparicionesDelSello(desde, hasta).stream()
                .map(fila -> new Sello.Aparicion((String) fila[0], ((Number) fila[1]).longValue()))
                .toList();

        return new Sello(
                porEstado.entrySet().stream()
                        .map(e -> new Sello.PorEstado(e.getKey(), e.getValue())).toList(),
                publicados,
                sinContrato,
                apariciones);
    }

    // -------------------------------------------------------------------------

    /**
     * Las horas llegan como {@code numeric} o como {@code double} según cómo el
     * driver resuelva la división del SQL. Misma conversión que el informe de uso
     * de salas, por la misma razón.
     */
    private BigDecimal redondear(Object valor) {
        BigDecimal horas = valor instanceof BigDecimal exacto
                ? exacto
                : BigDecimal.valueOf(((Number) valor).doubleValue());
        return horas.setScale(2, RoundingMode.HALF_UP);
    }

    private void verificarPeriodo(LocalDate desde, LocalDate hasta) {
        if (hasta.isBefore(desde)) {
            throw new SolicitudInvalidaException("La fecha de fin no puede ser anterior a la de inicio.");
        }
        if (ChronoUnit.DAYS.between(desde, hasta) > MAXIMO_DE_DIAS_DEL_PERIODO) {
            throw new SolicitudInvalidaException("El tablero se pide de a un año como máximo.");
        }
    }
}
