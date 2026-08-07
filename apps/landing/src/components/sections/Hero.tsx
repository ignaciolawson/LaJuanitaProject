"use client";

import { useRef } from "react";
import Image from "next/image";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { Magnetic } from "@/components/motion/Magnetic";
import { Fan } from "@/components/brand/Fan";
import { CONTACT } from "@/data/contact";

/**
 * Hero.
 *
 * La idea: el abanico de la marca ES el hero. Entra cerrado, se abre con la
 * entrada y se vuelve a cerrar (y a hundir) mientras scrolleás, así el
 * símbolo hace de transición hacia la sección siguiente en vez de quedarse
 * pegado de fondo.
 *
 * El titular está partido en tres líneas con máscara propia y desfase
 * horizontal — no es un bloque centrado. La palabra "pista" va en cursiva
 * serif: un solo acento tipográfico que rompe el grotesco y le da voz.
 */
export function Hero() {
  const root = useRef<HTMLElement>(null);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const ribs = el.querySelectorAll("[data-rib]");
      const reduce = prefersReduced();

      if (reduce) {
        gsap.set("[data-hero-line] > span, [data-hero-fade]", { yPercent: 0, opacity: 1 });
        gsap.set(ribs, {
          rotate: (i: number) => -78 + i * (156 / (ribs.length - 1)),
          transformOrigin: "0px 0px",
        });
        return;
      }

      // Estado inicial explícito. Ojo: NO se puede dejar en clases de
      // Tailwind (`translate-y-3`), porque Tailwind v4 escribe la propiedad
      // `translate` y GSAP escribe `transform`: conviven, y el elemento
      // queda 12px corrido para siempre aunque GSAP lo lleve a y:0.
      gsap.set("[data-hero-fade]", { y: 14, opacity: 0 });

      // La entrada del hero se encadena a la cortina del preloader por
      // evento. Si la intro ya se vio en esta sesión, arranca sola.
      const tl = gsap.timeline({ paused: true });

      tl.set(ribs, { rotate: 0, transformOrigin: "0px 0px", opacity: 0 })
        .to(ribs, { opacity: 1, duration: 0.4, stagger: { each: 0.02, from: "center" } })
        .to(
          ribs,
          {
            rotate: (i: number) => -78 + i * (156 / (ribs.length - 1)),
            duration: 1.6,
            ease: "juanita",
            stagger: { each: 0.045, from: "center" },
          },
          "<",
        )
        .to("[data-arc]", { drawSVG: "0% 100%", duration: 1.1, ease: "juanita" }, "-=1.1")
        // Cada línea del titular sube desde su máscara, con desfase.
        .to(
          "[data-hero-line] > span",
          { yPercent: 0, duration: 1.15, ease: "juanita", stagger: 0.085 },
          "-=1.35",
        )
        .to(
          "[data-hero-fade]",
          { opacity: 1, y: 0, duration: 0.85, stagger: 0.09, ease: "juanita" },
          "-=0.7",
        );

      const seen = sessionStorage.getItem("lj:intro") === "1";
      if (seen) {
        gsap.delayedCall(0.12, () => tl.play());
      } else {
        window.addEventListener("lj:intro-curtain", () => tl.play(), { once: true });
        // Red de seguridad: si el preloader nunca emite (error, JS a medias),
        // el hero se muestra igual en vez de quedar en blanco.
        gsap.delayedCall(4.5, () => {
          if (!tl.isActive() && tl.progress() === 0) tl.play();
        });
      }

      // ── Salida con el scroll ──────────────────────────────────────────
      // El abanico se cierra y baja: el símbolo "guarda" el hero.
      gsap.to(ribs, {
        rotate: (i: number) => (-78 + i * (156 / (ribs.length - 1))) * 0.18,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.7 },
      });

      gsap.to("[data-hero-fan]", {
        yPercent: 32,
        scale: 0.82,
        opacity: 0.25,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.7 },
      });

      // El texto sube más rápido que el fondo: profundidad sin 3D.
      gsap.to("[data-hero-copy]", {
        yPercent: -22,
        opacity: 0,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom 40%", scrub: 0.5 },
      });

      gsap.to("[data-hero-img]", {
        yPercent: 14,
        scale: 1.12,
        ease: "none",
        scrollTrigger: { trigger: el, start: "top top", end: "bottom top", scrub: 0.7 },
      });
    },
    { scope: root },
  );

  return (
    <section
      ref={root}
      id="top"
      data-theme="ink"
      className="relative flex min-h-[100svh] flex-col justify-end overflow-hidden pb-[clamp(28px,6vh,64px)] pt-32"
    >
      {/* Fondo: foto de la sala, muy apagada. Es atmósfera, no protagonista. */}
      <div className="absolute inset-0 -z-10">
        <div data-hero-img className="absolute inset-0">
          <Image
            src="/images/estudio/sala-mastering.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-[0.16] grayscale"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/85 to-ink/45" />
      </div>

      {/* El abanico, grande y descentrado a la derecha */}
      <div
        data-hero-fan
        className="pointer-events-none absolute -right-[12%] top-[6%] -z-10 w-[min(92vw,880px)] text-bone/[0.13] sm:right-[-6%] lg:right-[-2%] lg:top-[2%]"
      >
        <Fan ribs={15} spread={156} strokeWidth={1.5} />
      </div>

      <Container wide className="relative">
        <div data-hero-copy>
          <span
            data-hero-fade
            className="label"
          >
            Academia · Estudio · Sello — Pilar, Bs As
          </span>

          <h1 className="chromatic mt-7 max-w-[16ch]">
            {[
              { text: "De Pilar", offset: "" },
              { text: "a la", offset: "pl-[6vw] sm:pl-[9vw]" },
            ].map((line) => (
              <span
                key={line.text}
                data-hero-line
                className={`block ${line.offset}`}
              >
                <span className="t-display h-xl block will-change-transform">
                  {line.text}
                </span>
              </span>
            ))}
            <span data-hero-line className="block pl-[3vw] sm:pl-[5vw]">
              <span className="t-serif h-xl block normal-case text-red will-change-transform">
                pista
              </span>
            </span>
          </h1>

          <div className="mt-12 grid gap-10 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <p
              data-hero-fade
              className="t-body max-w-[46ch] text-[clamp(16px,1.2vw,20px)] text-bone/[0.88]"
            >
              Aprendés a mezclar y a producir sobre equipamiento Pioneer DJ real,
              masterizás en una sala tratada, y salís con un sello atrás para que
              el track no se te quede en la carpeta de descargas.
            </p>

            <div
              data-hero-fade
              className="flex flex-wrap items-center gap-3"
            >
              <Magnetic strength={0.3}>
                <a href="#programas" data-cursor="VER" className="btn btn--solid">
                  Ver programas
                </a>
              </Magnetic>
              <Magnetic strength={0.3}>
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  data-cursor="WHATSAPP"
                  className="btn btn--strong"
                >
                  Escribinos
                </a>
              </Magnetic>
            </div>
          </div>
        </div>
      </Container>

      {/* Barra de cabina: metadatos chicos, alineados al pie */}
      <Container wide className="relative mt-14">
        <div
          data-hero-fade
          className="t-mono flex flex-wrap items-center justify-between gap-x-8 gap-y-3 border-t border-bone/20 pt-5 text-bone/65"
        >
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red blink" />
            Inscripciones abiertas
          </span>
          <span className="hidden sm:inline">CDJ-3000 · DJM · Ableton Live</span>
          <span className="hidden md:inline">Sala tratada acústicamente</span>
          <a href="#programas" className="link-u flex items-center gap-2">
            Scrolleá <span aria-hidden>↓</span>
          </a>
        </div>
      </Container>
    </section>
  );
}
