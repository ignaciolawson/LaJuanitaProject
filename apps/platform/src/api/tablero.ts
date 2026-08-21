import { pedir } from './cliente'
import type { ResumenFinanciero, Tablero } from './tiposTablero'

/**
 * Módulo 8 — el tablero de dirección.
 *
 * **Dos funciones para dos endpoints distintos, y ninguna escribe.** El tablero
 * es de solo lectura por decisión de §11: cada indicador se abre en el módulo
 * donde ese dato se carga, así que no hace falta —ni conviene— un segundo lugar
 * desde donde modificarlo.
 *
 * Cuál de las dos llamar lo decide `puedeVerElTableroCompleto` en `menu.ts`.
 * **Esa función no autoriza nada**: el backend resuelve el rol contra la base en
 * cada pedido. Acá solo se evita pedir algo que va a volver 403.
 */

export function tableroCompleto(opciones: { desde: string; hasta: string; idSala?: number }) {
  return pedir<Tablero>(
    `/api/tablero${query({
      desde: opciones.desde,
      hasta: opciones.hasta,
      idSala: opciones.idSala,
    })}`,
  )
}

export function resumenFinanciero(desde: string, hasta: string) {
  return pedir<ResumenFinanciero>(`/api/tablero/resumen${query({ desde, hasta })}`)
}

function query(parametros: Record<string, string | number | undefined>): string {
  const partes = Object.entries(parametros)
    .filter(([, valor]) => valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`)

  return partes.length > 0 ? `?${partes.join('&')}` : ''
}
