"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { SERVICES } from "@/data/services";

/**
 * Servicios — alquiler de cabina y grabación de sets.
 *
 * Van en su propia sección y no dentro de Programas a propósito: un
 * programa es una decisión de meses y una reserva es una decisión de diez
 * minutos. Mezclarlos en la misma grilla obliga a filtrar mentalmente antes
 * de entender qué se está mirando.
 *
 * Formato de dos bloques grandes en vez de tarjetas chicas, porque acá lo
 * que convence es el "qué incluye" — y eso necesita lugar para respirar.
 */
export function Services() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReduced()) return;

      gsap.utils.toArray<HTMLElement>("[data-service]").forEach((card) => {
        const media = card.querySelector("[data-service-img]");

        gsap.fromTo(
          card,
          { y: 56, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            ease: "juanita",
            scrollTrigger: { trigger: card, start: "top 84%", once: true },
          },
        );

        if (media) {
          gsap.fromTo(
            media,
            { yPercent: -8, scale: 1.12 },
            {
              yPercent: 8,
              scale: 1,
              ease: "none",
              scrollTrigger: { trigger: card, start: "top bottom", end: "bottom top", scrub: 0.7 },
            },
          );
        }
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="servicios"
      data-theme="bone"
      className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <Container wide>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label">Además de los programas</span>
            <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
              Servicios
            </SplitReveal>
          </div>
          <p className="t-body max-w-[38ch] text-sm text-[color:var(--page-muted)]">
            No hace falta ser alumno. La cabina y el estudio se alquilan por
            hora, con reserva previa.
          </p>
        </div>

        <div className="mt-16 grid gap-6 lg:grid-cols-2 lg:gap-8">
          {SERVICES.map((service, i) => (
            <article
              key={service.slug}
              data-service
              className="group flex flex-col border border-[color:var(--page-line)] bg-[color:var(--page-bg)]"
            >
              <div className="relative h-56 shrink-0 overflow-hidden sm:h-64">
                <div data-service-img className="absolute inset-0">
                  <Image
                    src={service.image}
                    alt=""
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="duotone object-cover"
                  />
                </div>
                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--page-bg)] via-transparent to-transparent" />
                <span className="t-mono absolute left-5 top-5 text-accent">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>

              <div className="flex flex-1 flex-col p-6 sm:p-8">
                <h3 className="t-display-tight text-[clamp(24px,2.4vw,36px)] leading-[0.96]">
                  {service.name}
                </h3>
                <p className="t-serif mt-2 text-lg text-[color:var(--page-muted)]">
                  {service.tagline}
                </p>
                <p className="t-body mt-4 max-w-[48ch] text-sm text-[color:var(--page-muted)]">
                  {service.description}
                </p>

                <div className="mt-6 border-t border-[color:var(--page-line)] pt-5">
                  <span className="t-mono text-[color:var(--page-faint)]">Incluye</span>
                  <ul className="mt-3 grid gap-2">
                    {service.includes.map((item) => (
                      <li key={item} className="t-body flex gap-2.5 text-sm">
                        <span aria-hidden className="text-accent">
                          ·
                        </span>
                        <span className="text-[color:var(--page-muted)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-auto flex flex-wrap items-end justify-between gap-4 border-t border-[color:var(--page-line)] pt-5">
                  <div>
                    <p className="t-display-tight text-2xl">{service.price}</p>
                    <p className="t-mono mt-1 text-[color:var(--page-faint)]">
                      {service.priceNote}
                    </p>
                  </div>
                  <Link
                    href={`/servicios#reservar`}
                    data-cursor="RESERVAR"
                    className="btn"
                  >
                    Reservar
                    <span aria-hidden className="text-[1.25em] leading-none">
                      ↗
                    </span>
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </Container>
    </section>
  );
}
