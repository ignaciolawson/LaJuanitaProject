"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";

export function Marquee({
  items,
  className,
  speed = 32,
}: {
  items: ReactNode[];
  className?: string;
  /** Seconds for one full loop; lower = faster. */
  speed?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!trackRef.current) return;
      gsap.to(trackRef.current, {
        xPercent: -50,
        duration: speed,
        ease: "none",
        repeat: -1,
      });
    },
    { scope: trackRef, dependencies: [speed] },
  );

  const run = (
    <span className="flex shrink-0 items-center gap-8 pr-8">
      {items.map((item, i) => (
        <span key={i} className="flex shrink-0 items-center gap-8">
          {item}
          <span className="h-1 w-1 shrink-0 rounded-full bg-red" aria-hidden />
        </span>
      ))}
    </span>
  );

  return (
    <div
      className={clsx(
        "overflow-hidden border-y border-border-subtle bg-surface py-3.5",
        className,
      )}
    >
      <div
        ref={trackRef}
        className="flex w-max whitespace-nowrap font-mono text-xs uppercase tracking-[0.15em] text-text-secondary"
      >
        {run}
        {run}
      </div>
    </div>
  );
}
