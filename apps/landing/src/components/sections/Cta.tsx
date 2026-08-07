"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { Magnetic } from "@/components/motion/Magnetic";
import { ArcText } from "@/components/brand/ArcText";
import { Fan } from "@/components/brand/Fan";
import { CONTACT } from "@/data/contact";

/**
 * Cierre.
 *
 * El wordmark arqueado de la marca, hecho tipografía, abriéndose desde el
 * centro mientras entra; y el abanico completándose detrás. Es el mismo
 * gesto del preloader, cerrando el círculo al final del scroll.
 */
export function Cta() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      if (prefersReduced()) return;

      gsap.fromTo(
        "[data-cta-arc]",
        { scale: 0.82, opacity: 0, yPercent: 12 },
        {
          scale: 1,
          opacity: 1,
          yPercent: 0,
          duration: 1.4,
          ease: "juanita",
          scrollTrigger: { trigger: root.current, start: "top 78%", once: true },
        },
      );

      gsap.fromTo(
        "[data-cta-fan] [data-rib]",
        { rotate: 0, transformOrigin: "0px 0px" },
        {
          rotate: (i: number, _target: Element, targets: Element[]) =>
            -78 + i * (156 / (targets.length - 1)),
          ease: "none",
          scrollTrigger: {
            trigger: root.current,
            start: "top 90%",
            end: "center 55%",
            scrub: 0.8,
          },
        },
      );
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="contacto"
      data-theme="ink"
      className="relative overflow-hidden bg-[color:var(--page-bg)] pb-[var(--gap)] pt-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <div
        data-cta-fan
        className="pointer-events-none absolute inset-x-0 top-1/3 mx-auto w-[min(120vw,1100px)] text-[color:var(--page-fg)] opacity-[0.07]"
      >
        <Fan ribs={15} spread={156} strokeWidth={1.4} />
      </div>

      <Container wide className="relative text-center">
        <span className="label justify-center">Último paso</span>

        {/* El ArcText es un SVG decorativo (aria-hidden). El encabezado real
            va acá para lectores de pantalla y para el esquema del documento. */}
        <h2 className="sr-only">La Juanita — sumate</h2>
        <div data-cta-arc className="mx-auto mt-10 max-w-[900px] text-[color:var(--page-fg)]">
          <ArcText text="LA JUANITA" bend={64} />
        </div>

        <p className="t-body mx-auto mt-4 max-w-[42ch] text-[color:var(--page-muted)]">
          Contanos en qué andás — si arrancás de cero, si ya producís, o si sólo
          querés masterizar un track. Te decimos por dónde conviene empezar.
        </p>

        <div className="mt-12 flex flex-wrap justify-center gap-3">
          <Magnetic strength={0.32}>
            <a
              href={`https://wa.me/${CONTACT.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="WHATSAPP"
              className="btn btn--solid"
            >
              Escribinos por WhatsApp
            </a>
          </Magnetic>
          <Magnetic strength={0.32}>
            <a href={`mailto:${CONTACT.email}`} data-cursor="MAIL" className="btn">
              {CONTACT.email}
            </a>
          </Magnetic>
        </div>
      </Container>
    </section>
  );
}
