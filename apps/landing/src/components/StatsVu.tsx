"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";
import { Reveal } from "@/components/Reveal";

type Stat = { value: number; suffix?: string; label: string };

const STATS: Stat[] = [
  { value: 4, label: "Programas activos" },
  { value: 3, label: "Artistas al frente de la academia" },
  { value: 4, label: "Lanzamientos del sello" },
  { value: 124, label: "BPM · el tempo de este sitio" },
];

function VuBars() {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(() => {
    const bars = ref.current?.children;
    if (!bars) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    const tick = () => {
      for (let i = 0; i < bars.length; i++) {
        const v = 0.15 + Math.random() * 0.55;
        (bars[i] as HTMLElement).style.height = `${10 + v * 90}%`;
      }
    };
    const id = setInterval(tick, 140);
    return () => clearInterval(id);
  });

  return (
    <div ref={ref} className="mt-5 flex h-6 items-end gap-[3px]" aria-hidden>
      {Array.from({ length: 9 }).map((_, i) => (
        <span key={i} className="h-[10%] flex-1 bg-red/70" />
      ))}
    </div>
  );
}

function StatTile({ stat }: { stat: Stat }) {
  const numRef = useRef<HTMLSpanElement>(null);

  useGSAP(
    () => {
      const el = numRef.current;
      if (!el) return;
      const counter = { n: 0 };
      gsap.to(counter, {
        n: stat.value,
        duration: 1.4,
        ease: "power2.out",
        scrollTrigger: { trigger: el, start: "top 85%", once: true },
        onUpdate: () => {
          el.textContent = Math.round(counter.n) + (stat.suffix ?? "");
        },
      });
    },
    { scope: numRef },
  );

  return (
    <div className="bg-bg p-6 sm:p-8">
      <p className="font-display text-4xl font-bold tabular-nums text-white sm:text-5xl">
        <span ref={numRef}>0</span>
      </p>
      <p className="mt-2 font-mono text-xs uppercase tracking-wide text-text-subdued">
        {stat.label}
      </p>
      <VuBars />
    </div>
  );
}

export function StatsVu() {
  return (
    <Reveal
      as="div"
      stagger={0.08}
      className="grid grid-cols-2 gap-px border border-border-subtle bg-border-subtle lg:grid-cols-4"
    >
      {STATS.map((stat) => (
        <StatTile key={stat.label} stat={stat} />
      ))}
    </Reveal>
  );
}
