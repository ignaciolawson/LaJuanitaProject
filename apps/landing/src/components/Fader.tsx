"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/** Decorative mixer-style fader that fills in on scroll — used on Programas' channel strips. */
export function Fader({ level, label }: { level: number; label: string }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const fillRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      if (!fillRef.current || !trackRef.current) return;
      gsap.to(fillRef.current, {
        width: `${level}%`,
        duration: 1.2,
        ease: "power3.out",
        scrollTrigger: { trigger: trackRef.current, start: "top 90%", once: true },
      });
    },
    { scope: trackRef },
  );

  return (
    <div className="mt-6">
      <div ref={trackRef} className="h-[3px] w-full bg-border-subtle">
        <div ref={fillRef} className="h-full w-0 bg-gradient-to-r from-red to-red-hover" />
      </div>
      <p className="mt-2 font-mono text-[10px] uppercase tracking-wide text-text-subdued">
        {label}
      </p>
    </div>
  );
}
