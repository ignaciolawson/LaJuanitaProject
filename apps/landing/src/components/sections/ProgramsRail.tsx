"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { PROGRAMS } from "@/data/programs";

/**
 * Programas — riel horizontal anclado.
 *
 * Es la pieza donde el scroll deja de ser vertical: la sección se fija y los
 * cuatro programas desfilan de costado. Funciona acá y no en cualquier lado
 * porque son pocos ítems comparables entre sí: el gesto lateral se lee como
 * "pasar fichas", que es exactamente lo que querés hacer con una grilla de
 * cursos.
 *
 * Detalles que hacen la diferencia:
 *  - Cada panel tiene parallax interno (la foto se mueve al revés que el
 *    panel), así el movimiento tiene capas y no es un carrusel rígido.
 *  - El fader de cada programa se llena cuando su panel entra en cuadro.
 *  - Debajo de 1024px NO se ancla nada: el scroll horizontal secuestrado en
 *    un teléfono es un problema de accesibilidad, no una feature. Ahí es una
 *    lista vertical normal.
 */
export function ProgramsRail() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add(
        {
          desktop: "(min-width: 1024px) and (prefers-reduced-motion: no-preference)",
          mobile: "(max-width: 1023px), (prefers-reduced-motion: reduce)",
        },
        (ctx) => {
          const { desktop } = ctx.conditions as { desktop: boolean };
          if (!desktop) return;

          const track = root.current?.querySelector<HTMLElement>("[data-rail-track]");
          const panels = gsap.utils.toArray<HTMLElement>("[data-panel]");
          if (!track || !panels.length) return;

          const distance = () => track.scrollWidth - window.innerWidth;

          const scroll = gsap.to(track, {
            x: () => -distance(),
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: () => `+=${distance()}`,
              pin: true,
              scrub: 0.85,
              invalidateOnRefresh: true,
              anticipatePin: 1,
            },
          });

          // Barra de progreso del riel.
          gsap.to("[data-rail-progress]", {
            scaleX: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top top",
              end: () => `+=${distance()}`,
              scrub: true,
            },
          });

          panels.forEach((panel, i) => {
            const img = panel.querySelector("[data-panel-img]");
            const fader = panel.querySelector("[data-fader-fill]");

            // Contra-movimiento de la foto dentro del panel.
            if (img) {
              gsap.fromTo(
                img,
                { xPercent: -9, scale: 1.16 },
                {
                  xPercent: 9,
                  scale: 1.02,
                  ease: "none",
                  scrollTrigger: {
                    trigger: panel,
                    containerAnimation: scroll,
                    start: "left right",
                    end: "right left",
                    scrub: true,
                  },
                },
              );
            }

            // El fader se llena cuando el panel pasa por el centro.
            if (fader) {
              gsap.fromTo(
                fader,
                { scaleY: 0 },
                {
                  scaleY: 1,
                  duration: 1,
                  ease: "juanita",
                  scrollTrigger: {
                    trigger: panel,
                    containerAnimation: scroll,
                    start: "left 72%",
                    once: true,
                  },
                },
              );
            }

            // Contador de panel activo.
            const counter = root.current?.querySelector<HTMLElement>("[data-rail-count]");
            ScrollTrigger.create({
              trigger: panel,
              containerAnimation: scroll,
              start: "left 55%",
              end: "right 55%",
              onToggle: (self) => {
                if (self.isActive && counter) {
                  counter.textContent = String(i + 1).padStart(2, "0");
                }
              },
            });
          });
        },
      );

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="programas"
      data-theme="ink"
      className="relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)] lg:h-screen lg:py-0"
    >
      {/* Encabezado: en desktop flota sobre el riel anclado */}
      <Container wide className="relative z-10 lg:pt-24">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label">Formación</span>
            <SplitReveal as="h2" type="chars" className="t-display h-lg mt-5">
              Programas
            </SplitReveal>
          </div>

          <div className="t-mono hidden items-center gap-4 text-[color:var(--page-faint)] lg:flex">
            <span data-rail-count className="text-red">
              01
            </span>
            <span>/</span>
            <span>{String(PROGRAMS.length).padStart(2, "0")}</span>
            <span className="ml-4 flex items-center gap-2">
              Arrastrá con el scroll <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </Container>

      {/* Riel */}
      <div className="relative mt-12 lg:mt-10">
        <div
          data-rail-track
          className="flex flex-col gap-5 px-[var(--pad)] lg:w-max lg:flex-row lg:gap-8 lg:px-[var(--pad)]"
        >
          {PROGRAMS.map((program, i) => (
            <article
              key={program.slug}
              data-panel
              className="group relative flex w-full shrink-0 flex-col justify-between border border-[color:var(--page-line)] bg-[color:var(--page-bg)] p-6 lg:h-[52vh] lg:w-[min(44vw,600px)] lg:p-8"
            >
              <div className="flex items-start justify-between gap-6">
                <div className="min-w-0">
                  <span className="t-mono text-red">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="t-display-tight mt-3 text-[clamp(26px,3.2vw,44px)] leading-[0.95]">
                    {program.name}
                  </h3>
                  <p className="t-serif mt-2 text-lg text-[color:var(--page-muted)]">
                    {program.tagline}
                  </p>
                </div>

                {/* Fader decorativo: dice "nivel" de un vistazo, sin gráfico de torta */}
                <div className="flex shrink-0 flex-col items-center gap-2">
                  <div className="relative h-24 w-[3px] bg-[color:var(--page-line)]">
                    <div
                      data-fader-fill
                      className="absolute bottom-0 left-0 w-full origin-bottom bg-red"
                      style={{ height: `${program.level}%` }}
                    />
                  </div>
                  <span className="t-mono text-[9px] text-[color:var(--page-faint)]">nivel</span>
                </div>
              </div>

              <div className="relative my-6 h-40 overflow-hidden lg:h-auto lg:flex-1">
                <div data-panel-img className="absolute inset-0">
                  <Image
                    src={program.image}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 46vw"
                    className="duotone object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--page-bg)] via-transparent to-transparent" />
              </div>

              <div>
                <p className="t-body max-w-[46ch] text-sm text-[color:var(--page-muted)]">
                  {program.description}
                </p>

                <ul className="mt-5 flex flex-wrap gap-2">
                  {program.highlights.map((h) => (
                    <li
                      key={h}
                      className="t-mono border border-[color:var(--page-line)] px-2.5 py-1 text-[color:var(--page-faint)]"
                    >
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--page-line)] pt-4">
                  <div className="t-mono text-[color:var(--page-faint)]">
                    <span className="block">{program.duration}</span>
                    <span className="mt-1 block text-[color:var(--page-fg)]">{program.price}</span>
                  </div>
                  <Link
                    href="/programas"
                    data-cursor="ABRIR"
                    className="t-mono link-u text-red"
                  >
                    Ver detalle
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        {/* Progreso del riel */}
        <div className="mx-[var(--pad)] mt-10 hidden h-px bg-[color:var(--page-line)] lg:block">
          <div
            data-rail-progress
            className="h-full origin-left scale-x-0 bg-red"
          />
        </div>
      </div>
    </section>
  );
}
