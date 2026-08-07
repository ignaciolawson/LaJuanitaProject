"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { TEACHERS } from "@/data/teachers";

/**
 * Profesores — reparto en abanico.
 *
 * Las fichas entran apiladas y se abren igual que las varillas del logo.
 * Es la traducción más literal de la marca a movimiento, y de paso resuelve
 * un problema real: tres retratos en fila son tres cards; tres retratos que
 * se abren desde un mismo punto se leen como un equipo.
 *
 * La apertura va con scrub, así podés "abrir y cerrar" el abanico
 * scrolleando para arriba y para abajo.
 */
export function Teachers() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-teacher]");
      if (!cards.length) return;

      if (prefersReduced()) {
        gsap.set(cards, { rotate: 0, x: 0, y: 0, opacity: 1 });
        return;
      }

      const mid = (cards.length - 1) / 2;

      cards.forEach((card, i) => {
        const t = i - mid;

        gsap.fromTo(
          card,
          {
            rotate: 0,
            x: 0,
            y: 60,
            opacity: 0,
            transformOrigin: "50% 130%",
          },
          {
            rotate: t * 7.5,
            x: t * 30,
            y: Math.abs(t) * 22,
            opacity: 1,
            ease: "none",
            scrollTrigger: {
              trigger: root.current,
              start: "top 78%",
              end: "top 22%",
              scrub: 0.8,
            },
          },
        );
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-theme="ink"
      className="relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <Container wide>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label">Quién enseña</span>
            <SplitReveal as="h2" type="chars" className="t-display h-lg mt-5">
              Profes
            </SplitReveal>
          </div>
          <p className="t-body max-w-[36ch] text-sm text-[color:var(--page-muted)]">
            Artistas y productores en actividad. No es gente que enseña lo que
            leyó: es gente que está tocando y publicando ahora.
          </p>
        </div>

        <div className="mt-20 flex flex-wrap justify-center gap-6 pb-16 sm:gap-8 lg:flex-nowrap">
          {TEACHERS.map((teacher) => (
            <article
              key={teacher.name}
              data-teacher
              data-cursor="ARTISTA"
              className="group relative w-full max-w-[340px] shrink-0 will-change-transform"
            >
              <div className="relative aspect-[4/5] overflow-hidden border border-[color:var(--page-line)] bg-ink-2">
                <Image
                  src={teacher.image}
                  alt={`${teacher.name} — ${teacher.role}`}
                  fill
                  sizes="(max-width: 640px) 90vw, 340px"
                  className="duotone object-cover transition-transform duration-700 group-hover:scale-[1.05]"
                />
                <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-ink to-transparent" />

                {/* Nombre montado sobre la foto, no debajo */}
                <div className="absolute inset-x-0 bottom-0 p-5">
                  <h3 className="t-display-tight text-3xl text-bone">{teacher.name}</h3>
                  <p className="t-mono mt-2 text-red">{teacher.role}</p>
                </div>
              </div>

              <p className="t-body mt-4 text-sm text-[color:var(--page-muted)]">{teacher.bio}</p>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
