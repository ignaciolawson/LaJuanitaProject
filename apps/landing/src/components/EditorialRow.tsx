"use client";

import { useRef, type ReactNode } from "react";
import Image from "next/image";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";
import { Reveal } from "@/components/Reveal";

export function EditorialRow({
  image,
  imageAlt,
  index,
  eyebrow,
  title,
  subtitle,
  description,
  reverse,
  grayscale = false,
  priority = false,
  channel = false,
  children,
}: {
  image: string;
  imageAlt: string;
  index: number;
  eyebrow?: string;
  title: ReactNode;
  /** Short red label under the title (e.g. a role) — distinct from the small eyebrow next to the index number. */
  subtitle?: string;
  description: string;
  reverse?: boolean;
  /** "Comes to life": desaturated while entering, full color once centered — used for Profesores. */
  grayscale?: boolean;
  priority?: boolean;
  /** Mono "CH01" label instead of a plain number — the mixer-channel framing used for Programas. */
  channel?: boolean;
  children?: ReactNode;
}) {
  const rowRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const row = rowRef.current;
      const frame = frameRef.current;
      const media = mediaRef.current;
      if (!row || !frame || !media) return;

      // Reveal: comes up from behind a mask as it enters the viewport.
      gsap.set(frame, { clipPath: "inset(100% 0 0 0)" });
      gsap.to(frame, {
        clipPath: "inset(0% 0 0 0)",
        duration: 1.2,
        ease: "power4.out",
        scrollTrigger: { trigger: row, start: "top 80%" },
      });

      if (grayscale) {
        gsap.fromTo(
          media,
          { filter: "grayscale(1) brightness(0.75)", scale: 1.15 },
          {
            filter: "grayscale(0) brightness(1)",
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: row, start: "top 90%", end: "center 60%", scrub: 0.6 },
          },
        );
      } else {
        gsap.fromTo(
          media,
          { scale: 1.15 },
          {
            scale: 1,
            ease: "none",
            scrollTrigger: { trigger: row, start: "top 90%", end: "center 60%", scrub: 0.6 },
          },
        );
      }
    },
    { scope: rowRef, dependencies: [grayscale] },
  );

  return (
    <div
      ref={rowRef}
      className={clsx(
        "flex flex-col items-center gap-10 py-16 sm:py-24 lg:flex-row lg:gap-16",
        reverse && "lg:flex-row-reverse",
      )}
    >
      <div
        ref={frameRef}
        className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl lg:w-[52%]"
      >
        <div ref={mediaRef} className="absolute inset-0">
          <Image
            src={image}
            alt={imageAlt}
            fill
            sizes="(min-width: 1024px) 50vw, 100vw"
            className="object-cover object-top"
            priority={priority}
          />
        </div>
      </div>

      <Reveal className="lg:w-[48%]">
        <span
          className={clsx(
            "text-xs uppercase tracking-[0.25em] text-text-subdued",
            channel ? "font-mono" : "font-display font-semibold",
          )}
        >
          {channel ? `CH${String(index + 1).padStart(2, "0")}` : String(index + 1).padStart(2, "0")}
          {eyebrow ? ` — ${eyebrow}` : ""}
        </span>
        <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-4 font-display text-sm font-semibold uppercase tracking-wide text-red">
            {subtitle}
          </p>
        )}
        <p className={clsx("max-w-md text-base leading-relaxed text-text-secondary", subtitle ? "mt-3" : "mt-6")}>
          {description}
        </p>
        {children}
      </Reveal>
    </div>
  );
}
