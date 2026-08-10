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

    // Última pareja escrita, para no repetir la escritura si no cambió.
    let lastVel = "";
    let lastSplit = "";

    const tick = () => {
      const y = window.scrollY;
      const vel = y - prevY.current;
      prevY.current = y;

      const target = Math.min(Math.abs(vel) * 0.045, 2.2);
      val.current = gsap.utils.interpolate(val.current, target, 0.22);
      if (val.current < 0.02) val.current = 0;

      scrollVelocity.value = val.current / 2.2;

      const nextVel = scrollVelocity.value.toFixed(3);
      const nextSplit = val.current.toFixed(2);

      // Escribir una custom property sobre <html> invalida el estilo del
      // documento ENTERO. Hacerlo en los 60 frames de cada segundo aunque el
      // valor sea el mismo —y en reposo siempre es "0.000"— es un recálculo
      // de estilo global permanente por una variable que no se movió.
      if (nextVel === lastVel && nextSplit === lastSplit) return;
      lastVel = nextVel;
      lastSplit = nextSplit;

      root.style.setProperty("--vel", nextVel);
      root.style.setProperty("--split", nextSplit);
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
