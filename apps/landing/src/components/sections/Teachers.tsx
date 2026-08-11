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
 *
 * ⚠️ EL ABANICO ES SÓLO DE ESCRITORIO, Y NO ES UNA CUESTIÓN DE GUSTO.
 *
 * El gesto abre las fichas hacia los costados desde un origen común: la de la
 * izquierda se corre 30px a la izquierda y gira -7.5°, la de la derecha al
 * revés. Eso se lee como un abanico únicamente cuando las tres están EN FILA,
 * que es lo que hace `lg:flex-nowrap`. Abajo de 1024px se apilan en columna, y
 * el mismo tween deja tres fichas sueltas, cada una torcida para un lado
 * distinto y corrida fuera del margen — con `overflow-hidden` en la sección,
 * en un teléfono de 390px la ficha desplazada quedaba recortada contra el
 * borde. Se veía como una tarjeta rota, no como un abanico.
 *
 * Abajo de 1024px entran de a una, derechas y hacia arriba.
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
      const mm = gsap.matchMedia();

      // Escritorio: el abanico completo, con scrub.
      mm.add("(min-width: 1024px)", () => {
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
      });

      // Móvil y tablet: entrada simple, sin rotar ni correr de costado.
      mm.add("(max-width: 1023px)", () => {
        cards.forEach((card, i) => {
          gsap.fromTo(
            card,
            { y: 44, opacity: 0, rotate: 0, x: 0 },
            {
              y: 0,
              opacity: 1,
              rotate: 0,
              x: 0,
              duration: 0.9,
              delay: i * 0.08,
              ease: "juanita",
              scrollTrigger: { trigger: card, start: "top 88%", once: true },
            },
          );
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-theme="bone"
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

        {/* `pb-16` compensa el desplazamiento hacia abajo de las fichas de los
            extremos, que sólo existe en el abanico: abajo de 1024px no hay
            nada que compensar y son 64px de aire de más. */}
        <div className="mt-14 flex flex-wrap justify-center gap-6 sm:mt-20 sm:gap-8 lg:flex-nowrap lg:pb-16">
          {TEACHERS.map((teacher) => (
            <article
              key={teacher.name}
              data-teacher
              data-cursor="ARTISTA"
              /* `will-change` sólo donde hay abanico. Sostiene una capa de
                 compositor por ficha con un retrato adentro, y en móvil son
                 tres capas permanentes por una animación de entrada que ocurre
                 una vez y que GSAP ya promueve mientras dura. */
              className="group relative w-full max-w-[340px] shrink-0 lg:will-change-transform"
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
