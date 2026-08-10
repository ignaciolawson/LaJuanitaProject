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
};

const THEMES: Record<string, Palette> = {
  ink: {
    bg: "#0a0a0b",
    fg: "#e8e1d4",
    muted: "rgba(232,225,212,0.56)",
    faint: "rgba(232,225,212,0.30)",
    line: "rgba(232,225,212,0.16)",
  },
  bone: {
    bg: "#e8e1d4",
    fg: "#0a0a0b",
    muted: "rgba(10,10,11,0.62)",
    faint: "rgba(10,10,11,0.34)",
    line: "rgba(10,10,11,0.18)",
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
      const ink = THEMES.ink;
      root.style.setProperty("--page-bg", ink.bg);
      root.style.setProperty("--page-fg", ink.fg);
      root.style.setProperty("--page-muted", ink.muted);
      root.style.setProperty("--page-faint", ink.faint);
      root.style.setProperty("--page-line", ink.line);
      return;
    }
    let current: Palette = THEMES.ink;

    const applyTheme = (next: Palette) => {
      const from = { ...current };
      const proxy = { p: 0 };

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
          root.style.setProperty("--page-bg", gsap.utils.interpolate(from.bg, next.bg, t));
          root.style.setProperty("--page-fg", gsap.utils.interpolate(from.fg, next.fg, t));
          root.style.setProperty("--page-muted", gsap.utils.interpolate(from.muted, next.muted, t));
          root.style.setProperty("--page-faint", gsap.utils.interpolate(from.faint, next.faint, t));
          root.style.setProperty("--page-line", gsap.utils.interpolate(from.line, next.line, t));
        },
        onComplete: () => {
          current = next;
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
      (["bg", "fg", "muted", "faint", "line"] as const).forEach((k) =>
        root.style.removeProperty(`--page-${k}`),
      );
    };
  }, [pathname]);

  return null;
}
