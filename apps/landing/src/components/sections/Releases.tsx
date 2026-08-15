"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { gsap, useGSAP, ScrollTrigger, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { RELEASES } from "@/data/releases";

/**
 * Sello — fichas que se apilan.
 *
 * Cada lanzamiento se ancla arriba y el siguiente se le monta encima,
 * escalando y apagando al que quedó atrás. Es una pila de vinilos: ocupa la
 * altura de una sección pero deja ver los cuatro releases sin que tengas
 * que pasar un carrusel a mano.
 *
 * ⚠️ Está resuelto con `pin` de ScrollTrigger y NO con `position: sticky`,
 * que es lo natural para este efecto. Motivo: ScrollSmoother envuelve todo
 * en un contenedor con `overflow: hidden` y un transform; ahí sticky se
 * ancla al wrapper (que nunca scrollea) y el efecto no pasa nunca. Con
 * `pinSpacing: false` el pin da el mismo resultado y sobrevive al smoother.
 */
export function Releases() {
  const root = useRef<HTMLElement>(null);
  const list = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (prefersReduced()) return;

      const cards = gsap.utils.toArray<HTMLElement>("[data-release]");
      if (!cards.length || !list.current) return;

      // Sólo apilar en pantallas donde el anclaje tiene sentido.
      //
      // El corte estaba en 768px y subió a 1024px con alto mínimo. Motivo: la
      // ficha recién se acomoda en una fila (disco | texto | datos) a partir
      // de `lg`; abajo de eso va en columna y mide ~550px de alto. Un teléfono
      // acostado entra por 768px de ANCHO pero tiene 390px de alto: la ficha
      // se anclaba a 120px del borde superior y le quedaba la mitad afuera de
      // la pantalla, tapada por la siguiente. El `min-height` es lo que
      // realmente importa acá y el ancho solo no lo dice.
      const mm = gsap.matchMedia();

      mm.add("(min-width: 1024px) and (min-height: 700px)", () => {
        const triggers: ScrollTrigger[] = [];

        cards.forEach((card, i) => {
          gsap.set(card, { zIndex: i + 1 });

          triggers.push(
            ScrollTrigger.create({
              trigger: card,
              start: "top 120px",
              endTrigger: list.current,
              end: "bottom 480px",
              pin: true,
              pinSpacing: false,
              invalidateOnRefresh: true,
            }),
          );

          // La ficha que queda atrás se achica y se apaga.
          if (i < cards.length - 1) {
            gsap.to(card.querySelector("[data-release-inner]"), {
              scale: 0.93,
              opacity: 0.4,
              ease: "none",
              scrollTrigger: {
                trigger: cards[i + 1],
                start: "top bottom",
                end: "top 120px",
                scrub: true,
              },
            });
          }
        });

        return () => triggers.forEach((t) => t.kill());
      });

      // El disco gira mientras la ficha está en cuadro (en todos los tamaños).
      cards.forEach((card) => {
        const disc = card.querySelector("[data-disc]");
        if (!disc) return;
        gsap.to(disc, {
          rotate: 360,
          ease: "none",
          scrollTrigger: {
            trigger: card,
            start: "top bottom",
            end: "bottom top",
            scrub: 1.2,
          },
        });
      });

      return () => mm.revert();
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="sello"
      data-theme="ink"
      className="relative bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <Container wide>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label">La Juanita Records</span>
            <SplitReveal as="h2" type="chars" className="t-display h-lg mt-5">
              El sello
            </SplitReveal>
          </div>
          <p className="t-body max-w-[34ch] text-sm text-[color:var(--page-muted)]">
            Lo que se produce acá tiene dónde salir. Distribución, arte y
            mastering incluidos.
          </p>
        </div>
      </Container>

      <div ref={list} className="mt-16 space-y-8 md:space-y-10">
        {RELEASES.map((release, i) => (
          <div key={release.title} data-release>
            <Container wide>
              <article
                data-release-inner
                data-cursor="ESCUCHAR"
                className="group grid origin-top items-center gap-8 border border-[color:var(--page-line)] bg-ink-2 p-6 sm:p-9 lg:grid-cols-[auto_minmax(0,1fr)_auto]"
              >
                {/* Disco + arte de tapa */}
                <div className="relative h-40 w-40 shrink-0 sm:h-52 sm:w-52">
                  <div
                    data-disc
                    className="absolute inset-0 rounded-full bg-ink-3"
                    style={{
                      backgroundImage:
                        "repeating-radial-gradient(circle at center, rgba(232,225,212,0.07) 0 1px, transparent 1px 4px)",
                    }}
                  />
                  <div className="absolute inset-[14%] overflow-hidden rounded-full">
                    <Image
                      src={release.image}
                      alt={`Arte de tapa de ${release.title}`}
                      fill
                      sizes="208px"
                      className="duotone object-cover"
                    />
                  </div>
                  <span className="absolute left-1/2 top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[color:var(--page-bg)]" />
                </div>

                <div className="min-w-0">
                  <span className="t-mono text-accent">
                    {String(i + 1).padStart(2, "0")} — {release.genre}
                  </span>
                  <h3 className="t-display-tight mt-3 text-[clamp(30px,4.4vw,62px)] leading-[0.94]">
                    {release.title}
                  </h3>
                  <p className="t-serif mt-2 text-xl text-[color:var(--page-muted)]">
                    {release.artist}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-6 lg:flex-col lg:items-end lg:gap-4">
                  <span className="t-mono text-[color:var(--page-faint)]">{release.date}</span>
                  <Link
                    href={release.url}
                    className="btn"
                    {...(release.url.startsWith("http")
                      ? { target: "_blank", rel: "noopener noreferrer" }
                      : {})}
                  >
                    Escuchar
                  </Link>
                </div>
              </article>
            </Container>
          </div>
        ))}
      </div>
    </section>
  );
}
