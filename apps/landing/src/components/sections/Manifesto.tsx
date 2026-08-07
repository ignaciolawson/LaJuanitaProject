"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Fan } from "@/components/brand/Fan";

/**
 * Manifiesto — primera sección en papel.
 *
 * Acá es donde el sitio cambia de tinta a hueso y se nota el salto. Uso el
 * contraste como argumento: el hero es la cabina a oscuras, esto es la
 * charla a la luz del día.
 *
 * El abanico se dibuja con DrawSVG a medida que entra, así el motivo
 * aparece "trazado a mano" en vez de aparecer opacado.
 */
export function Manifesto() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReduced()) return;

      // Trazo del abanico dibujándose con el scroll.
      gsap.fromTo(
        "[data-manifesto-fan] [data-arc]",
        { drawSVG: "50% 50%" },
        {
          drawSVG: "0% 100%",
          ease: "none",
          scrollTrigger: {
            trigger: "[data-manifesto-fan]",
            start: "top 85%",
            end: "center 55%",
            scrub: 0.6,
          },
        },
      );

      gsap.fromTo(
        "[data-manifesto-fan] [data-rib]",
        { scaleY: 0, transformOrigin: "0px 0px" },
        {
          scaleY: 1,
          duration: 1.1,
          ease: "juanita",
          stagger: { each: 0.05, from: "center" },
          scrollTrigger: { trigger: "[data-manifesto-fan]", start: "top 82%", once: true },
        },
      );

      // Revelado de la foto por clip-path: la imagen se "abre" en vez de
      // hacer fade, que es lo que hace todo el mundo.
      gsap.fromTo(
        "[data-clip-img]",
        { clipPath: "inset(0% 0% 100% 0%)" },
        {
          clipPath: "inset(0% 0% 0% 0%)",
          duration: 1.3,
          ease: "swipe",
          scrollTrigger: { trigger: "[data-clip-img]", start: "top 80%", once: true },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      data-theme="bone"
      className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <Container wide className="relative">
        <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
          <div className="lg:col-span-7">
            <span className="label">Qué es esto</span>

            <SplitReveal
              as="p"
              type="words"
              className="t-display-tight h-lg mt-8 max-w-[15ch] normal-case"
            >
              No enseñamos botones. Enseñamos criterio.
            </SplitReveal>

            <div className="mt-10 max-w-[52ch] space-y-5 text-[color:var(--page-muted)]">
              <SplitReveal as="p" type="lines" className="t-body">
                La Juanita nació de gente que toca, produce y edita. Por eso el
                programa no arranca por el software: arranca por escuchar. Qué
                hace que una pista funcione a las tres de la mañana, por qué un
                kick te empuja y otro te deja parado, cuándo conviene no meter
                nada.
              </SplitReveal>
              <SplitReveal as="p" type="lines" className="t-body">
                Después sí, la técnica. Mezcla armónica, diseño de sonido,
                mastering en una sala que no te miente. Y un sello atrás para
                que lo que produzcas termine publicado y no archivado.
              </SplitReveal>
            </div>

            <dl className="mt-14 grid grid-cols-2 gap-x-6 gap-y-8 sm:grid-cols-3">
              {[
                { k: "Grupos", v: "Reducidos", d: "Tiempo real en cabina, no mirar de atrás." },
                { k: "Sala", v: "Tratada", d: "Referencia acústica propia para mastering." },
                { k: "Salida", v: "Sello", d: "Tus tracks publicados por La Juanita Records." },
              ].map((item) => (
                <div key={item.k} className="border-t border-[color:var(--page-line)] pt-4">
                  <dt className="t-mono text-[color:var(--page-faint)]">{item.k}</dt>
                  <dd className="t-display-tight mt-2 text-2xl">{item.v}</dd>
                  <dd className="t-body mt-2 text-sm text-[color:var(--page-muted)]">{item.d}</dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Columna derecha: foto + abanico dibujándose */}
          <div className="relative lg:col-span-5">
            <div
              data-clip-img
              data-speed="0.92"
              className="group relative aspect-[3/4] w-full overflow-hidden"
            >
              <Image
                src="/images/estudio/equipos.jpg"
                alt="Equipamiento Pioneer DJ en la cabina de La Juanita Studio"
                fill
                sizes="(max-width: 1024px) 100vw, 40vw"
                className="duotone object-cover"
              />
              <span className="t-mono absolute bottom-4 left-4 bg-ink/70 px-2.5 py-1.5 text-bone">
                Cabina · Sede Pilar
              </span>
            </div>

            <div
              data-manifesto-fan
              data-speed="1.1"
              className="pointer-events-none absolute -bottom-16 -left-10 w-56 text-[color:var(--page-fg)] opacity-[0.16] sm:w-72"
            >
              <Fan ribs={13} spread={150} strokeWidth={1.6} />
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
