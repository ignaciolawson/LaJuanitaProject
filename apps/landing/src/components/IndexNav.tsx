"use client";

import { useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Reveal } from "@/components/Reveal";

export type IndexItem = {
  index: string;
  href: string;
  label: string;
  description: string;
  image: string;
  /** Small tags shown under the description (e.g. program names, artist names). */
  meta?: string[];
};

function IndexRow({ item }: { item: IndexItem }) {
  const rowRef = useRef<HTMLAnchorElement>(null);
  const imgRef = useRef<HTMLDivElement>(null);

  useGSAP(
    (_context, contextSafe) => {
      const row = rowRef.current;
      const img = imgRef.current;
      if (!row || !img || !contextSafe) return;

      const onEnter = contextSafe(() => {
        gsap.to(img, { opacity: 1, scale: 1, duration: 0.6, ease: "expo.out" });
        gsap.to(row, { paddingLeft: 24, duration: 0.5, ease: "power3.out" });
      });
      const onLeave = contextSafe(() => {
        gsap.to(img, { opacity: 0, scale: 1.08, duration: 0.5, ease: "power3.out" });
        gsap.to(row, { paddingLeft: 0, duration: 0.5, ease: "power3.out" });
      });

      row.addEventListener("mouseenter", onEnter);
      row.addEventListener("mouseleave", onLeave);
      return () => {
        row.removeEventListener("mouseenter", onEnter);
        row.removeEventListener("mouseleave", onLeave);
      };
    },
    { scope: rowRef },
  );

  return (
    <Link
      ref={rowRef}
      href={item.href}
      data-cursor="VER"
      className="group relative flex items-center justify-between gap-6 border-b border-border-subtle py-8 sm:py-10"
    >
      <div
        ref={imgRef}
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 scale-110 opacity-0 sm:w-2/5"
      >
        <div className="relative h-full w-full overflow-hidden">
          <Image
            src={item.image}
            alt=""
            fill
            sizes="40vw"
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-l from-transparent via-bg/40 to-bg" />
        </div>
      </div>

      <div className="relative z-10 flex items-baseline gap-4 sm:gap-8">
        <span className="font-display text-sm font-semibold text-red">{item.index}</span>
        <div>
          <h3 className="font-display text-3xl font-bold tracking-tight text-white transition-colors sm:text-5xl lg:text-6xl">
            {item.label}
          </h3>
          <p className="mt-2 max-w-md text-sm text-text-secondary sm:text-base">
            {item.description}
          </p>
          {item.meta && (
            <ul className="mt-3 flex flex-wrap gap-2">
              {item.meta.map((tag, i) => (
                <li
                  key={`${tag}-${i}`}
                  className="rounded-full border border-border-subtle px-3 py-1 text-xs text-text-subdued"
                >
                  {tag}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <ArrowUpRight
        className="relative z-10 shrink-0 text-text-subdued transition-all duration-300 group-hover:-translate-y-1 group-hover:translate-x-1 group-hover:text-red"
        size={32}
        aria-hidden
      />
    </Link>
  );
}

export function IndexNav({ items }: { items: IndexItem[] }) {
  return (
    <Reveal as="div" stagger={0.08} className="border-t border-border-subtle">
      {items.map((item) => (
        <IndexRow key={item.href} item={item} />
      ))}
    </Reveal>
  );
}
