"use client";

import { useRef } from "react";
import { gsap, useGSAP } from "@/lib/gsap";

/**
 * Tracks scroll velocity and exposes it as the --split CSS custom property
 * on <html> (0 at rest, spikes on fast scroll, decays back down). Anything
 * on the page can react to it — see .chromatic in globals.css, which uses
 * it to drive a red/violet RGB-split text-shadow that only shows up while
 * scrolling fast, echoing a CRT/strobe glitch instead of a static effect.
 */
export function ScrollFx() {
  const prevY = useRef(0);
  const split = useRef(0);

  useGSAP(() => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;

    prevY.current = window.scrollY;
    const root = document.documentElement;

    const tick = () => {
      const y = window.scrollY;
      const vel = y - prevY.current;
      prevY.current = y;
      const target = Math.min(Math.abs(vel) * 0.05, 2.4);
      split.current = gsap.utils.interpolate(split.current, target, 0.25);
      if (split.current < 0.02) split.current = 0;
      root.style.setProperty("--split", split.current.toFixed(2));
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      root.style.removeProperty("--split");
    };
  });

  return null;
}
