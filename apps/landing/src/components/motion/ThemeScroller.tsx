"use client";

import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollTrigger } from "@/lib/gsap";

/**
 * Cambia el tema del sitio entero según la sección que estés mirando.
 *
 * Cualquier <section data-theme="bone"> o "ink" declara qué paleta quiere;
 * al cruzar el medio del viewport, el fondo, el texto y las líneas de TODA
 * la página se interpolan hasta esa paleta.
 *
 * Por qué no lo resuelvo con clases de Tailwind sección por sección: quiero
 * que el cambio sea del documento, no de un bloque. Que el papel "gane" la
 * pantalla completa (incluidos nav, cursor y footer) es justamente lo que
 * hace que la landing se sienta continua en vez de una pila de cards.
 *
 * Interpolo con gsap.utils.interpolate sobre un proxy en vez de tweenear la
 * custom property directo: así el color se mezcla en el espacio correcto y
 * no depende de que el navegador registre la variable con @property.
 */

type Palette = {
  bg: string;
  fg: string;
  muted: string;
  faint: string;
  line: string;
  field: string;
  accent: string;
};

/**
 * Las claves son los nombres de las variables sin el prefijo: `faint` escribe
 * `--page-faint`. Una clave nueva acá se interpola sola — no hay ninguna otra
 * lista que actualizar.
 */
const KEYS = ["bg", "fg", "muted", "faint", "line", "field", "accent"] as const;

/**
 * Los contrastes de `faint`, `field` y `accent` están medidos y son el mínimo
 * que pasa AA; el porqué de cada uno está en `globals.css`, donde viven los
 * valores por defecto. Si cambiás un número acá, cambialo también allá: son
 * los mismos tokens, y este archivo pisa al otro apenas arranca el scroll.
 */
const THEMES: Record<string, Palette> = {
  ink: {
    bg: "#0a0a0b",
    fg: "#e8e1d4",
    muted: "rgba(232,225,212,0.56)",
    faint: "rgba(232,225,212,0.52)",
    line: "rgba(232,225,212,0.16)",
    field: "rgba(232,225,212,0.40)",
    accent: "#ff3a30",
  },
  bone: {
    bg: "#e8e1d4",
    fg: "#0a0a0b",
    muted: "rgba(10,10,11,0.62)",
    faint: "rgba(10,10,11,0.60)",
    line: "rgba(10,10,11,0.18)",
    field: "rgba(10,10,11,0.48)",
    // El rojo de marca sobre papel da 3,51:1. Este da 5,04:1 y mantiene el
    // tono; el de marca sigue vivo en las superficies, que no cambian.
    accent: "#b81a1f",
  },
};

export function ThemeScroller() {
  const pathname = usePathname();

  useGSAP(() => {
    const root = document.documentElement;
    const sections = gsap.utils.toArray<HTMLElement>("[data-theme]");

    // Página sin secciones declaradas: volver a tinta. Si no, al navegar
    // desde una sección de papel el tema queda pegado y te comés una
    // página blanca con texto blanco.
    if (!sections.length) {
      KEYS.forEach((k) => root.style.setProperty(`--page-${k}`, THEMES.ink[k]));
      return;
    }
    /** Paleta pedida por la sección que estás mirando. */
    let current: Palette = THEMES.ink;
    /** Paleta que hay REALMENTE en pantalla, frame a frame. */
    let live: Palette = THEMES.ink;

    const applyTheme = (next: Palette) => {
      // Salir temprano si la paleta ya es esa. Sin este corte, cada sección
      // que entra dispara su transición aunque pida el MISMO tema que la
      // anterior: en la home hay diez `data-theme` y sólo dos inversiones
      // reales, así que las otras ocho eran 0.8 s de interpolar tinta hacia
      // tinta —cinco custom properties por frame sobre <html>, o sea el
      // estilo del documento entero invalidado— para no cambiar nada.
      if (next === current) return;

      // Se arranca desde lo que hay en pantalla y no desde el destino
      // anterior: si te das vuelta a mitad de una inversión, la vuelta sale
      // del color real en vez de saltar al que todavía no había llegado.
      const from = live;
      const proxy = { p: 0 };

      // Los interpoladores se arman una vez por transición y no una vez por
      // frame: en la forma de dos argumentos, `interpolate` devuelve una
      // función y parsea los colores una sola vez. Con la forma de tres
      // argumentos volvía a parsear los diez strings en cada frame.
      const lerps = KEYS.map((k) => gsap.utils.interpolate(from[k], next[k]));

      gsap.killTweensOf(proxy);
      gsap.to(proxy, {
        // Más largo que antes (0.55s) a propósito: ahora que las
        // inversiones son pocas, cada una puede leerse como un cambio de
        // luz en vez de un corte.
        p: 1,
        duration: 0.8,
        ease: "power2.inOut",
        onUpdate: () => {
          const t = proxy.p;
          const painted = {} as Palette;
          for (let i = 0; i < KEYS.length; i++) {
            const value = lerps[i](t) as string;
            painted[KEYS[i]] = value;
            root.style.setProperty(`--page-${KEYS[i]}`, value);
          }
          live = painted;
        },
        onComplete: () => {
          live = next;
        },
      });
      current = next;
    };

    const triggers = sections.map((section) => {
      const name = section.dataset.theme ?? "ink";
      const theme = THEMES[name] ?? THEMES.ink;

      return ScrollTrigger.create({
        trigger: section,
        start: "top 50%",
        end: "bottom 50%",
        onToggle: (self) => {
          if (self.isActive) applyTheme(theme);
        },
      });
    });

    return () => {
      triggers.forEach((t) => t.kill());
      KEYS.forEach((k) => root.style.removeProperty(`--page-${k}`));
    };
  }, [pathname]);

  return null;
}
