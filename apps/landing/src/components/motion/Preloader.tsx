"use client";

import { useRef, useState } from "react";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { Fan } from "@/components/brand/Fan";

/**
 * Intro: el abanico se abre, cuenta hasta 100, y el telón se corre.
 *
 * Un preloader sólo se justifica si hace algo que no podés hacer después de
 * cargar. Acá cumple dos funciones: presenta el símbolo de la marca en
 * grande antes que cualquier texto, y le da al hero medio segundo para que
 * su propia animación arranque desde negro en vez de un flash blanco.
 *
 * Corre una vez por sesión. Volver desde /programas y comerte la intro otra
 * vez es exactamente el tipo de detalle que hace que una web se sienta
 * hecha para lucirse y no para usarse.
 *
 * Dura ~2s de punta a punta. Si tocás las duraciones, bajá también la red de
 * seguridad del Hero (el `delayedCall` que lo destraba si la intro nunca
 * emite `lj:intro-curtain`): tiene que seguir siendo más larga que esto.
 */
export function Preloader() {
  const root = useRef<HTMLDivElement>(null);
  const [done, setDone] = useState(false);

  useGSAP(
    () => {
      const el = root.current;
      if (!el) return;

      const seen =
        typeof sessionStorage !== "undefined" && sessionStorage.getItem("lj:intro") === "1";

      const finish = () => {
        document.body.dataset.intro = "done";
        // El hero escucha esto para encadenar su entrada. Antes era un
        // `delay` fijo adivinado, que se desincroniza en cuanto tocás la
        // duración de acá.
        window.dispatchEvent(new CustomEvent("lj:intro-done"));
        setDone(true);
      };

      if (seen || prefersReduced()) {
        gsap.set(el, { display: "none" });
        finish();
        return;
      }

      document.body.dataset.intro = "running";
      const ribs = el.querySelectorAll("[data-rib]");
      const counter = el.querySelector<HTMLElement>("[data-count]");
      const count = { v: 0 };

      const tl = gsap.timeline({
        onComplete: () => {
          sessionStorage.setItem("lj:intro", "1");
          finish();
        },
      });

      // Varillas cerradas en un solo palo, se abren en abanico.
      tl.set(ribs, { rotate: 0, transformOrigin: "0px 0px" })
        .set("[data-arc]", { drawSVG: "50% 50%" })
        .to(ribs, {
          rotate: (i: number) => -78 + i * (156 / (ribs.length - 1)),
          duration: 0.85,
          ease: "juanita",
          stagger: { each: 0.022, from: "center" },
        })
        .to("[data-arc]", { drawSVG: "0% 100%", duration: 0.65, ease: "juanita" }, "-=0.6")
        .to(
          count,
          {
            v: 100,
            duration: 0.85,
            ease: "power1.inOut",
            onUpdate: () => {
              if (counter) counter.textContent = String(Math.round(count.v)).padStart(3, "0");
            },
          },
          0,
        )
        // La marca se retira ANTES de que suba el telón.
        //
        // BUG QUE ESTO ARREGLA: el abanico no tenía salida propia. El telón
        // subía y lo dejaba flotando sobre la página ya visible durante todo
        // el barrido (~1s), hasta que el `display: none` final lo borraba de
        // golpe. Eso es lo que se leía como "el abanico se queda colgado y
        // después desaparece".
        .to("[data-intro-mark]", { opacity: 0, scale: 0.96, duration: 0.4, ease: "power2.in" }, "-=0.18")
        // El telón sube en tres hojas desfasadas: una sola caja subiendo es
        // lo que hace todo el mundo.
        .add(() => window.dispatchEvent(new CustomEvent("lj:intro-curtain")))
        .to(
          "[data-curtain]",
          {
            yPercent: -101,
            duration: 0.8,
            ease: "swipe",
            stagger: 0.055,
          },
          "-=0.12",
        )
        .set(el, { display: "none" });
    },
    { scope: root },
  );

  if (done) return null;

  return (
    <div
      ref={root}
      className="pointer-events-none fixed inset-0 z-[100] flex items-center justify-center"
      aria-hidden
    >
      <div className="absolute inset-0 flex">
        <div data-curtain className="h-full flex-1 bg-ink" />
        <div data-curtain className="h-full flex-1 bg-ink" />
        <div data-curtain className="h-full flex-1 bg-ink" />
      </div>

      <div data-intro-mark className="relative flex flex-col items-center gap-8">
        <Fan className="w-[min(46vw,340px)] text-bone" />
        <div className="t-mono flex items-center gap-4 text-bone/45">
          <span>La Juanita Studio</span>
          <span className="h-px w-8 bg-bone/25" />
          <span data-count className="tabular-nums text-red">
            000
          </span>
        </div>
      </div>
    </div>
  );
}
