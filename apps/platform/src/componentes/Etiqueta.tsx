import type { ReactNode } from 'react'

/**
 * La etiqueta de un estado — `ACTIVA`, `ANULADO`, `VENCIDO`, `PUBLICADO`.
 *
 * **Tres tonos, y ninguno es verde.** Es la misma disciplina que `index.css`
 * declara para toda la app —*"el rojo se usa como bisturí, no como relleno"*—
 * y el precedente ya estaba en `Semaforo`, que pinta "va bien" con la tinta
 * común y NO con un verde: en este sistema **estar bien es el default y no
 * necesita color**. Lo que necesita color es lo que pide que alguien haga
 * algo.
 *
 * Si todo estado tiene su color, el rojo del vencido deja de saltar, que es
 * exactamente lo único para lo que existe.
 *
 * Esa deriva existió: `ArtistasPagina` y `SelloPagina` usaban `bg-green-50` y
 * `bg-amber-50` —colores por defecto de Tailwind que nadie eligió—. Se corrigió
 * en la pasada de rediseño (Fase 3.1), y lo que apareció al hacerlo vale más que
 * los colores: **el ámbar caía sobre tres de los cinco estados de un release**,
 * dos de los cuales no le piden nada a nadie. No era un problema de paleta, era
 * el sistema diciendo "atención" cuatro veces por pantalla.
 */

type Tono =
  /** Lo normal. Un estado que no pide nada de nadie. */
  | 'neutra'
  /** Pide que alguien haga algo: vencido, sin contrato, requiere atención. */
  | 'atencion'
  /** Retirado de circulación: anulado, cancelado, inactivo, pausado. */
  | 'apagada'

const ESTILO: Record<Tono, string> = {
  neutra: 'border-linea text-tenue',
  atencion: 'border-red/40 text-acento',
  apagada: 'border-linea text-apagado',
}

export function Etiqueta({ tono = 'neutra', children }: { tono?: Tono; children: ReactNode }) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full border px-2 py-0.5 text-[11px] uppercase tracking-wide ${ESTILO[tono]}`}
    >
      {children}
    </span>
  )
}
