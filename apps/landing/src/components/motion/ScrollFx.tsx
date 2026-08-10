"use client";

import { useRef } from "react";
import { usePathname } from "next/navigation";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";
import { scrollVelocity } from "@/lib/velocity";

/**
 * Publica la velocidad de scroll:
 *   - `scrollVelocity.value` (módulo compartido) para quien la lea desde JS
 *   - `--split` como variable CSS, sólo sobre los elementos `.chromatic`
 *
 * OJO CON DÓNDE SE ESCRIBE LA VARIABLE. Antes iba sobre `<html>`, que es la
 * forma obvia y la más cara que hay: una custom property en el elemento raíz
 * invalida el estilo del documento ENTERO, y acá se reescribía en cada frame
 * de cada scroll. Medido en la home con la CPU a 1/4: 79 ms de frame medio
 * contra 35 ms sin esas dos escrituras. O sea que el sitio corría a menos de
 * la mitad de fps por dos variables.
 *
 * Lo que lo arregla es escribir sólo donde se lee. `--split` lo consume un
 * único selector (`.chromatic`, en globals.css) y hoy está en un solo
 * elemento —el titular del hero—, así que la invalidación pasa de todo el
 * documento a un subárbol de cinco nodos. El efecto se ve idéntico.
 *
 * `--vel` directamente se fue: estaba declarada y se reescribía cada frame,
 * pero no la leía ni una regla de CSS. Quien necesite la velocidad la toma de
 * `scrollVelocity`, que es una lectura de propiedad y no toca el DOM.
 */
export function ScrollFx() {
  const pathname = usePathname();
  const prevY = useRef(0);
  const val = useRef(0);

  useGSAP(() => {
    if (prefersReduced()) return;

    prevY.current = window.scrollY;

    // Se resuelve por ruta: el hero de la home es hoy el único `.chromatic`,
    // y al navegar el nodo es otro.
    const targets = gsap.utils.toArray<HTMLElement>(".chromatic");

    // Último valor escrito, para no repetir la escritura si no cambió.
    let last = "";

    const tick = () => {
      const y = window.scrollY;
      const vel = y - prevY.current;
      prevY.current = y;

      const target = Math.min(Math.abs(vel) * 0.045, 2.2);
      val.current = gsap.utils.interpolate(val.current, target, 0.22);
      if (val.current < 0.02) val.current = 0;

      scrollVelocity.value = val.current / 2.2;

      if (!targets.length) return;

      const next = val.current.toFixed(2);
      // En reposo esto siempre es "0.00": sin el corte se estaría pidiendo un
      // recálculo de estilo 60 veces por segundo por un valor que no se movió.
      if (next === last) return;
      last = next;

      for (const el of targets) el.style.setProperty("--split", next);
    };

    gsap.ticker.add(tick);
    return () => {
      gsap.ticker.remove(tick);
      scrollVelocity.value = 0;
      for (const el of targets) el.style.removeProperty("--split");
    };
  }, [pathname]);

  return null;
}
