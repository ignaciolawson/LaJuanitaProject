"use client";

import { useRef } from "react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { scrollVelocity } from "@/lib/velocity";

/**
 * Publica la velocidad de scroll como variables CSS en <html>:
 *   --vel    → 0 en reposo, sube al scrollear rápido
 *   --split  → separación RGB derivada (la usa .chromatic)
 *
 * Tenerlo como variable CSS en vez de como tween por elemento significa que
 * cualquier parte de la página puede reaccionar a la velocidad sin que este
 * componente sepa que existe.
 */
export function ScrollFx() {
  const prevY = useRef(0);
  const val = useRef(0);

  useGSAP(() => {
    if (prefersReduced()) return;

    prevY.current = window.scrollY;
    const root = document.documentElement;

    const tick = () => {
      const y = window.scrollY;
      const vel = y - prevY.current;
      prevY.current = y;

      const target = Math.min(Math.abs(vel) * 0.045, 2.2);
      val.current = gsap.utils.interpolate(val.current, target, 0.22);
      if (val.current < 0.02) val.current = 0;

      scrollVelocity.value = val.current / 2.2;
      root.style.setProperty("--vel", scrollVelocity.value.toFixed(3));
      root.style.setProperty("--split", val.current.toFixed(2));
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      scrollVelocity.value = 0;
      root.style.removeProperty("--vel");
      root.style.removeProperty("--split");
    };
  }, []);

  return null;
}
