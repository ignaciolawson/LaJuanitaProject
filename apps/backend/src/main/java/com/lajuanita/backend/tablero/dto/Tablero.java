package com.lajuanita.backend.tablero.dto;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

import com.lajuanita.backend.pago.dto.CajaDelPeriodo;

/**
 * Módulo 8 — el tablero de dirección entero (§11).
 *
 * <p><b>Es de solo lectura y no tiene una sola operación de escritura.</b> Cada
 * indicador se abre en su módulo (drill-down), así que el tablero no necesita
 * poder modificar nada: si algo hay que corregir, se corrige donde vive.
 *
 * <p><b>La regla que atraviesa todo este DTO: sin datos en el período, cero y no
 * vacío.</b> Es la misma decisión que el informe de uso de salas tomó con una
 * sala sin uso, y la que la ficha del alumno tomó con sus bloques faltantes: una
 * fila ausente se lee como <i>el sistema perdió el dato</i>, y una en cero dice
 * lo que de verdad pasó. Por eso {@code TableroService} completa las listas con
 * las categorías que la base no devolvió — todas las disciplinas, las dos
 * monedas, las seis líneas de negocio, todos los estados— en vez de mandar lo
 * que vino.
 *
 * <p><b>Y una distinción que hay que sostener al agregar indicadores: no todos
 * son del período.</b> Los alumnos activos, los cobros pendientes, la retención
 * y la conversión son <i>fotos de hoy</i>; los ingresos, la ocupación, las
 * entregas y las publicaciones son <i>del período</i>. Cada record dice cuál es.
 * Mezclarlos bajo un mismo filtro es la forma más barata que tiene un tablero de
 * mentir sin que nada falle: una deuda de marzo desaparecería al mirar agosto.
 */
public record Tablero(

        /** Eco de los filtros con los que se pidió. La exportación lo usa de cabecera. */
        Periodo periodo,

        /**
         * La caja del período, por moneda.
         *
         * <p><b>Es el mismo DTO y la misma cuenta del Módulo 3</b>
         * ({@code PagoService.caja}), no una suma nueva. Dos pantallas mostrando
         * totales distintos del mismo mes es exactamente lo que este sistema vino
         * a terminar, y la única forma de garantizar que no pase es que el número
         * salga de un solo lugar.
         */
        List<CajaDelPeriodo> caja,

        /** Foto de hoy: quién está cursando qué. */
        List<AlumnosPorServicio> alumnos,

        /** Del período: de dónde salió la plata que entró. */
        List<IngresosDeLinea> ingresos,

        /** Del período: cuándo se llena el estudio. */
        Ocupacion ocupacion,

        /** Foto de hoy: la plata que se anotó y no entró. */
        List<CobrosPendientes> pendientes,

        /** Foto de hoy, sobre ventanas ya cerradas. */
        Retencion retencion,

        /** Foto de hoy: de quienes llegaron por un servicio suelto, cuántos son alumnos. */
        Conversion conversion,

        /** Estados de hoy, entregas del período. */
        MixMastering mixMastering,

        /** Estados de hoy, publicaciones y apariciones del período. */
        Sello sello) {

    /** El período elegido. Los indicadores "de hoy" no lo miran, y lo dicen. */
    public record Periodo(LocalDate desde, LocalDate hasta, Long idSala) {
    }

    /**
     * Cuántos alumnos hay en cada disciplina y nivel, <b>hoy</b>.
     *
     * <p>{@code alumnos} cuenta personas distintas y {@code inscripciones} cuenta
     * cursos: quien hace DJ y producción a la vez es un alumno en cada fila y dos
     * inscripciones en total. Los dos números están porque contestan preguntas
     * distintas —cuánta gente entra al estudio, y cuántos cursos hay que dictar— y
     * porque, si estuviera uno solo, alguien iba a sumarlos mal.
     */
    public record AlumnosPorServicio(
            String disciplina,
            String nivel,
            long alumnos,
            long inscripciones) {
    }

    /**
     * Lo que entró en el período, por moneda y línea de negocio.
     *
     * <p>Las monedas van separadas y no se suman: unificar exigiría elegir una
     * cotización, y el total no correspondería a ninguna caja que exista (§2.3).
     * Es la misma decisión que tomó la caja del Módulo 3 y el cobro de M&amp;M.
     */
    public record IngresosDeLinea(
            String moneda,
            String linea,
            BigDecimal monto,
            long cantidad) {
    }

    /**
     * La grilla de ocupación: día de la semana × franja horaria.
     *
     * <p><b>La grilla viene completa desde el backend, no la arma la pantalla.</b>
     * Así "cero y no vacío" es una regla que un test puede mirar, en vez de un
     * detalle de dibujo que se pierde el día que alguien rehaga la pantalla — y el
     * rediseño del front está agendado para el final del proyecto.
     *
     * @param horas las horas que cubre la grilla, de la más temprana a la más
     *              tarde. Incluye siempre la franja de atención del estudio y se
     *              estira si hubo reservas afuera de ella.
     */
    public record Ocupacion(List<Integer> horas, List<Franja> franjas) {

        /**
         * Una casilla de la grilla.
         *
         * @param dia      día ISO: lunes 1, domingo 7
         * @param hora     la hora en que <b>empiezan</b> esas reservas
         * @param reservas cuántas empiezan ahí
         * @param horasReservadas la duración total de esas reservas. <b>No es
         *                 "horas usadas en esta franja"</b>: una clase de 10:00 a
         *                 11:30 suma sus 1,5 h en la franja de las 10.
         */
        public record Franja(int dia, int hora, long reservas, BigDecimal horasReservadas) {
        }
    }

    /**
     * La deuda viva, por moneda. <b>Foto de hoy, no del período.</b>
     *
     * <p>{@code vencido} es el subconjunto que además pasó los 7 días (§6) — el
     * mismo hecho sobre el que el disparador de avisos escribe su alerta.
     */
    public record CobrosPendientes(
            String moneda,
            BigDecimal monto,
            long cantidad,
            BigDecimal vencido,
            long cantidadVencida) {
    }

    /**
     * La tasa de retención (P26, §15).
     *
     * <p><b>{@code tasa} es {@code null} cuando el denominador es cero, y eso es
     * deliberado.</b> Un 0% sobre nadie se lee como <i>se fueron todos</i>, que es
     * lo contrario de lo que pasa: todavía no hay nadie cuya ventana de 10 meses
     * haya cerrado. Es la misma distinción que el semáforo del Módulo 5 hace entre
     * "va bien" y "sin marcar" — un valor que nadie puso no es un valor malo.
     *
     * @param conVentanaCerrada el denominador: quienes contrataron su primer
     *                          servicio hace más de 10 meses
     * @param retenidos         de esos, los que contrataron un segundo dentro de
     *                          la ventana
     * @param tasa              porcentaje 0–100, o {@code null} si no hay a quién
     *                          medir
     */
    public record Retencion(long conVentanaCerrada, long retenidos, BigDecimal tasa) {
    }

    /**
     * De quienes llegaron al estudio por un servicio suelto —alquiler de
     * cabina, grabación de set, mix &amp; mastering o venta de equipos, sin
     * tener todavía ninguna inscripción—, cuántos se convirtieron después en
     * alumnos.
     *
     * <p><b>{@code tasa} es {@code null} cuando el denominador es cero</b>, con
     * el mismo razonamiento que {@link Retencion}: si nadie llegó todavía por
     * un servicio suelto, un 0% se leería como <i>ninguno convierte</i> cuando
     * lo cierto es que no hay a quién medir.
     *
     * <p><b>A diferencia de la retención, no hay ventana de tiempo.</b> Esa
     * ventana existe en la retención para que crecer el estudio no se leyera
     * como empeorar la tasa (§15); acá no aplica, porque no convertirse todavía
     * no es un "no" — es sencillamente parte del denominador.
     *
     * @param llegaronPorServicioSuelto el denominador: usuarios cuyo primer
     *                                  contacto pagado con el estudio fue uno de
     *                                  esos cuatro servicios
     * @param convertidos               de esos, los que después tienen alguna
     *                                  inscripción, sea cual sea su estado hoy
     * @param tasa                      porcentaje 0–100, o {@code null} si el
     *                                  denominador es cero
     */
    public record Conversion(long llegaronPorServicioSuelto, long convertidos, BigDecimal tasa) {
    }

    /**
     * Mix &amp; Mastering: los estados de hoy y las entregas del período.
     *
     * @param conRevisionesDeMas los trabajos que pasaron las revisiones incluidas.
     *                           Es el hecho que §9 pide alertar y que {@code V15}
     *                           tuvo que permitir que existiera — {@code V6} §3 lo
     *                           prohibía con un CHECK, y no se puede avisar de algo
     *                           que la base rechaza.
     */
    public record MixMastering(
            List<PorEstado> porEstado,
            long entregadosEnElPeriodo,
            long conRevisionesDeMas) {

        public record PorEstado(String estado, long cantidad) {
        }
    }

    /**
     * El sello: los releases de hoy, lo publicado en el período y dónde sonó.
     *
     * @param publicadosSinContrato las excepciones firmadas a la regla dura del
     *                              Módulo 7. Es el único número del tablero que
     *                              señala una regla salteada a propósito, y la
     *                              dirección es exactamente a quien le importa.
     * @param apariciones           "dónde sonó" (P25). <b>Puede venir vacío y no es
     *                              una falla</b>: quedó dicho al ratificarlo.
     */
    public record Sello(
            List<PorEstado> porEstado,
            long publicadosEnElPeriodo,
            long publicadosSinContrato,
            List<Aparicion> apariciones) {

        public record PorEstado(String estado, long cantidad) {
        }

        public record Aparicion(String tipo, long cantidad) {
        }
    }
}
