"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollSmoother, ScrollTrigger, prefersReduced } from "@/lib/gsap";

/**
 * Scroll con inercia (ScrollSmoother).
 *
 * Es el 40% de la sensación de "sitio caro": el scroll deja de ser un salto
 * de rueda y pasa a tener peso. También habilita `data-speed` / `data-lag`
 * en cualquier elemento, que es como resuelvo los parallax sin escribir un
 * ScrollTrigger por cada capa.
 *
 * Dos condiciones importantes:
 *  - Todo lo `position: fixed` (nav, cursor, grano) vive FUERA de
 *    #smooth-content, porque el contenido está transformado y un fixed
 *    dentro de un transform se ancla al padre, no al viewport.
 *  - Si el visitante pidió menos movimiento, no se crea nada: scroll nativo.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const smoother = useRef<ScrollSmoother | null>(null);

  useGSAP(() => {
    if (prefersReduced()) return;

    smoother.current = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.15,
      effects: true,
      normalizeScroll: true,
      ignoreMobileResize: true,
      smoothTouch: 0,
    });

    return () => {
      smoother.current?.kill();
      smoother.current = null;
    };
  }, []);

  // En App Router el wrapper sobrevive al cambio de ruta pero la altura del
  // contenido no: sin este reset quedan triggers apuntando a la página vieja.
  useGSAP(() => {
    smoother.current?.scrollTo(0, false);
    ScrollTrigger.refresh();
    gsap.delayedCall(0.2, () => ScrollTrigger.refresh());
  }, [pathname]);

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  );
}
