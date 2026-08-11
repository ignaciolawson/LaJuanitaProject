"use client";

import { useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, ScrollSmoother, ScrollTrigger, isLite } from "@/lib/gsap";

/**
 * Scroll con inercia (ScrollSmoother).
 *
 * Es el 40% de la sensación de "sitio caro": el scroll deja de ser un salto
 * de rueda y pasa a tener peso. También habilita `data-speed` / `data-lag`
 * en cualquier elemento, que es como resuelvo los parallax sin escribir un
 * ScrollTrigger por cada capa.
 *
 * Dos condiciones importantes:
 *  - Todo lo `position: fixed` (nav, cursor, grano) vive FUERA de
 *    #smooth-content, porque el contenido está transformado y un fixed
 *    dentro de un transform se ancla al padre, no al viewport.
 *  - Si el visitante pidió menos movimiento, no se crea nada: scroll nativo.
 *
 * ── Y NO SE CREA EN TÁCTIL ─────────────────────────────────────────────
 *
 * Esto es lo que más se notaba en el celular. El smoother ya venía con
 * `smoothTouch: 0`, o sea que en un teléfono no agregaba NADA de inercia —
 * pero seguía costando todo lo que cuesta:
 *
 *  1. `normalizeScroll: true` intercepta los eventos de touch y pasa a mover
 *     la página desde JavaScript. El scroll nativo de un teléfono corre en el
 *     hilo del compositor y sigue al dedo aunque el JS esté ocupado; movido
 *     desde JS, cada trabajo de más en el hilo principal se convierte en un
 *     tirón del scroll. Cambiás fluidez del sistema operativo por fluidez que
 *     tenés que calcular vos, y el teléfono siempre pierde ese cambio.
 *  2. El wrapper queda en `position: fixed; overflow: hidden` con el contenido
 *     transformado. En un móvil eso es una capa de compositor del tamaño de
 *     toda la página, y además rompe el colapso de la barra de direcciones:
 *     la barra se queda puesta y te comés ~110px de pantalla todo el scroll.
 *
 * Lo único que se pierde en táctil es el parallax por `data-speed` (dos
 * elementos decorativos en el Manifiesto). Es un cambio barato por recuperar
 * el scroll nativo del sistema, que en un teléfono ES la definición de suave.
 */
export function SmoothScroll({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const smoother = useRef<ScrollSmoother | null>(null);

  useGSAP(() => {
    if (isLite()) return;

    smoother.current = ScrollSmoother.create({
      wrapper: "#smooth-wrapper",
      content: "#smooth-content",
      smooth: 1.15,
      effects: true,
      normalizeScroll: true,
      ignoreMobileResize: true,
      smoothTouch: 0,
    });

    return () => {
      smoother.current?.kill();
      smoother.current = null;
    };
  }, []);

  /**
   * Llevar el scroll hasta un `#hash`, pasando por el smoother.
   *
   * BUG QUE ESTO ARREGLA: con ScrollSmoother activo, el salto nativo de un
   * ancla NO scrollea el documento. El smoother deja a `#smooth-wrapper` en
   * `position: fixed; overflow: hidden; height: 100%` y traslada al hijo,
   * así que el wrapper es el ancestro scrolleable más cercano del destino —
   * y `overflow: hidden` no impide el scroll programático que hace el
   * navegador para "traer el elemento a la vista". Resultado: el navegador
   * corre el wrapper, el smoother sigue transformando el contenido según
   * `window.scrollY` (que no se movió) y todo queda desfasado para siempre:
   * la página se ve corrida, los ScrollTrigger apuntan a coordenadas que ya
   * no existen y ninguna animación vuelve a dispararse. Eso es lo que se
   * leía como "aprieto Ver programas y se traba todo".
   */
  const scrollToHash = useCallback((hash: string, smooth: boolean) => {
    if (!hash || hash === "#") return false;

    let target: Element | null = null;
    try {
      target = document.querySelector(hash);
    } catch {
      return false; // hash que no es un selector válido
    }
    if (!target) return false;

    const s = smoother.current;
    if (!s) {
      target.scrollIntoView({ behavior: smooth ? "smooth" : "auto" });
      return true;
    }

    // El "top 96px" deja el destino debajo de la barra fija, igual que el
    // `scroll-margin-top: 6rem` que usaba el salto nativo.
    const y = s.offset(target, "top 96px");

    // OJO: acá NO va `smoother.scrollTo(target, true)`. Con
    // `normalizeScroll: true` esa rama escribe el scroll nativo directo y el
    // normalizador —que es quien maneja la rueda— no se entera: la ventana
    // queda en el destino, el contenido congelado donde estaba, y la página
    // no se destraba hasta el próximo gesto real de scroll. Tweenear
    // `scrollTop` del smoother pasa por su propio setter, así que el
    // contenido, el normalizador y los ScrollTrigger van todos juntos.
    if (smooth) gsap.to(s, { scrollTop: y, duration: 1.1, ease: "juanita", overwrite: "auto" });
    else s.scrollTo(y, false);

    return true;
  }, []);

  useGSAP(() => {
    const wrapper = document.getElementById("smooth-wrapper");
    if (!wrapper) return;

    // Red de seguridad: el wrapper NUNCA tiene que quedar scrolleado. Además
    // del click en un ancla, lo mueven el buscar-en-la-página del navegador
    // y el scroll al hash que hace Next al navegar. Devolverlo a 0 apenas
    // pasa evita que ese desfase se vuelva permanente.
    const unscroll = () => {
      if (wrapper.scrollTop || wrapper.scrollLeft) wrapper.scrollTo(0, 0);
    };
    wrapper.addEventListener("scroll", unscroll, { passive: true });

    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0) return;
      if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

      const link = (event.target as Element | null)?.closest?.<HTMLAnchorElement>("a");
      if (!link || link.target === "_blank" || link.hasAttribute("download")) return;

      const href = link.getAttribute("href");
      if (!href || !href.startsWith("#")) return;

      // Va en fase de captura y corta la propagación: los `href="#"` de
      // `data/releases.ts` son <Link> de Next, y si el click llega a React
      // el router hace su propio scroll al hash — que es exactamente el que
      // rompe el smoother. Aunque el destino no exista hay que frenarlo.
      event.preventDefault();
      event.stopPropagation();
      if (scrollToHash(href, true)) history.pushState(null, "", href);
    };

    // Volver atrás después de un ancla: el navegador intenta su propio salto,
    // que el guard de arriba anula. Sin esto el botón "atrás" no hace nada.
    const onPopState = () => {
      const hash = window.location.hash;
      if (hash && hash !== "#") scrollToHash(hash, true);
    };

    document.addEventListener("click", onClick, true);
    window.addEventListener("popstate", onPopState);

    return () => {
      document.removeEventListener("click", onClick, true);
      window.removeEventListener("popstate", onPopState);
      wrapper.removeEventListener("scroll", unscroll);
    };
  }, [scrollToHash]);

  // En App Router el wrapper sobrevive al cambio de ruta pero la altura del
  // contenido no: sin este reset quedan triggers apuntando a la página vieja.
  useGSAP(() => {
    const hash = window.location.hash;

    if (!hash || hash === "#") {
      smoother.current?.scrollTo(0, false);
      ScrollTrigger.refresh();
      gsap.delayedCall(0.2, () => ScrollTrigger.refresh());
      return;
    }

    // Con hash en la URL (`/servicios#reservar`) no se puede resetear a 0:
    // el destino se resuelve acá, después de refrescar, y se repite una vez
    // más porque las fotos lazy todavía pueden cambiar la altura.
    ScrollTrigger.refresh();
    if (!scrollToHash(hash, false)) smoother.current?.scrollTo(0, false);
    gsap.delayedCall(0.2, () => {
      ScrollTrigger.refresh();
      scrollToHash(hash, false);
    });
  }, [pathname, scrollToHash]);

  return (
    <div id="smooth-wrapper">
      <div id="smooth-content">{children}</div>
    </div>
  );
}
