"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { scrollVelocity } from "@/lib/velocity";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";

/**
 * Cifras + medidor VU.
 *
 * Los contadores no arrancan todos juntos: cada uno tiene su propio trigger
 * y su propio delay, para que la fila se "cargue" de izquierda a derecha.
 *
 * Las barras del VU son puro adorno, pero adorno honesto: se mueven con un
 * ruido pseudo-aleatorio y responden a la velocidad del scroll (--vel), así
 * que reaccionan a vos y no a un `Math.random()` en loop.
 */

const STATS = [
  { value: 200, suffix: "+", label: "Alumnos formados", note: "Desde 2019" },
  { value: 4, suffix: "", label: "Programas activos", note: "DJ, producción, mastering" },
  { value: 12, suffix: "", label: "Lanzamientos del sello", note: "La Juanita Records" },
  { value: 100, suffix: "%", label: "Práctica en cabina real", note: "Pioneer DJ" },
];

export function Numbers() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const nodes = gsap.utils.toArray<HTMLElement>("[data-stat]");

      nodes.forEach((node, i) => {
        const target = Number(node.dataset.stat ?? 0);
        const obj = { v: 0 };

        if (prefersReduced()) {
          node.textContent = String(target);
          return;
        }

        gsap.to(obj, {
          v: target,
          duration: 1.8,
          delay: i * 0.12,
          ease: "power2.out",
          snap: { v: 1 },
          onUpdate: () => {
            node.textContent = String(Math.round(obj.v));
          },
          scrollTrigger: { trigger: root.current, start: "top 72%", once: true },
        });
      });

      // Medidor VU
      if (prefersReduced()) return;
      const bars = gsap.utils.toArray<HTMLElement>("[data-vu]");
      const seeds = bars.map(() => Math.random() * 100);

      const tick = () => {
        const vel = scrollVelocity.value;
        const t = performance.now() / 620;
        bars.forEach((bar, i) => {
          const base = (Math.sin(t + seeds[i]) + 1) / 2;
          const h = gsap.utils.clamp(0.08, 1, base * (0.35 + vel * 0.9) + 0.1);
          bar.style.transform = `scaleY(${h.toFixed(3)})`;
        });
      };

      gsap.ticker.add(tick);
      return () => gsap.ticker.remove(tick);
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-theme="bone"
      className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <Container wide>
        <div className="flex flex-wrap items-end justify-between gap-8">
          <div>
            <span className="label">Salida general</span>
            <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
              En números
            </SplitReveal>
          </div>

          {/* VU */}
          <div className="flex h-16 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                data-vu
                className="block h-full w-[4px] origin-bottom bg-[color:var(--page-fg)] opacity-70"
                style={{ transform: "scaleY(0.1)" }}
              />
            ))}
          </div>
        </div>

        <dl className="mt-16 grid grid-cols-2 gap-x-6 gap-y-12 lg:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="border-t border-[color:var(--page-line)] pt-5">
              <dd className="t-display text-[clamp(44px,6vw,92px)] leading-none">
                <span data-stat={stat.value}>0</span>
                <span className="text-red">{stat.suffix}</span>
              </dd>
              <dt className="t-display-tight mt-4 text-sm">{stat.label}</dt>
              <dd className="t-mono mt-2 text-[color:var(--page-faint)]">{stat.note}</dd>
            </div>
          ))}
        </dl>
      </Container>
    </section>
  );
}
