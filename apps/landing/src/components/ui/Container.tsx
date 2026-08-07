import type { ReactNode } from "react";
import clsx from "clsx";

/**
 * Ancho de página. `wide` usa casi todo el viewport (para las secciones
 * donde el titular tiene que sentirse sin freno) y el default queda en una
 * medida editorial cómoda de leer.
 */
export function Container({
  children,
  className,
  wide = false,
}: {
  children: ReactNode;
  className?: string;
  wide?: boolean;
}) {
  return (
    <div
      className={clsx(
        "mx-auto w-full",
        wide ? "max-w-[1680px]" : "max-w-[1180px]",
        "px-[var(--pad)]",
        className,
      )}
    >
      {children}
    </div>
  );
}
