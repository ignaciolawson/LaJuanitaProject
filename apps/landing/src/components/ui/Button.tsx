import Link from "next/link";
import type { ReactNode } from "react";
import clsx from "clsx";
import { Magnetic } from "@/components/motion/Magnetic";

type ButtonProps = {
  href: string;
  children: ReactNode;
  variant?: "solid" | "outline" | "ghost";
  className?: string;
  external?: boolean;
  cursor?: string;
};

/**
 * Botón "parche": esquina inferior derecha cortada y relleno que sube desde
 * abajo al hover (ver `.btn` en globals.css). Envuelto en <Magnetic> para
 * que además se acerque un poco al puntero.
 */
export function Button({
  href,
  children,
  variant = "outline",
  className,
  external,
  cursor,
}: ButtonProps) {
  const inner = (
    <Link
      href={href}
      data-cursor={cursor}
      className={clsx(
        "btn",
        variant === "solid" && "btn--solid",
        variant === "ghost" && "border-transparent px-0",
        className,
      )}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
    >
      {children}
      <span aria-hidden className="text-[1.25em] leading-none">
        ↗
      </span>
    </Link>
  );

  return <Magnetic strength={0.28}>{inner}</Magnetic>;
}
