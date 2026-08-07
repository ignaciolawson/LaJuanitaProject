"use client";

import { useRef, useState, useSyncExternalStore } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

function subscribeFinePointer(callback: () => void) {
  const mql = window.matchMedia("(pointer: fine)");
  mql.addEventListener("change", callback);
  return () => mql.removeEventListener("change", callback);
}
const getFinePointerSnapshot = () => window.matchMedia("(pointer: fine)").matches;
const getFinePointerServerSnapshot = () => false;

/**
 * Custom cursor: a small dot glued to the pointer + a ring that trails with
 * inertia (gsap.quickTo — reused tweens, cheap on mousemove). Grows and
 * shows a label when hovering elements tagged with data-cursor="...".
 * Elements tagged data-magnetic get pulled a few px toward the pointer
 * while it's within range (buttons, nav pill).
 * Disabled on touch devices; respects prefers-reduced-motion by skipping
 * the trailing lag and the magnetic pull.
 */
export function Cursor() {
  const dotRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [label, setLabel] = useState("");
  const [hovering, setHovering] = useState(false);
  const enabled = useSyncExternalStore(
    subscribeFinePointer,
    getFinePointerSnapshot,
    getFinePointerServerSnapshot,
  );

  useGSAP(
    () => {
      if (!enabled || !dotRef.current || !ringRef.current) return;

      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

      const dotX = gsap.quickTo(dotRef.current, "x", { duration: 0.05, ease: "power3" });
      const dotY = gsap.quickTo(dotRef.current, "y", { duration: 0.05, ease: "power3" });
      const ringX = gsap.quickTo(ringRef.current, "x", {
        duration: reduce ? 0.05 : 0.45,
        ease: "power3",
      });
      const ringY = gsap.quickTo(ringRef.current, "y", {
        duration: reduce ? 0.05 : 0.45,
        ease: "power3",
      });

      let magneticEl: HTMLElement | null = null;
      let magX: ReturnType<typeof gsap.quickTo> | null = null;
      let magY: ReturnType<typeof gsap.quickTo> | null = null;

      const onMove = (e: MouseEvent) => {
        dotX(e.clientX);
        dotY(e.clientY);
        ringX(e.clientX);
        ringY(e.clientY);

        if (magneticEl && magX && magY && !reduce) {
          const r = magneticEl.getBoundingClientRect();
          const dx = e.clientX - (r.left + r.width / 2);
          const dy = e.clientY - (r.top + r.height / 2);
          magX(dx * 0.3);
          magY(dy * 0.3);
        }
      };

      const interactiveSelector = "a, button, [data-cursor]";

      const onOver = (e: MouseEvent) => {
        const target = (e.target as HTMLElement)?.closest<HTMLElement>(interactiveSelector);
        if (target) {
          setHovering(true);
          setLabel(target.dataset.cursor ?? "");
        }

        const magnetic = (e.target as HTMLElement)?.closest<HTMLElement>("[data-magnetic]");
        if (magnetic && magnetic !== magneticEl) {
          magneticEl = magnetic;
          magX = gsap.quickTo(magnetic, "x", { duration: 0.4, ease: "power3" });
          magY = gsap.quickTo(magnetic, "y", { duration: 0.4, ease: "power3" });
        }
      };

      const onOut = (e: MouseEvent) => {
        const target = (e.target as HTMLElement)?.closest<HTMLElement>(interactiveSelector);
        if (target) {
          setHovering(false);
          setLabel("");
        }

        const magnetic = (e.target as HTMLElement)?.closest<HTMLElement>("[data-magnetic]");
        if (magnetic && magnetic === magneticEl) {
          magX?.(0);
          magY?.(0);
          magneticEl = null;
          magX = null;
          magY = null;
        }
      };

      window.addEventListener("mousemove", onMove);
      document.addEventListener("mouseover", onOver);
      document.addEventListener("mouseout", onOut);

      return () => {
        window.removeEventListener("mousemove", onMove);
        document.removeEventListener("mouseover", onOver);
        document.removeEventListener("mouseout", onOut);
      };
    },
    { dependencies: [enabled], revertOnUpdate: true },
  );

  useGSAP(() => {
    if (!ringRef.current || !labelRef.current) return;
    gsap.to(ringRef.current, {
      scale: hovering ? (label ? 2.6 : 1.8) : 1,
      duration: 0.35,
      ease: "power3.out",
    });
    gsap.to(labelRef.current, {
      opacity: hovering && label ? 1 : 0,
      duration: 0.2,
    });
  }, [hovering, label]);

  if (!enabled) return null;

  return (
    <div className="pointer-events-none fixed inset-0 z-[100] hidden lg:block" aria-hidden>
      <div
        ref={dotRef}
        className="fixed left-0 top-0 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red"
      />
      <div
        ref={ringRef}
        className="fixed left-0 top-0 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-white/40 mix-blend-difference"
      >
        <span
          ref={labelRef}
          className="font-display text-[10px] font-bold uppercase tracking-wide text-white opacity-0"
        >
          {label}
        </span>
      </div>
    </div>
  );
}
