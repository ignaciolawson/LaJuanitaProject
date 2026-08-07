"use client";

import { useId } from "react";
import clsx from "clsx";

/**
 * Texto sobre un arco, calcado del wordmark real (un "rocker patch":
 * las letras montadas sobre una curva, como en una espalda de campera).
 *
 * Es el gesto tipográfico que más rápido dice "esto es La Juanita" y el que
 * ningún template trae de fábrica, así que vale usarlo en varios lugares:
 * hero, separadores y footer.
 */

type ArcTextProps = {
  text: string;
  className?: string;
  /** Curvatura: más alto = arco más cerrado. */
  bend?: number;
  /** Invierte la curva (sonrisa ↔ ceño). */
  flip?: boolean;
  letterSpacing?: string;
};

export function ArcText({
  text,
  className,
  bend = 130,
  flip = false,
  letterSpacing = "0.06em",
}: ArcTextProps) {
  const id = useId().replace(/:/g, "");
  const pathId = `arc-${id}`;

  const W = 1000;
  const y = flip ? 30 : 190;
  const cy = flip ? 30 + bend * 2 : 190 - bend * 2;
  const d = `M 20 ${y} Q ${W / 2} ${cy} ${W - 20} ${y}`;

  return (
    <svg
      viewBox="0 0 1000 200"
      className={clsx("w-full overflow-visible", className)}
      aria-hidden
      focusable="false"
    >
      <defs>
        <path id={pathId} d={d} fill="none" />
      </defs>
      <text
        fill="currentColor"
        style={{ letterSpacing }}
        className="t-display-tight"
        fontSize="76"
      >
        <textPath href={`#${pathId}`} startOffset="50%" textAnchor="middle">
          {text}
        </textPath>
      </text>
    </svg>
  );
}
