"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { TESTIMONIALS } from "@/data/testimonials";

/**
 * Testimonios — uno por vez, en grande.
 *
 * Tres cards con comillas es el patrón por defecto y se ignora solo. Acá va
 * una sola voz ocupando la pantalla, con las otras accesibles por índice.
 * El cambio no es un fade: la cita sale hacia arriba y la nueva entra desde
 * abajo por líneas, como una ficha que se da vuelta.
 *
 * Autoplay pausado al pasar el mouse, y navegación por teclado real —
 * los botones son <button>, no divs con onClick.
 */
export function Voices() {
  const root = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);
  const paused = useRef(false);

  // Rotación automática
  useGSAP(() => {
    if (prefersReduced()) return;
    const call = gsap.delayedCall(6.5, () => {
      if (!paused.current) setActive((v) => (v + 1) % TESTIMONIALS.length);
      call.restart(true);
    });
    return () => call.kill();
  }, [active]);

  // Transición de la cita
  useGSAP(
    () => {
      if (prefersReduced()) return;
      gsap.fromTo(
        "[data-quote-part]",
        { yPercent: 60, opacity: 0 },
        { yPercent: 0, opacity: 1, duration: 0.85, stagger: 0.06, ease: "juanita" },
      );
    },
    { scope: root, dependencies: [active] },
  );

  const current = TESTIMONIALS[active];

  return (
    <section
      data-theme="bone"
      className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <Container wide>
        <span className="label">Los que pasaron</span>

        <div
          ref={root}
          onMouseEnter={() => (paused.current = true)}
          onMouseLeave={() => (paused.current = false)}
          className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end"
        >
          <blockquote className="max-w-[22ch]">
            <p className="t-display-tight text-[clamp(28px,4.6vw,72px)] leading-[0.98] normal-case">
              <span className="text-red">“</span>
              <span data-quote-part className="inline-block">
                {current.quote}
              </span>
              <span className="text-red">”</span>
            </p>
            <footer data-quote-part className="mt-8 inline-block">
              <span className="t-display-tight text-xl">{current.name}</span>
              <span className="t-mono ml-3 text-[color:var(--page-faint)]">
                {current.program}
              </span>
            </footer>
          </blockquote>

          {/* Índice */}
          <div className="flex gap-3 lg:flex-col lg:items-end">
            {TESTIMONIALS.map((t, i) => (
              <button
                key={t.name}
                type="button"
                onClick={() => setActive(i)}
                aria-label={`Ver testimonio de ${t.name}`}
                aria-current={i === active}
                className="group flex items-center gap-3"
              >
                <span
                  className={`t-mono transition-colors ${
                    i === active ? "text-red" : "text-[color:var(--page-faint)]"
                  }`}
                >
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span
                  className={`block h-px bg-current transition-all duration-500 ${
                    i === active
                      ? "w-16 text-red"
                      : "w-8 text-[color:var(--page-faint)] group-hover:w-12"
                  }`}
                />
              </button>
            ))}
          </div>
        </div>
      </Container>
    </section>
  );
}
