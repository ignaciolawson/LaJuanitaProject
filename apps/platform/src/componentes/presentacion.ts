import type { Disciplina } from '../api/tiposAdmin'

/**
 * Cómo se escriben en pantalla las cosas que viajan como enum.
 *
 * Vive acá y no en cada página por lo mismo que `Pagina.acotarTamanio` y
 * `Autoridades.esAdmin` del backend (ARQ-06): estaba copiado en dos pantallas y
 * la tercera era la que iba a escribirlo distinto. "Producción" con acento y
 * "Produccion" sin él, en dos listados que se miran uno al lado del otro, se lee
 * como que son dos cosas.
 */
export const NOMBRE_DE_DISCIPLINA: Record<Disciplina, string> = {
  DJ: 'DJ',
  PRODUCCION: 'Producción',
  MENTORIA: 'Mentoría',
}

/**
 * `ACTIVA` → `Activa`.
 *
 * Los enums viajan en mayúsculas porque así están en la base; mostrarlos tal
 * cual grita.
 */
export function capitalizar(texto: string): string {
  return texto.charAt(0) + texto.slice(1).toLowerCase()
}

/**
 * `2026-08-19T14:33:12Z` → `19/08 14:33`.
 *
 * Sin año, porque se usa para cosas recientes —una notificación, una nota de
 * clase— y el año ahí es ruido. Vive acá por lo mismo que
 * `NOMBRE_DE_DISCIPLINA`: estaba escrito dentro de `NotificacionesPagina` y la
 * ficha del alumno era la segunda pantalla que lo necesitaba.
 */
export function cuando(iso: string): string {
  const [fecha, resto] = iso.split('T')
  const [, mes, dia] = fecha.split('-')
  return `${dia}/${mes} ${resto?.slice(0, 5) ?? ''}`.trim()
}
