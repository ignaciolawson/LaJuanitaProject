"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { ScrollSmoother } from "gsap/ScrollSmoother";
import { SplitText } from "gsap/SplitText";
import { DrawSVGPlugin } from "gsap/DrawSVGPlugin";
import { CustomEase } from "gsap/CustomEase";
import { Observer } from "gsap/Observer";
import { useGSAP } from "@gsap/react";

if (typeof window !== "undefined") {
  gsap.registerPlugin(
    ScrollTrigger,
    ScrollSmoother,
    SplitText,
    DrawSVGPlugin,
    CustomEase,
    Observer,
    useGSAP,
  );

  // Curvas propias. La diferencia entre "animado" y "animado por alguien"
  // suele estar acá: power2.out es la curva por defecto de todo el mundo.
  CustomEase.create("juanita", "0.16, 1, 0.24, 1"); // salida larga y calma
  CustomEase.create("swipe", "0.76, 0, 0.24, 1"); // in-out marcado, para wipes
  CustomEase.create("snap", "0.34, 1.3, 0.32, 1"); // micro-overshoot

  gsap.defaults({ ease: "juanita", duration: 0.9 });
}

/** True cuando el visitante pidió menos movimiento o está en un touch chico. */
export function prefersReduced() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export {
  gsap,
  ScrollTrigger,
  ScrollSmoother,
  SplitText,
  DrawSVGPlugin,
  CustomEase,
  Observer,
  useGSAP,
};
