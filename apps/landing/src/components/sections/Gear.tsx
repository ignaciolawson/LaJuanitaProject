"use client";

import { useRef } from "react";
import Link from "next/link";
import { Disc3, Speaker, Headphones, Cable } from "lucide-react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { VelocityMarquee } from "@/components/motion/VelocityMarquee";
import { GEAR } from "@/data/gear";

const ICONS = {
  controller: Disc3,
  monitor: Speaker,
  headphones: Headphones,
  accessories: Cable,
} as const;

/**
 * La Juanita Shop — venta de equipamiento.
 *
 * La tira roja de "DJ SHOP" está calcada del posteo de Instagram: es un
 * elemento que la marca ya usa, así que traerlo a la web hace que el local
 * y el sitio se reconozcan entre sí. Además es el único lugar del sistema
 * donde el rojo ocupa una banda entera — señal de que acá se vende, no se
 * enseña.
 *
 * Sin precios ni modelos: la conversión es la consulta, que es como venden
 * ellos. Ver `data/gear.ts` para el razonamiento completo.
 */
export function Gear() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReduced()) return;

      gsap.fromTo(
        "[data-gear-card]",
        { y: 44, opacity: 0 },
        {
          y: 0,
          opacity: 1,
          duration: 0.95,
          ease: "juanita",
          stagger: 0.08,
          scrollTrigger: { trigger: "[data-gear-grid]", start: "top 82%", once: true },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="equipos"
      data-theme="ink"
      className="relative overflow-hidden bg-[color:var(--page-bg)] text-[color:var(--page-fg)]"
    >
      {/* Banda roja, como en el posteo */}
      <div className="bg-red text-white">
        <VelocityMarquee
          className="t-display-tight py-3 text-[clamp(26px,3.6vw,52px)] leading-none"
          speed={26}
          separator="—"
          items={["DJ Shop", "DJ Shop", "DJ Shop", "DJ Shop"]}
        />
      </div>

      <Container wide className="py-[var(--gap)]">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label">La Juanita Shop</span>
            <SplitReveal as="h2" type="chars" className="t-display h-md mt-5 max-w-[14ch]">
              Armá tu setup
            </SplitReveal>
          </div>
          <p className="t-body max-w-[40ch] text-sm text-[color:var(--page-muted)]">
            Estés dando tus primeros pasos o renovando la cabina entera, acá
            conseguís el equipamiento — y el asesoramiento para no comprar de
            más.
          </p>
        </div>

        <div data-gear-grid className="mt-16 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {GEAR.map((category) => {
            const Icon = ICONS[category.icon];
            return (
              <article
                key={category.slug}
                data-gear-card
                className="group flex flex-col border border-[color:var(--page-line)] p-6 transition-colors hover:border-red"
              >
                <Icon
                  size={26}
                  strokeWidth={1.4}
                  aria-hidden
                  className="text-red transition-transform duration-500 group-hover:scale-110"
                />

                <h3 className="t-display-tight mt-6 text-2xl leading-tight">{category.name}</h3>
                <p className="t-serif mt-1.5 text-base text-[color:var(--page-muted)]">
                  {category.tagline}
                </p>

                <ul className="mt-6 space-y-2 border-t border-[color:var(--page-line)] pt-5">
                  {category.covers.map((item) => (
                    <li
                      key={item}
                      className="t-body flex gap-2.5 text-sm text-[color:var(--page-muted)]"
                    >
                      <span aria-hidden className="text-red">
                        ·
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </article>
            );
          })}
        </div>

        <div className="mt-12 flex flex-wrap items-center gap-x-8 gap-y-4 border-t border-[color:var(--page-line)] pt-8">
          <Link href="/equipos" data-cursor="VER" className="btn btn--solid">
            Ver equipos y consultar
            <span aria-hidden className="text-[1.25em] leading-none">
              ↗
            </span>
          </Link>
          <p className="t-mono max-w-[38ch] text-[color:var(--page-faint)]">
            Te asesoramos según tu nivel, presupuesto y dónde vas a tocar
          </p>
        </div>
      </Container>
    </section>
  );
}
