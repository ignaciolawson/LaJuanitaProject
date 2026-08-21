import { ApiError, cabeceraDeCredencial, pedir } from './cliente'
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

/**
 * Baja el tablero como archivo: `xlsx` o `pdf`.
 *
 * **Hereda los filtros de la pantalla**, que es lo que §15 pidió con esas
 * palabras: se exporta lo que estás mirando y no un volcado fijo que después hay
 * que recortar a mano en Excel.
 *
 * No pasa por `pedir` porque `pedir` interpreta JSON y esto es binario, y no
 * puede ser un `<a href>` porque el navegador no le agrega el `Authorization` a
 * una navegación común — el mismo motivo por el que el contrato del sello se
 * abre con `fetch`. La diferencia es que un contrato se abre en una pestaña y un
 * informe se baja: acá el ancla se crea, se dispara y se tira.
 *
 * El nombre del archivo lo pone el backend en el `Content-Disposition` y se lee
 * de ahí en vez de rearmarlo: rearmarlo sería una segunda definición de cómo se
 * llama el archivo, y la que se olvida de cambiar el día que cambie la otra.
 */
export async function descargarTablero(
  formato: 'xlsx' | 'pdf',
  opciones: { desde: string; hasta: string; idSala?: number },
): Promise<void> {
  const respuesta = await fetch(
    `/api/tablero/exportacion.${formato}${query({
      desde: opciones.desde,
      hasta: opciones.hasta,
      idSala: opciones.idSala,
    })}`,
    { headers: cabeceraDeCredencial() },
  )

  if (!respuesta.ok) {
    throw new ApiError(respuesta.status, 'No se pudo generar el archivo.')
  }

  const url = URL.createObjectURL(await respuesta.blob())
  const ancla = document.createElement('a')
  ancla.href = url
  ancla.download = nombreDelArchivo(respuesta) ?? `tablero.${formato}`
  ancla.click()

  // Revocar en el acto le corta la descarga al navegador, igual que le cortaba
  // la carga a la pestaña del contrato.
  setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function nombreDelArchivo(respuesta: Response): string | null {
  const cabecera = respuesta.headers.get('Content-Disposition')
  const nombre = cabecera?.match(/filename="?([^";]+)"?/)
  return nombre ? nombre[1] : null
}

function query(parametros: Record<string, string | number | undefined>): string {
  const partes = Object.entries(parametros)
    .filter(([, valor]) => valor !== undefined && valor !== '')
    .map(([clave, valor]) => `${clave}=${encodeURIComponent(String(valor))}`)

  return partes.length > 0 ? `?${partes.join('&')}` : ''
}
