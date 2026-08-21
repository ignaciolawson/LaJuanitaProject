/**
 * El abanico de la marca — portado de `apps/landing/src/components/brand/Fan.tsx`.
 *
 * **Es una copia y hay que saberlo.** Son dos aplicaciones con builds
 * separados, así que no hay forma de compartir el archivo sin sacar un
 * paquete común, y sacar un paquete para un SVG es más caro que la copia. Si
 * el dibujo de la marca cambia, cambia en los dos lados.
 *
 * Dos diferencias con el original, las dos a propósito:
 *
 * 1. **Sin `clsx`.** La landing lo tiene entre sus dependencias y la
 *    plataforma no; agregar un paquete para concatenar dos strings no se
 *    justifica.
 * 2. **Sin los atributos de animación.** El original lleva `data-rib`,
 *    `data-arc` y `data-fan` para que GSAP lo abra y lo dibuje con el
 *    scroll. Acá el abanico no se mueve —la decisión de esta app es "sin
 *    teatro"— y dejar ganchos que nadie usa invita a que alguien enchufe
 *    una animación de scroll en un sistema de carga de datos.
 *
 * Dónde va: login, estados vacíos y marca. **No en las pantallas de
 * trabajo.** Es un gesto de identidad, no un adorno de fondo.
 */

type Props = {
  /** Cantidad de varillas. 13 es lo que tiene el logo original. */
  varillas?: number
  /** Apertura total en grados. */
  apertura?: number
  className?: string
  /** Trazo del arco exterior; `false` deja sólo las varillas. */
  arco?: boolean
  grosor?: number
}

export function Abanico({
  varillas = 13,
  apertura = 156,
  className,
  arco = true,
  grosor = 1.25,
}: Props) {
  // El pivote (200, 232) es el remache: todas las varillas rotan desde ahí,
  // que es lo que hace que se lea como un abanico y no como un menú radial.
  const CX = 200
  const CY = 232
  const R_EXT = 196
  const R_INT = 54

  const paso = apertura / (varillas - 1)
  const inicio = -apertura / 2

  const a0 = ((inicio - 90) * Math.PI) / 180
  const a1 = ((inicio + apertura - 90) * Math.PI) / 180

  const arcoExterno = [
    `M ${CX + Math.cos(a0) * R_EXT} ${CY + Math.sin(a0) * R_EXT}`,
    `A ${R_EXT} ${R_EXT} 0 0 1 ${CX + Math.cos(a1) * R_EXT} ${CY + Math.sin(a1) * R_EXT}`,
  ].join(' ')

  const arcoInterno = [
    `M ${CX + Math.cos(a0) * R_INT} ${CY + Math.sin(a0) * R_INT}`,
    `A ${R_INT} ${R_INT} 0 0 1 ${CX + Math.cos(a1) * R_INT} ${CY + Math.sin(a1) * R_INT}`,
  ].join(' ')

  return (
    <svg
      viewBox="0 0 400 264"
      fill="none"
      aria-hidden
      focusable="false"
      className={`overflow-visible ${className ?? ''}`}
    >
      <g transform={`translate(${CX} ${CY})`}>
        {Array.from({ length: varillas }).map((_, i) => {
          const angulo = inicio + i * paso
          // Las del medio son levemente más largas: el borde de un abanico
          // real es un arco, no una línea recta.
          const t = Math.abs(i - (varillas - 1) / 2) / ((varillas - 1) / 2)
          const largo = R_EXT - t * 6
          const ancho = 7 - t * 1.6

          return (
            <g key={i} transform={`rotate(${angulo})`}>
              <path
                d={`M ${-ancho * 0.34} ${-R_INT} L ${ancho * 0.34} ${-R_INT} L ${ancho * 0.5} ${-largo} L ${-ancho * 0.5} ${-largo} Z`}
                fill="currentColor"
              />
              <line
                x1="0"
                y1="-14"
                x2="0"
                y2={-R_INT + 2}
                stroke="currentColor"
                strokeWidth={grosor * 0.7}
                opacity="0.75"
              />
            </g>
          )
        })}

        <circle r="8.5" fill="currentColor" />
        <circle r="3.2" fill="none" stroke="currentColor" strokeWidth={grosor} opacity="0.4" />
      </g>

      {arco && (
        <>
          <path d={arcoExterno} stroke="currentColor" strokeWidth={grosor} strokeLinecap="round" />
          <path
            d={arcoInterno}
            stroke="currentColor"
            strokeWidth={grosor}
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      )}
    </svg>
  )
}
