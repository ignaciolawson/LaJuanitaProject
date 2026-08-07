"use client";

import { useRef } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RevealText } from "@/components/RevealText";

export function Hero() {
  const sectionRef = useRef<HTMLElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!bgRef.current || !sectionRef.current) return;

      gsap.from("[data-hero-fade]", {
        opacity: 0,
        y: 16,
        duration: 0.6,
        delay: 1,
        stagger: 0.1,
        ease: "power2.out",
      });

      // Parallax + slow zoom-out on the background image.
      gsap.fromTo(
        bgRef.current,
        { scale: 1.25 },
        {
          scale: 1.05,
          ease: "none",
          scrollTrigger: {
            trigger: sectionRef.current,
            start: "top top",
            end: "bottom top",
            scrub: 0.6,
          },
        },
      );
      gsap.to(bgRef.current, {
        yPercent: 15,
        ease: "none",
        scrollTrigger: {
          trigger: sectionRef.current,
          start: "top top",
          end: "bottom top",
          scrub: 0.6,
        },
      });
    },
    { scope: sectionRef },
  );

  return (
    <section
      id="top"
      ref={sectionRef}
      className="relative flex min-h-[100svh] items-end overflow-hidden bg-bg pb-20 sm:items-center sm:pb-0"
    >
      <div className="absolute inset-0 overflow-hidden">
        <div ref={bgRef} className="absolute inset-0 h-full w-full">
          <Image
            src="/images/estudio/sala-mastering.jpg"
            alt=""
            fill
            priority
            sizes="100vw"
            className="object-cover opacity-50"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-bg/70 via-bg/60 to-bg" />
        <div className="absolute inset-0 bg-gradient-to-r from-bg via-bg/10 to-transparent" />
      </div>

      <Container className="relative z-10 pt-24">
        <span
          data-hero-fade
          className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-red opacity-0"
        >
          Academia de DJ · Producción · Sello discográfico
        </span>

        <RevealText
          as="h1"
          trigger="load"
          delay={0.2}
          className="chromatic mt-6 max-w-3xl font-display text-[13vw] font-bold leading-[1.02] tracking-tight text-white sm:text-[7vw] lg:text-[6rem]"
        >
          Llevá tu <span className="text-red">sonido</span>{" "}
          <span className="font-normal text-text-secondary">al siguiente nivel</span>
        </RevealText>

        <p
          data-hero-fade
          className="mt-8 max-w-lg text-lg leading-relaxed text-text-secondary opacity-0"
        >
          Formate en DJ y producción de música electrónica con equipamiento
          profesional Pioneer DJ, sala de mastering propia, y un sello
          discográfico detrás tuyo. Sede Pilar.
        </p>

        <div
          data-hero-fade
          className="mt-10 flex flex-wrap items-center gap-4 opacity-0"
        >
          <Button href="/programas" variant="outline">
            Ver programas
          </Button>
          <Button href="/sello" variant="outline">
            Conocé el sello
          </Button>
        </div>
      </Container>

      <div className="absolute right-10 top-28 z-10 hidden w-32 flex-col items-center opacity-80 lg:flex">
        <Image
          src="/images/logo/icon.png"
          alt=""
          width={96}
          height={96}
          className="spin-slow invert"
          aria-hidden
        />
        <Image
          src="/images/logo/wordmark.png"
          alt=""
          width={128}
          height={48}
          className="-mt-3 invert"
          aria-hidden
        />
      </div>

      <a
        href="#index"
        aria-label="Scroll hacia abajo"
        data-cursor="SCROLL"
        className="absolute bottom-8 left-1/2 z-10 hidden -translate-x-1/2 text-text-subdued transition-colors hover:text-white sm:block"
      >
        <ChevronDown size={28} className="animate-bounce" aria-hidden />
      </a>
    </section>
  );
}
