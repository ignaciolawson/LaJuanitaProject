"use client";

import { useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Quote } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Reveal } from "@/components/Reveal";
import type { Testimonial } from "@/data/testimonials";

export function FeaturedQuote({ testimonials }: { testimonials: Testimonial[] }) {
  const [index, setIndex] = useState(0);
  const quoteRef = useRef<HTMLDivElement>(null);
  const prevBtnRef = useRef<HTMLButtonElement>(null);
  const nextBtnRef = useRef<HTMLButtonElement>(null);
  const active = testimonials[index];
  const count = testimonials.length;

  useGSAP(
    (_context, contextSafe) => {
      const el = quoteRef.current;
      const prevBtn = prevBtnRef.current;
      const nextBtn = nextBtnRef.current;
      if (!el || !prevBtn || !nextBtn || !contextSafe) return;

      const animateTo = (delta: number) => {
        gsap.to(el, {
          opacity: 0,
          y: 12,
          duration: 0.25,
          ease: "power2.in",
          onComplete: () => {
            setIndex((prev) => (prev + delta + count) % count);
            gsap.fromTo(
              el,
              { opacity: 0, y: -12 },
              { opacity: 1, y: 0, duration: 0.4, ease: "power2.out" },
            );
          },
        });
      };

      const onPrev = contextSafe(() => animateTo(-1));
      const onNext = contextSafe(() => animateTo(1));

      prevBtn.addEventListener("click", onPrev);
      nextBtn.addEventListener("click", onNext);
      return () => {
        prevBtn.removeEventListener("click", onPrev);
        nextBtn.removeEventListener("click", onNext);
      };
    },
    { scope: quoteRef, dependencies: [count] },
  );

  return (
    <div className="mx-auto max-w-3xl">
      <Reveal>
        <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-red">
          Testimonios
        </span>
      </Reveal>

      <div ref={quoteRef} className="mt-8">
        <Quote className="text-red" size={32} aria-hidden />
        <blockquote className="mt-6 font-display text-2xl font-medium leading-snug text-white sm:text-3xl">
          “{active.quote}”
        </blockquote>
        <p className="mt-6 text-sm text-text-secondary">
          <span className="font-semibold text-white">{active.name}</span> — {active.program}
        </p>
      </div>

      <div className="mt-10 flex items-center gap-6">
        <button
          ref={prevBtnRef}
          type="button"
          aria-label="Testimonio anterior"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors hover:border-red hover:text-red"
        >
          <ArrowLeft size={16} aria-hidden />
        </button>
        <span className="font-display text-xs text-text-subdued">
          {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
        </span>
        <button
          ref={nextBtnRef}
          type="button"
          aria-label="Siguiente testimonio"
          className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-full border border-border-subtle text-text-secondary transition-colors hover:border-red hover:text-red"
        >
          <ArrowRight size={16} aria-hidden />
        </button>
      </div>
    </div>
  );
}
