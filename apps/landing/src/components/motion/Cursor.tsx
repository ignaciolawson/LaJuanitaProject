"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Cursor propio: un punto que sigue rápido y un anillo que llega tarde.
 *
 * El anillo usa `mix-blend-mode: difference`, así se invierte solo sobre
 * tinta y sobre papel — que es imprescindible acá, porque el fondo del sitio
 * cambia de negro a hueso mientras scrolleás.
 *
 * Cualquier elemento con `data-cursor="TEXTO"` agranda el anillo y le mete
 * esa etiqueta adentro. Es lo que convierte al cursor en información
 * (VER / ARRASTRAR / ESCUCHAR) en vez de un adorno que persigue al mouse.
 */
export function Cursor() {
  const dot = useRef<HTMLDivElement>(null);
  const ring = useRef<HTMLDivElement>(null);
  const label = useRef<HTMLSpanElement>(null);

  useGSAP(() => {
    // Sólo mouse fino y pantalla grande: en touch no hay puntero que seguir.
    if (!window.matchMedia("(pointer: fine) and (min-width: 1024px)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const d = dot.current;
    const r = ring.current;
    const l = label.current;
    if (!d || !r || !l) return;

    gsap.set([d, r], { xPercent: -50, yPercent: -50, opacity: 0 });

    const dx = gsap.quickTo(d, "x", { duration: 0.12, ease: "power3" });
    const dy = gsap.quickTo(d, "y", { duration: 0.12, ease: "power3" });
    const rx = gsap.quickTo(r, "x", { duration: 0.55, ease: "power3" });
    const ry = gsap.quickTo(r, "y", { duration: 0.55, ease: "power3" });

    let shown = false;

    const onMove = (e: PointerEvent) => {
      if (!shown) {
        shown = true;
        gsap.to([d, r], { opacity: 1, duration: 0.3 });
      }
      dx(e.clientX);
      dy(e.clientY);
      rx(e.clientX);
      ry(e.clientY);

      const target = (e.target as HTMLElement)?.closest<HTMLElement>(
        "[data-cursor], a, button",
      );
      const text = target?.dataset.cursor;

      if (text) {
        l.textContent = text;
        gsap.to(r, { width: 84, height: 84, borderWidth: 1, duration: 0.4 });
        gsap.to(l, { opacity: 1, duration: 0.25 });
        gsap.to(d, { scale: 0, duration: 0.25 });
      } else if (target) {
        gsap.to(r, { width: 52, height: 52, borderWidth: 1, duration: 0.4 });
        gsap.to(l, { opacity: 0, duration: 0.15 });
        gsap.to(d, { scale: 0.6, duration: 0.25 });
      } else {
        gsap.to(r, { width: 34, height: 34, borderWidth: 1, duration: 0.4 });
        gsap.to(l, { opacity: 0, duration: 0.15 });
        gsap.to(d, { scale: 1, duration: 0.25 });
      }
    };

    const onLeave = () => {
      shown = false;
      gsap.to([d, r], { opacity: 0, duration: 0.25 });
    };

    const onDown = () => gsap.to(r, { scale: 0.82, duration: 0.18 });
    const onUp = () => gsap.to(r, { scale: 1, duration: 0.3 });

    window.addEventListener("pointermove", onMove, { passive: true });
    document.addEventListener("pointerleave", onLeave);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("pointerup", onUp);

    return () => {
      window.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
    };
  }, []);

  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-[90] hidden lg:block">
      <div
        ref={dot}
        className="fixed left-0 top-0 h-1.5 w-1.5 rounded-full bg-red opacity-0"
      />
      <div
        ref={ring}
        className="fixed left-0 top-0 flex h-[34px] w-[34px] items-center justify-center rounded-full border border-white opacity-0 mix-blend-difference"
      >
        <span
          ref={label}
          className="t-mono whitespace-nowrap text-[9px] tracking-[0.14em] text-white opacity-0"
        />
      </div>
    </div>
  );
}
