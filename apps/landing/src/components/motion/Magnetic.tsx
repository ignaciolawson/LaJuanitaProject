"use client";

import { useRef, type ReactNode } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Atracción magnética al pasar el mouse.
 *
 * El truco es que el hijo se mueva menos que el envoltorio (`strength` y
 * `childStrength` distintos): produce un desfase mínimo que se lee como
 * profundidad. Si todo se mueve junto queda un botón resbaloso y ya.
 */
export function Magnetic({
  children,
  strength = 0.34,
  childStrength = 0.16,
  className,
}: {
  children: ReactNode;
  strength?: number;
  childStrength?: number;
  className?: string;
}) {
  const wrap = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = wrap.current;
      if (!el) return;
      if (!window.matchMedia("(pointer: fine)").matches) return;
      if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

      const inner = el.firstElementChild as HTMLElement | null;

      const xTo = gsap.quickTo(el, "x", { duration: 0.7, ease: "elastic.out(1, 0.4)" });
      const yTo = gsap.quickTo(el, "y", { duration: 0.7, ease: "elastic.out(1, 0.4)" });
      const cxTo = inner ? gsap.quickTo(inner, "x", { duration: 0.9, ease: "elastic.out(1, 0.4)" }) : null;
      const cyTo = inner ? gsap.quickTo(inner, "y", { duration: 0.9, ease: "elastic.out(1, 0.4)" }) : null;

      const onMove = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        xTo(mx * strength);
        yTo(my * strength);
        cxTo?.(mx * childStrength);
        cyTo?.(my * childStrength);
      };

      const onLeave = () => {
        xTo(0);
        yTo(0);
        cxTo?.(0);
        cyTo?.(0);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerleave", onLeave);
      return () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerleave", onLeave);
      };
    },
    { scope: wrap },
  );

  return (
    <span ref={wrap} className={className} style={{ display: "inline-block" }}>
      {children}
    </span>
  );
}
