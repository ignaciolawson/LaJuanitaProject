"use client";

import { useRef } from "react";
import { gsap, useGSAP, ScrollTrigger, prefersReduced, isLite } from "@/lib/gsap";
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

      // Medidor VU.
      //
      // No corre en táctil. Son 28 escrituras de `transform` en CADA frame
      // mientras la sección está en pantalla, y en un teléfono eso compite
      // por el mismo hilo que mueve el scroll: el medidor es adorno, el
      // scroll no. Las barras quedan quietas en su altura de reposo, que ya
      // se ve como un medidor apagado y no como algo roto.
      if (isLite()) return;
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

      // El medidor sólo corre mientras la sección está en cuadro. Son 28
      // escrituras de `transform` por frame: dejarlas andando mientras mirás
      // el hero o el footer es trabajo por algo que nadie está viendo.
      let running = false;
      const start = () => {
        if (running) return;
        running = true;
        gsap.ticker.add(tick);
      };
      const stop = () => {
        if (!running) return;
        running = false;
        gsap.ticker.remove(tick);
      };

      const st = ScrollTrigger.create({
        trigger: root.current,
        start: "top bottom",
        end: "bottom top",
        onToggle: (self) => (self.isActive ? start() : stop()),
      });
      // `onToggle` sólo dispara cuando el estado CAMBIA: si la sección ya
      // está en cuadro al montar, nunca se llamaría.
      if (st.isActive) start();

      return () => {
        stop();
        st.kill();
      };
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

          {/* VU.
              El alto de reposo es una onda calculada, no `scaleY(0.1)` para
              todas. En táctil el ticker no arranca, y veintiocho barras
              idénticas del 10% no se leen como un medidor en reposo: se leen
              como una raya. Con el perfil ondulado queda un medidor congelado,
              que es lo que efectivamente es. Va con `Math.sin` y no con
              `Math.random` porque esto se renderiza en el servidor: un valor
              distinto en cada lado sería un error de hidratación. */}
          <div className="flex h-16 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: 28 }).map((_, i) => (
              <span
                key={i}
                data-vu
                className="block h-full w-[4px] origin-bottom bg-[color:var(--page-fg)] opacity-70"
                style={{
                  transform: `scaleY(${(0.22 + 0.3 * (Math.sin(i * 1.35) + 1) * 0.5).toFixed(3)})`,
                }}
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
