"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";

type RevealProps = {
  children: ReactNode;
  className?: string;
  as?: ElementType;
  /** Animate each direct child individually with this stagger (seconds) instead of the wrapper as a whole. */
  stagger?: number;
  y?: number;
  delay?: number;
  scale?: boolean;
};

export function Reveal({
  children,
  className,
  as: Tag = "div",
  stagger,
  y = 32,
  delay = 0,
  scale = false,
}: RevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;
      // Sin este corte el contenido de todas las páginas interiores seguía
      // entrando con desplazamiento aunque el visitante pidiera menos
      // movimiento: es un `gsap.from`, así que el estado final ya es el
      // natural y alcanza con no animar nada.
      if (prefersReduced()) return;

      const targets = stagger ? gsap.utils.toArray(el.children) : el;

      gsap.from(targets, {
        opacity: 0,
        y,
        scale: scale ? 0.94 : 1,
        duration: 0.9,
        delay,
        ease: "expo.out",
        stagger: stagger ?? 0,
        scrollTrigger: {
          trigger: el,
          start: "top 85%",
          toggleActions: "play none none reverse",
        },
      });
    },
    { scope: ref },
  );

  const Wrapper = Tag as ElementType;
  return (
    <Wrapper ref={ref} className={className}>
      {children}
    </Wrapper>
  );
}
