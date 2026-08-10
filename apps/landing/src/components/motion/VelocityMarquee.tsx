"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { gsap, useGSAP, ScrollTrigger, prefersReduced } from "@/lib/gsap";

/**
 * Marquesina que reacciona al scroll.
 *
 * Un marquee a velocidad constante es decoración. Este acelera con la
 * velocidad del scroll, invierte su dirección cuando scrolleás para arriba y
 * se inclina en los picos: la tira parece conectada a tu mano y no a un
 * `setInterval`.
 *
 * Implementación: un único timeline en loop cuyo `timeScale` se empuja desde
 * el onUpdate del ScrollTrigger y vuelve a 1 con un tween corto. El skew va
 * por `quickTo` — crear un tween nuevo por frame de scroll es la forma
 * silenciosa de tirar los FPS a la basura.
 */
export function VelocityMarquee({
  items,
  className,
  speed = 26,
  separator = "✳",
  reverse = false,
}: {
  items: ReactNode[];
  className?: string;
  /** Segundos por vuelta. Más bajo = más rápido. */
  speed?: number;
  separator?: ReactNode;
  reverse?: boolean;
}) {
  const root = useRef<HTMLDivElement>(null);
  const track = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = track.current;
      if (!el) return;

      gsap.set(el, { xPercent: reverse ? -50 : 0 });

      const loop = gsap.to(el, {
        xPercent: reverse ? 0 : -50,
        duration: speed,
        ease: "none",
        repeat: -1,
      });

      if (prefersReduced()) {
        loop.pause();
        return () => loop.kill();
      }

      const skewTo = gsap.quickTo(el, "skewX", { duration: 0.6, ease: "power3" });
      let settle: gsap.core.Tween | null = null;

      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        // Fuera de pantalla el loop se pausa. Es un tween infinito sobre un
        // elemento ancho: sin esto sigue animando (y componiendo) la tira
        // aunque estés seis secciones más abajo y no se vea nada.
        onToggle: (self) => loop.paused(!self.isActive),
        onUpdate: (self) => {
          const v = self.getVelocity();
          const boost = gsap.utils.clamp(1, 7, 1 + Math.abs(v) / 380);
          const sign = self.direction === 1 ? 1 : -1;

          loop.timeScale(boost * sign);
          skewTo(gsap.utils.clamp(-8, 8, -v / 280));

          settle?.kill();
          settle = gsap.to(loop, {
            timeScale: sign,
            duration: 0.8,
            ease: "power2.out",
            overwrite: true,
          });
          // Sin skewTo(0) acá: getVelocity ya decae solo mientras el scroll
          // frena, y forzar el 0 en el mismo frame cancela el skew antes de
          // que llegue a verse.
        },
      });

      // Estado inicial explícito: `onToggle` sólo dispara cuando el estado
      // CAMBIA, así que si la tira arranca fuera de pantalla nunca se
      // llamaría y el loop quedaría corriendo igual.
      loop.paused(!st.isActive);

      return () => {
        settle?.kill();
        st.kill();
        loop.kill();
      };
    },
    { scope: root, dependencies: [speed, reverse] },
  );

  const run = (
    <span className="flex shrink-0 items-center">
      {items.map((item, i) => (
        <span key={i} className="flex shrink-0 items-center">
          <span className="px-6">{item}</span>
          <span className="px-6 text-red" aria-hidden>
            {separator}
          </span>
        </span>
      ))}
    </span>
  );

  return (
    <div ref={root} className={clsx("relative overflow-hidden py-4", className)} aria-hidden>
      <div ref={track} className="flex w-max whitespace-nowrap will-change-transform">
        {run}
        {run}
      </div>
    </div>
  );
}
