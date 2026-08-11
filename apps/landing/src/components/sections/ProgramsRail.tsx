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
 * La sección se fija y los tres programas desfilan de costado. Funciona acá
 * y no en cualquier lado porque son pocos ítems comparables entre sí: el
 * gesto lateral se lee como "pasar fichas".
 *
 * FIX (bug reportado: el texto se salía de las tarjetas). La versión previa
 * fijaba la altura del panel en `52vh` y metía adentro imagen + descripción
 * + chips + pie. En viewports bajos o con textos más largos el contenido
 * desbordaba el borde. Ahora:
 *   - El panel define alto por contenido con un `rail:h-full` dentro de un
 *     riel de altura acotada, y la imagen es la que cede espacio (`flex-1`
 *     con `min-h-0`), no el texto.
 *   - La descripción se limita con `line-clamp-3`: la tarjeta es un
 *     resumen, el texto completo vive en la página de detalle.
 *   - Los chips se limitan a tres y el pie queda anclado con `mt-auto`.
 */
export function ProgramsRail() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      // El `(hover: hover)` es nuevo y es deliberado. La condición era sólo de
      // ancho, así que una tablet en horizontal (un iPad Pro mide 1366px)
      // entraba al riel: y ahí el secuestro del scroll es peor que en un
      // teléfono, no mejor. Con rueda de mouse el gesto es indirecto y el
      // desplazamiento lateral se lee como una consecuencia; con el dedo, uno
      // arrastra para ARRIBA y la pantalla se mueve para el COSTADO. Se siente
      // como que la página se rompió, y no hay forma de salir salvo seguir
      // arrastrando. Abajo de eso queda la lista vertical, que en una tablet
      // se ve perfecta igual.
      mm.add(
        {
          desktop:
            "(min-width: 1024px) and (hover: hover) and (prefers-reduced-motion: no-preference)",
          mobile: "(max-width: 1023px), (hover: none), (prefers-reduced-motion: reduce)",
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

          const counter = root.current?.querySelector<HTMLElement>("[data-rail-count]");

          panels.forEach((panel, i) => {
            const img = panel.querySelector("[data-panel-img]");
            const fader = panel.querySelector("[data-fader-fill]");

            if (img) {
              gsap.fromTo(
                img,
                { xPercent: -8, scale: 1.14 },
                {
                  xPercent: 8,
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
      className="relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)] rail:flex rail:h-screen rail:flex-col rail:justify-center rail:py-0"
    >
      <Container wide className="relative z-10 shrink-0">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label">Formación</span>
            <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
              Programas
            </SplitReveal>
          </div>

          <div className="t-mono hidden items-center gap-4 text-[color:var(--page-faint)] rail:flex">
            <span data-rail-count className="text-red">
              01
            </span>
            <span>/</span>
            <span>{String(PROGRAMS.length).padStart(2, "0")}</span>
            <span className="ml-4 flex items-center gap-2">
              Pasá con el scroll <span aria-hidden>→</span>
            </span>
          </div>
        </div>
      </Container>

      {/* Riel. En desktop tiene altura acotada; adentro, la imagen es la que
          cede espacio para que el texto nunca desborde el borde. */}
      <div className="relative mt-10 rail:mt-8 rail:h-[min(58vh,560px)]">
        <div
          data-rail-track
          className="flex h-full flex-col gap-5 px-[var(--pad)] rail:w-max rail:flex-row rail:gap-8"
        >
          {PROGRAMS.map((program, i) => (
            <article
              key={program.slug}
              data-panel
              className="group relative flex w-full shrink-0 flex-col border border-[color:var(--page-line)] bg-[color:var(--page-bg)] p-6 rail:h-full rail:w-[min(42vw,560px)] rail:p-7"
            >
              <div className="flex shrink-0 items-start justify-between gap-5">
                <div className="min-w-0">
                  <span className="t-mono text-red">{String(i + 1).padStart(2, "0")}</span>
                  <h3 className="t-display-tight mt-2 text-[clamp(24px,2.6vw,38px)] leading-[0.96]">
                    {program.name}
                  </h3>
                  <p className="t-serif mt-1.5 text-base text-[color:var(--page-muted)] sm:text-lg">
                    {program.tagline}
                  </p>
                </div>

                <div className="flex shrink-0 flex-col items-center gap-2">
                  <div className="relative h-20 w-[3px] bg-[color:var(--page-line)]">
                    <div
                      data-fader-fill
                      className="absolute bottom-0 left-0 w-full origin-bottom bg-red"
                      style={{ height: `${program.level}%` }}
                    />
                  </div>
                  <span className="t-mono text-[9px] text-[color:var(--page-faint)]">nivel</span>
                </div>
              </div>

              {/* min-h-0 es lo que permite que este bloque se comprima en vez
                  de empujar al pie fuera de la tarjeta. */}
              {program.cardImage !== false && (
                /* En tablet la tarjeta ocupa el ancho completo y la foto de
                   128px quedaba como una franja: se le da altura hasta que el
                   riel horizontal toma el control en `lg`. */
                <div className="relative my-5 h-32 min-h-0 shrink overflow-hidden sm:h-56 rail:h-auto rail:flex-1">
                  <div data-panel-img className="absolute inset-0">
                    <Image
                      src={program.image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="duotone object-cover"
                    />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--page-bg)] via-transparent to-transparent" />
                </div>
              )}

              <div className="mt-auto shrink-0">
                <p className="t-body line-clamp-3 max-w-[46ch] text-sm text-[color:var(--page-muted)]">
                  {program.description}
                </p>

                <ul className="mt-4 flex flex-wrap gap-2">
                  {program.highlights.slice(0, 3).map((h) => (
                    <li
                      key={h}
                      className="t-mono border border-[color:var(--page-line)] px-2.5 py-1 text-[color:var(--page-faint)]"
                    >
                      {h}
                    </li>
                  ))}
                </ul>

                <div className="mt-5 flex flex-wrap items-center justify-between gap-4 border-t border-[color:var(--page-line)] pt-4">
                  <div className="t-mono text-[color:var(--page-faint)]">
                    <span className="block">{program.duration}</span>
                    <span className="mt-1 block text-[color:var(--page-fg)]">{program.price}</span>
                  </div>
                  <Link
                    href={`/programas/${program.slug}`}
                    data-cursor={program.cta === "apply" ? "INSCRIBIRME" : "CONSULTAR"}
                    className="t-mono link-u text-red"
                  >
                    {program.cta === "apply" ? "Ver e inscribirme" : "Ver y consultar"}
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>

        <div className="mx-[var(--pad)] mt-8 hidden h-px bg-[color:var(--page-line)] rail:block">
          <div data-rail-progress className="h-full origin-left scale-x-0 bg-red" />
        </div>
      </div>
    </section>
  );
}
