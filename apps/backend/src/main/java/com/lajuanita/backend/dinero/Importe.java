package com.lajuanita.backend.dinero;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Deja todo importe con dos decimales antes de salir por la API.
 *
 * <p><b>Existe porque el mismo monto se serializaba distinto según de dónde
 * viniera.</b> Un pago recién creado devolvía {@code 90000} —el {@code BigDecimal}
 * que Jackson armó del JSON del pedido, con escala 0— y el mismo pago releído de
 * la base devolvía {@code 90000.00}, porque la columna es {@code NUMERIC(14,2)}.
 * Las sumas agregadas traían una tercera forma. Para el front eso son tres
 * formatos para la misma cosa, y quien escriba el formateo de moneda va a acertar
 * con uno y fallar con los otros dos.
 *
 * <p>Todas las columnas de plata del esquema son {@code NUMERIC(14,2)}, así que
 * dos decimales es lo que la base ya guarda: esto no redondea nada que importe,
 * solo hace explícita una escala que estaba variando por accidente.
 */
public final class Importe {

    /** Los centavos, que es lo que las columnas de plata guardan. */
    public static final int DECIMALES = 2;

    private Importe() {
    }

    public static BigDecimal normalizar(BigDecimal monto) {
        return monto == null ? null : monto.setScale(DECIMALES, RoundingMode.HALF_UP);
    }

    /**
     * Un importe para leer: {@code $ 45.000,00} o {@code US$ 300,00}. Es la forma
     * de {@code importe()} en el front (`componentes/dinero.ts`), y es la que va
     * en todo texto que arme el servidor. Antes cada aviso escribía
     * {@code "ARS 45000.00"}.
     */
    public static String legible(Moneda moneda, BigDecimal monto) {
        java.text.DecimalFormatSymbols simbolos = new java.text.DecimalFormatSymbols();
        simbolos.setGroupingSeparator('.');
        simbolos.setDecimalSeparator(',');
        String numero = new java.text.DecimalFormat("#,##0.00", simbolos).format(normalizarOCero(monto));
        return (moneda == Moneda.USD ? "US$ " : "$ ") + numero;
    }

    /** Para las sumas, donde "no hubo nada" tiene que salir como 0.00 y no como null. */
    public static BigDecimal normalizarOCero(BigDecimal monto) {
        return normalizar(monto == null ? BigDecimal.ZERO : monto);
    }
}
