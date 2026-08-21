/**
 * Primitivas de gráficos del tablero de dirección, en SVG plano y sin
 * dependencia externa — misma decisión que ya tomó la grilla de ocupación
 * (`TableroPagina.tsx`), que dibuja su propio mapa de calor con una tabla y
 * `rgba()` en vez de traer una librería para una sola pantalla.
 *
 * **La paleta es monocromática a propósito.** `index.css` lo dice: "el rojo
 * se usa como bisturí, no como relleno [...] si empieza a aparecer en todos
 * lados, deja de señalar nada". Repartir seis colores entre las líneas de
 * negocio convertiría al rojo en el color de "venta de equipos" tanto como
 * en el de una deuda vencida, y ese es justo el significado que no se puede
 * diluir. Así que las series usan una rampa de opacidad sobre `--ink`, y el
 * rojo queda libre para cuando un número necesite señalar un problema — como
 * ya hacen `text-red` en "vencidos" y "sin contrato" en esta misma pantalla.
 */

/** La rampa de grises sobre `--ink` (`#0a0a0b`), de más oscuro a más claro. */
const RAMPA_INK = [
  'rgba(10, 10, 11, 0.82)',
  'rgba(10, 10, 11, 0.62)',
  'rgba(10, 10, 11, 0.46)',
  'rgba(10, 10, 11, 0.32)',
  'rgba(10, 10, 11, 0.2)',
  'rgba(10, 10, 11, 0.12)',
]

export function colorDeSerie(indice: number): string {
  return RAMPA_INK[indice % RAMPA_INK.length]
}

export type Segmento = {
  etiqueta: string
  valor: number
  /** Ya formateado para mostrar — la plata y las cantidades se formatean distinto. */
  textoValor: string
  color?: string
}

/**
 * Un gráfico de torta (dona) con su leyenda, para una proporción entre pocas
 * categorías — "de dónde salió la plata" es el caso que lo pidió.
 *
 * **Sin datos dibuja el anillo vacío y lo dice, no lo esconde**: es la misma
 * regla de "cero y no vacío" que ya sostiene el resto del tablero — un mes en
 * cero es un dato, no un hueco.
 */
export function Dona({ segmentos, tamaño = 128 }: { segmentos: Segmento[]; tamaño?: number }) {
  const total = segmentos.reduce((suma, s) => suma + Math.max(0, s.valor), 0)
  const grosor = tamaño * 0.16
  const radio = (tamaño - grosor) / 2
  const circunferencia = 2 * Math.PI * radio

  let acumulado = 0

  return (
    <div className="flex items-center gap-4">
      <svg width={tamaño} height={tamaño} viewBox={`0 0 ${tamaño} ${tamaño}`} className="shrink-0">
        <g transform={`rotate(-90 ${tamaño / 2} ${tamaño / 2})`}>
          {total === 0 ? (
            <circle
              cx={tamaño / 2}
              cy={tamaño / 2}
              r={radio}
              fill="none"
              stroke="var(--color-papel)"
              strokeWidth={grosor}
            />
          ) : (
            segmentos
              .filter((s) => s.valor > 0)
              .map((s, indice) => {
                const largo = (s.valor / total) * circunferencia
                const desplazamiento = -acumulado
                acumulado += largo
                return (
                  <circle
                    key={s.etiqueta}
                    cx={tamaño / 2}
                    cy={tamaño / 2}
                    r={radio}
                    fill="none"
                    stroke={s.color ?? colorDeSerie(indice)}
                    strokeWidth={grosor}
                    strokeDasharray={`${largo} ${circunferencia - largo}`}
                    strokeDashoffset={desplazamiento}
                  />
                )
              })
          )}
        </g>
      </svg>

      <ul className="min-w-0 flex-1 space-y-1.5 text-xs">
        {segmentos.map((s, indice) => (
          <li key={s.etiqueta} className="flex items-center justify-between gap-3">
            <span className="flex min-w-0 items-center gap-1.5">
              <span
                aria-hidden
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: total === 0 ? 'var(--color-papel)' : (s.color ?? colorDeSerie(indice)) }}
              />
              <span className="truncate text-tenue">{s.etiqueta}</span>
            </span>
            <span className="whitespace-nowrap font-medium">{s.textoValor}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export type Barra = {
  etiqueta: string
  valor: number
  textoValor: string
  color?: string
}

/**
 * Una lista de barras horizontales, para comparar cantidades entre pocas
 * categorías — los estados de M&M y del sello, o los alumnos por disciplina.
 *
 * La barra más larga siempre llega al borde: la escala es relativa al máximo
 * del propio conjunto, no a un techo absoluto, porque lo que se viene a mirar
 * acá es qué categoría pesa más, no un número contra un objetivo que esta
 * pantalla no conoce.
 */
export function BarrasHorizontales({ barras }: { barras: Barra[] }) {
  const maximo = Math.max(1, ...barras.map((b) => b.valor))

  return (
    <ul className="space-y-2.5">
      {barras.map((b, indice) => (
        <li key={b.etiqueta}>
          <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
            <span className="truncate text-tenue">{b.etiqueta}</span>
            <span className="whitespace-nowrap font-medium">{b.textoValor}</span>
          </div>
          <div className="h-1.5 rounded bg-papel">
            <div
              className="h-1.5 rounded"
              style={{
                width: `${(b.valor / maximo) * 100}%`,
                backgroundColor: b.color ?? colorDeSerie(indice),
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  )
}

/**
 * Un anillo de porcentaje, puramente decorativo — el número sigue viajando
 * como texto aparte, exactamente como antes, porque es lo que la pantalla ya
 * probaba (`findByText('60%')`) y partirlo entre el SVG y el texto es la
 * forma más rápida de que un test deje de encontrar lo que muestra.
 *
 * **`porcentaje === null` dibuja el anillo hueco**, la misma distinción que
 * ya hace `TarjetaDeRetencion` con su texto: no hay a quién medir todavía, y
 * un anillo vacío no es lo mismo que un anillo en cero.
 */
export function Medidor({ porcentaje, tamaño = 72 }: { porcentaje: number | null; tamaño?: number }) {
  const grosor = tamaño * 0.14
  const radio = (tamaño - grosor) / 2
  const circunferencia = 2 * Math.PI * radio
  const relleno = porcentaje === null ? 0 : (Math.min(100, Math.max(0, porcentaje)) / 100) * circunferencia

  return (
    <svg
      width={tamaño}
      height={tamaño}
      viewBox={`0 0 ${tamaño} ${tamaño}`}
      className="shrink-0"
      aria-hidden
    >
      <circle
        cx={tamaño / 2}
        cy={tamaño / 2}
        r={radio}
        fill="none"
        stroke="var(--color-papel)"
        strokeWidth={grosor}
      />
      {porcentaje !== null && (
        <circle
          cx={tamaño / 2}
          cy={tamaño / 2}
          r={radio}
          fill="none"
          stroke="var(--color-ink)"
          strokeWidth={grosor}
          strokeLinecap="round"
          strokeDasharray={`${relleno} ${circunferencia - relleno}`}
          transform={`rotate(-90 ${tamaño / 2} ${tamaño / 2})`}
        />
      )}
    </svg>
  )
}
