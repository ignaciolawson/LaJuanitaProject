"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, SplitText, prefersReduced } from "@/lib/gsap";

/**
 * Revelado tipográfico con SplitText.
 *
 * Tres modos, y la elección importa más de lo que parece:
 *  - `lines`  → titulares largos. Cada línea sube desde su propia máscara.
 *  - `chars`  → titulares cortos y grandes. Letra por letra con rotación 3D.
 *  - `words`  → párrafos de manifiesto. Las palabras aparecen de a poco.
 *
 * Detalles que evitan que se vea "de plantilla":
 *  - `onSplit` + revert en cleanup, para que el texto siga siendo texto real
 *    para lectores de pantalla y para el SEO.
 *  - Re-split en resize, si no las líneas quedan cortadas donde estaban
 *    antes de rotar el teléfono.
 *  - Si el visitante pidió menos movimiento, no parte nada: sólo aparece.
 *
 * BUG QUE ESTO ARREGLA (modo `lines`): la animación se armaba afuera, sobre
 * los nodos devueltos por `SplitText.create`. Pero con `autoSplit` esos nodos
 * son descartables: SplitText vuelve a partir el texto cuando el elemento
 * cambia de ancho y —sobre todo— cuando terminan de cargar las fuentes, cosa
 * que con `display: swap` pasa en CADA primera visita. Después de ese
 * re-split el tween apuntaba a nodos que ya no estaban en el DOM y las líneas
 * nuevas quedaban en su estado natural: el revelado no se veía nunca.
 * Devolviendo la animación desde `onSplit`, SplitText la mata y la vuelve a
 * crear sobre los nodos nuevos en cada partición.
 */

type SplitRevealProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  type?: "lines" | "chars" | "words";
  trigger?: "load" | "scroll";
  delay?: number;
  stagger?: number;
  start?: string;
};

export function SplitReveal({
  children,
  as: Tag = "div",
  className,
  type = "lines",
  trigger = "scroll",
  delay = 0,
  stagger,
  start = "top 82%",
}: SplitRevealProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      if (prefersReduced()) {
        gsap.set(el, { opacity: 1 });
        return;
      }

      const from =
        type === "chars"
          ? { yPercent: 108, rotateX: -72, opacity: 0, transformOrigin: "50% 100%" }
          : type === "words"
            ? { yPercent: 42, opacity: 0 }
            : { yPercent: 112 };

      const split = SplitText.create(el, {
        type: type === "chars" ? "chars,words" : type,
        mask: type === "lines" ? "lines" : undefined,
        linesClass: "reveal-line",
        autoSplit: true,
        // Se corre en cada partición (la inicial y las que dispara autoSplit).
        // Lo que devuelve queda a cargo de SplitText: lo mata antes de volver
        // a partir y conserva el progreso, así un resize a mitad del revelado
        // no lo reinicia desde cero.
        onSplit: (self) => {
          const targets =
            type === "chars" ? self.chars : type === "words" ? self.words : self.lines;

          gsap.set(el, { opacity: 1, perspective: 800 });
          gsap.set(targets, from);

          return gsap.to(targets, {
            yPercent: 0,
            rotateX: 0,
            opacity: 1,
            duration: type === "chars" ? 1 : 1.05,
            delay,
            ease: "juanita",
            stagger: stagger ?? (type === "chars" ? 0.026 : type === "words" ? 0.035 : 0.09),
            ...(trigger === "load"
              ? {}
              : { scrollTrigger: { trigger: el, start, once: true } }),
          });
        },
      });

      return () => split.revert();
    },
    { scope: ref, dependencies: [type, trigger] },
  );

  const Wrapper = Tag as ElementType;
  return (
    <Wrapper ref={ref} className={className} style={{ opacity: 0 }}>
      {children}
    </Wrapper>
  );
}
