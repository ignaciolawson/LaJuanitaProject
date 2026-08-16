import type { Moneda } from '../api/tiposAdmin'

/**
 * Cómo se escribe la plata en pantalla.
 *
 * <p>Vive acá y no en cada pantalla por lo mismo que `NOMBRE_DE_DISCIPLINA`
 * (ARQ-06): cinco pantallas del Módulo 3 muestran importes y la sexta iba a
 * escribirlos distinto. Un listado que dice `$ 180.000,00` al lado de una caja
 * que dice `180000` se lee como dos sistemas.
 *
 * <p><b>El símbolo distingue las dos monedas y no se omite nunca.</b> §2.3 lleva
 * ARS y USD por separado justamente porque no son intercambiables; un importe
 * sin moneda en un estudio que cobra por PayPal es una cifra que no se puede
 * usar. `US$` y no `$` a secas para el dólar, que es como se escribe acá.
 */
export function importe(monto: number, moneda: Moneda): string {
  const numero = new Intl.NumberFormat('es-AR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(monto)

  return moneda === 'USD' ? `US$ ${numero}` : `$ ${numero}`
}

/**
 * Los días de una deuda, dichos como los diría una persona.
 *
 * <p>"Hace 1 días" es el detalle que hace que un sistema parezca hecho a las
 * apuradas, y esta cifra la va a leer Micaela todos los días.
 */
export function antiguedad(dias: number): string {
  if (dias <= 0) return 'hoy'
  if (dias === 1) return 'hace 1 día'
  return `hace ${dias} días`
}
