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
