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

  /**
   * En un teléfono, la barra de direcciones se esconde al bajar y vuelve al
   * subir. Eso cambia la altura del viewport a mitad del scroll, y por defecto
   * ScrollTrigger toma cada cambio de altura como un resize: recalcula TODOS
   * los triggers de la página en medio del gesto. Se siente exactamente como
   * lo que es — un tirón, y animaciones que se saltean o se disparan dos veces
   * — y es el motivo número uno de que un sitio con scroll animado se sienta
   * roto en el celular y perfecto en el escritorio.
   *
   * Con esto, ScrollTrigger ignora los cambios de alto en touch y sólo
   * refresca cuando cambia el ANCHO, que es lo único que de verdad reacomoda
   * la página (rotar el teléfono).
   */
  ScrollTrigger.config({ ignoreMobileResize: true });
}

/** True cuando el visitante pidió menos movimiento. */
export function prefersReduced() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Dispositivo táctil: sin puntero fino y sin hover real.
 *
 * No es lo mismo que "pantalla chica". Un iPad Pro en horizontal mide 1366px
 * y es táctil; una notebook con pantalla de 1280px no lo es. Lo que decide si
 * un efecto conviene o no acá casi nunca es el ancho — es si hay un dedo o un
 * mouse, y cuánta GPU hay atrás. Por eso los cortes de rendimiento van con
 * esto y los de maquetación con breakpoints.
 */
export function isTouch() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(hover: none) and (pointer: coarse)").matches;
}

/** Atajo: no animar nada caro (menos movimiento pedido, o dispositivo táctil). */
export function isLite() {
  return prefersReduced() || isTouch();
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
