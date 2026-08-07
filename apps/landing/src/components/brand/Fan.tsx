import clsx from "clsx";

/**
 * El abanico de la marca, redibujado como SVG para poder animarlo.
 *
 * El logo original es un PNG plano: sirve para el favicon, no para moverse.
 * Acá cada varilla es un nodo propio (`data-rib`) y el arco exterior es un
 * trazo dibujable (`data-arc`, para DrawSVG), así el motivo puede abrirse,
 * cerrarse y dibujarse con el scroll en vez de ser una imagen pegada.
 *
 * El pivote está en (200, 232) — el remache del abanico. Todas las
 * varillas rotan desde ahí, que es lo que hace que la apertura se lea como
 * un abanico real y no como un menú en abanico de app.
 */

type FanProps = {
  /** Cantidad de varillas. 13 es lo que tiene el logo original. */
  ribs?: number;
  /** Apertura total en grados (el ancho del arco). */
  spread?: number;
  className?: string;
  /** Trazo del arco exterior; `false` deja sólo las varillas. */
  arc?: boolean;
  strokeWidth?: number;
};

export function Fan({
  ribs = 13,
  spread = 156,
  className,
  arc = true,
  strokeWidth = 1.25,
}: FanProps) {
  const CX = 200;
  const CY = 232;
  const R_OUT = 196;
  const R_IN = 54;

  const step = spread / (ribs - 1);
  const start = -spread / 2;

  // Arco exterior, de la primera varilla a la última.
  const a0 = ((start - 90) * Math.PI) / 180;
  const a1 = ((start + spread - 90) * Math.PI) / 180;
  const arcPath = [
    `M ${CX + Math.cos(a0) * R_OUT} ${CY + Math.sin(a0) * R_OUT}`,
    `A ${R_OUT} ${R_OUT} 0 0 1 ${CX + Math.cos(a1) * R_OUT} ${CY + Math.sin(a1) * R_OUT}`,
  ].join(" ");

  const arcInner = [
    `M ${CX + Math.cos(a0) * R_IN} ${CY + Math.sin(a0) * R_IN}`,
    `A ${R_IN} ${R_IN} 0 0 1 ${CX + Math.cos(a1) * R_IN} ${CY + Math.sin(a1) * R_IN}`,
  ].join(" ");

  return (
    <svg
      viewBox="0 0 400 264"
      fill="none"
      aria-hidden
      focusable="false"
      className={clsx("overflow-visible", className)}
      data-fan
    >
      <g transform={`translate(${CX} ${CY})`}>
        {Array.from({ length: ribs }).map((_, i) => {
          const angle = start + i * step;
          // Las varillas del medio son levemente más largas: el borde del
          // abanico real es un arco, no una línea recta.
          const t = Math.abs(i - (ribs - 1) / 2) / ((ribs - 1) / 2);
          const len = R_OUT - t * 6;
          const w = 7 - t * 1.6;

          return (
            <g key={i} data-rib data-rib-index={i} transform={`rotate(${angle})`}>
              {/* varilla: cuña estrecha abajo, ancha arriba */}
              <path
                d={`M ${-w * 0.34} ${-R_IN} L ${w * 0.34} ${-R_IN} L ${w * 0.5} ${-len} L ${-w * 0.5} ${-len} Z`}
                fill="currentColor"
              />
              {/* nervadura interna, entre remache y varilla */}
              <line
                x1="0"
                y1="-14"
                x2="0"
                y2={-R_IN + 2}
                stroke="currentColor"
                strokeWidth={strokeWidth * 0.7}
                opacity="0.75"
              />
            </g>
          );
        })}

        {/* remache */}
        <circle r="8.5" fill="currentColor" />
        <circle r="3.2" fill="none" stroke="currentColor" strokeWidth={strokeWidth} opacity="0.4" />
      </g>

      {arc && (
        <>
          <path
            d={arcPath}
            data-arc
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={arcInner}
            data-arc
            stroke="currentColor"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            opacity="0.5"
          />
        </>
      )}
    </svg>
  );
}
