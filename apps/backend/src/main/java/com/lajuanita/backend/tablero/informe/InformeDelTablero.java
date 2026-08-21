package com.lajuanita.backend.tablero.informe;

import java.util.ArrayList;
import java.util.List;

import com.lajuanita.backend.tablero.dto.Tablero;

/**
 * El tablero convertido en secciones tabulares, <b>una sola vez, para los dos
 * formatos</b>.
 *
 * <p>Esta clase es la decisión de diseño de la exportación entera. Lo natural
 * habría sido escribir un exportador a Excel y otro a PDF, cada uno recorriendo
 * el {@link Tablero}; y entonces habría <b>dos definiciones de qué contiene el
 * informe</b>. Se separarían: alguien agrega un indicador y lo pone en uno solo,
 * o cambia un título en uno y no en el otro, y nadie se entera hasta que dos
 * personas comparan sus archivos en una reunión. Es exactamente la deuda que
 * este proyecto ya paga dos veces —{@code contarClasesConsumidas} contra
 * {@code V9} §5, y {@code queRespaldanAlRelease} contra
 * {@code release_tiene_contrato()}— y las dos están anotadas como deuda.
 *
 * <p>Así que el contenido se decide acá y los formatos solo saben dibujar
 * {@link Hoja} y {@link Celda}. Agregar un indicador es tocar este archivo.
 *
 * <p><b>El "alcance" de cada hoja no es decorativo.</b> Dice si sus números son
 * del período o una foto de hoy, y viaja pegado al título porque una hoja de
 * Excel se copia sola a un mail: separada del archivo, pierde la cabecera de
 * trazabilidad y con ella la única aclaración que tenía.
 */
public final class InformeDelTablero {

    public static final String DEL_PERIODO = "del período";
    public static final String AL_DIA_DE_HOY = "al día de hoy";

    private static final String[] DIAS = { "Lunes", "Martes", "Miércoles", "Jueves", "Viernes",
            "Sábado", "Domingo" };

    private InformeDelTablero() {
    }

    /** Una sección del informe: un título, su alcance, sus columnas y sus filas. */
    public record Hoja(String titulo, String alcance, List<String> columnas, List<List<Celda>> filas) {
    }

    public static List<Hoja> hojas(Tablero tablero) {
        List<Hoja> hojas = new ArrayList<>();

        hojas.add(caja(tablero));
        hojas.add(ingresos(tablero));
        hojas.add(alumnos(tablero));
        hojas.add(ocupacion(tablero));
        hojas.add(pendientes(tablero));
        hojas.add(retencion(tablero));
        hojas.add(conversion(tablero));
        hojas.add(mixMastering(tablero));
        hojas.add(sello(tablero));

        return hojas;
    }

    private static Hoja caja(Tablero tablero) {
        List<List<Celda>> filas = tablero.caja().stream()
                .map(c -> List.<Celda>of(
                        new Celda.Texto(c.moneda()),
                        new Celda.Dinero(c.ingresos(), c.moneda()),
                        new Celda.Dinero(c.egresos(), c.moneda()),
                        new Celda.Dinero(c.neto(), c.moneda()),
                        new Celda.Dinero(c.adeudado(), c.moneda()),
                        new Celda.Cantidad(c.cantidadDePagos()),
                        new Celda.Cantidad(c.cantidadDeEgresos())))
                .toList();

        return new Hoja("Caja", DEL_PERIODO,
                List.of("Moneda", "Ingresos", "Egresos", "Neto", "Adeudado", "Cobros", "Egresos (cant.)"),
                filas);
    }

    private static Hoja ingresos(Tablero tablero) {
        List<List<Celda>> filas = tablero.ingresos().stream()
                .map(i -> List.<Celda>of(
                        new Celda.Texto(i.moneda()),
                        new Celda.Texto(nombreDeLinea(i.linea())),
                        new Celda.Dinero(i.monto(), i.moneda()),
                        new Celda.Cantidad(i.cantidad())))
                .toList();

        return new Hoja("Ingresos por línea", DEL_PERIODO,
                List.of("Moneda", "Línea de negocio", "Monto", "Cobros"), filas);
    }

    private static Hoja alumnos(Tablero tablero) {
        List<List<Celda>> filas = tablero.alumnos().stream()
                .map(a -> List.<Celda>of(
                        new Celda.Texto(a.disciplina()),
                        new Celda.Texto(a.nivel() == null || a.nivel().equals("SIN_NIVEL") ? "—" : a.nivel()),
                        new Celda.Cantidad(a.alumnos()),
                        new Celda.Cantidad(a.inscripciones())))
                .toList();

        return new Hoja("Alumnos cursando", AL_DIA_DE_HOY,
                List.of("Disciplina", "Nivel", "Alumnos", "Inscripciones"), filas);
    }

    /**
     * La ocupación va como una lista de casillas y no como la grilla dibujada.
     *
     * <p>Una grilla de días × horas se ve linda y no se puede filtrar ni ordenar
     * en Excel, que es para lo que alguien abre la planilla. Y las casillas en
     * cero van igual: es la misma regla de §11 —cero y no vacío— y acá pesa más,
     * porque una fila ausente en una planilla no se distingue de un filtro mal
     * puesto.
     */
    private static Hoja ocupacion(Tablero tablero) {
        List<List<Celda>> filas = tablero.ocupacion().franjas().stream()
                .map(f -> List.<Celda>of(
                        new Celda.Texto(DIAS[f.dia() - 1]),
                        new Celda.Texto("%02d:00".formatted(f.hora())),
                        new Celda.Cantidad(f.reservas()),
                        new Celda.Numero(f.horasReservadas(), "h")))
                .toList();

        return new Hoja("Ocupación", DEL_PERIODO,
                List.of("Día", "Franja", "Reservas que empiezan", "Horas reservadas"), filas);
    }

    private static Hoja pendientes(Tablero tablero) {
        List<List<Celda>> filas = tablero.pendientes().stream()
                .map(p -> List.<Celda>of(
                        new Celda.Texto(p.moneda()),
                        new Celda.Dinero(p.monto(), p.moneda()),
                        new Celda.Cantidad(p.cantidad()),
                        new Celda.Dinero(p.vencido(), p.moneda()),
                        new Celda.Cantidad(p.cantidadVencida())))
                .toList();

        return new Hoja("Cobros pendientes", AL_DIA_DE_HOY,
                List.of("Moneda", "Adeudado", "Renglones", "Vencido", "Renglones vencidos"), filas);
    }

    /**
     * La retención, con su denominador al lado del porcentaje.
     *
     * <p>El porcentaje solo no se puede defender en una reunión: 60% sobre diez
     * personas y 60% sobre doscientas son dos afirmaciones distintas. Y cuando no
     * hay a quién medir la celda va {@link Celda.SinDato}, nunca cero.
     */
    private static Hoja retencion(Tablero tablero) {
        Tablero.Retencion r = tablero.retencion();

        Celda tasa = r.tasa() == null
                ? new Celda.SinDato("nadie cumplió aún los 10 meses desde su primer servicio")
                : new Celda.Numero(r.tasa(), "%");

        return new Hoja("Retención", AL_DIA_DE_HOY,
                List.of("Tasa", "Contrataron un segundo servicio", "Con ventana de 10 meses cerrada"),
                List.of(List.of(tasa,
                        new Celda.Cantidad(r.retenidos()),
                        new Celda.Cantidad(r.conVentanaCerrada()))));
    }

    /**
     * La conversión, con su denominador al lado — mismo criterio que
     * {@link #retencion}: un porcentaje solo no se defiende en una reunión.
     */
    private static Hoja conversion(Tablero tablero) {
        Tablero.Conversion c = tablero.conversion();

        Celda tasa = c.tasa() == null
                ? new Celda.SinDato("nadie llegó todavía por un servicio suelto")
                : new Celda.Numero(c.tasa(), "%");

        return new Hoja("Conversión", AL_DIA_DE_HOY,
                List.of("Tasa", "Se convirtieron en alumnos", "Llegaron por un servicio suelto"),
                List.of(List.of(tasa,
                        new Celda.Cantidad(c.convertidos()),
                        new Celda.Cantidad(c.llegaronPorServicioSuelto()))));
    }

    private static Hoja mixMastering(Tablero tablero) {
        List<List<Celda>> filas = new ArrayList<>(tablero.mixMastering().porEstado().stream()
                .map(e -> List.<Celda>of(
                        new Celda.Texto(legible(e.estado())),
                        new Celda.Cantidad(e.cantidad()),
                        new Celda.Texto(AL_DIA_DE_HOY)))
                .toList());

        filas.add(List.of(new Celda.Texto("Entregados"),
                new Celda.Cantidad(tablero.mixMastering().entregadosEnElPeriodo()),
                new Celda.Texto(DEL_PERIODO)));
        filas.add(List.of(new Celda.Texto("Pasaron las revisiones incluidas"),
                new Celda.Cantidad(tablero.mixMastering().conRevisionesDeMas()),
                new Celda.Texto(AL_DIA_DE_HOY)));

        return new Hoja("Mix & Mastering", "mixto — ver la columna",
                List.of("Concepto", "Cantidad", "Alcance"), filas);
    }

    private static Hoja sello(Tablero tablero) {
        List<List<Celda>> filas = new ArrayList<>(tablero.sello().porEstado().stream()
                .map(e -> List.<Celda>of(
                        new Celda.Texto(legible(e.estado())),
                        new Celda.Cantidad(e.cantidad()),
                        new Celda.Texto(AL_DIA_DE_HOY)))
                .toList());

        filas.add(List.of(new Celda.Texto("Publicados"),
                new Celda.Cantidad(tablero.sello().publicadosEnElPeriodo()),
                new Celda.Texto(DEL_PERIODO)));
        // Una excepción firmada a una regla dura es de las pocas cosas que la
        // dirección necesita ver aunque valga cero. No se omite nunca.
        filas.add(List.of(new Celda.Texto("Publicados sin contrato (excepción firmada)"),
                new Celda.Cantidad(tablero.sello().publicadosSinContrato()),
                new Celda.Texto(AL_DIA_DE_HOY)));

        for (Tablero.Sello.Aparicion aparicion : tablero.sello().apariciones()) {
            filas.add(List.of(new Celda.Texto("Sonó en " + legible(aparicion.tipo())),
                    new Celda.Cantidad(aparicion.cantidad()),
                    new Celda.Texto(DEL_PERIODO)));
        }

        return new Hoja("Sello", "mixto — ver la columna",
                List.of("Concepto", "Cantidad", "Alcance"), filas);
    }

    // -------------------------------------------------------------------------

    /** `EN_DISTRIBUCION` → `En distribucion`. Los enums en mayúsculas gritan. */
    private static String legible(String enumerado) {
        String conEspacios = enumerado.replace('_', ' ').toLowerCase();
        return conEspacios.substring(0, 1).toUpperCase() + conEspacios.substring(1);
    }

    private static String nombreDeLinea(String linea) {
        return switch (linea) {
            case "CURSOS" -> "Cursos";
            case "ALQUILER_CABINA" -> "Alquiler de cabina";
            case "GRABACION_SET" -> "Grabación de set";
            case "MIX_MASTERING" -> "Mix & Mastering";
            case "VENTA_EQUIPOS" -> "Venta de equipos";
            default -> "Sin asignar";
        };
    }
}
