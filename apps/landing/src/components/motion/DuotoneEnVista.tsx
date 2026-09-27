"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { isTouch } from "@/lib/gsap";

/**
 * En táctil, la foto en blanco y negro recupera el color cuando te quedás
 * mirándola — no cuando la tocás.
 *
 * En escritorio el color vuelve con el hover (`globals.css`). En un teléfono
 * no hay hover, y la primera salida fue `.group:active .duotone`: el color
 * mientras el dedo apoya. **El problema es que `:active` no distingue un toque
 * de un scroll** —se prende apenas el dedo toca, y la mayoría de las veces
 * que un dedo toca una foto es para scrollear—, así que bajar por la página
 * iba pintando a color lo que se cruzaba en el camino. Se leía como un error
 * (2026-09-26, visto por Ignacio en el celular).
 *
 * Ahora la foto se pinta cuando queda en la franja central de la pantalla y
 * **se queda ahí medio segundo**. Scrolleando de largo cruza la franja en
 * menos que eso y no pasa nada; cuando parás a mirar, vuelve el color. Es lo
 * que el hover hace en escritorio —color cuando la atención está en la foto—
 * medido con lo único que un teléfono sabe de la atención: dónde se detuvo.
 *
 * Un componente para todas las fotos, montado una vez en el layout, y no un
 * hook en cada sección: son doce archivos que usan `.duotone` y ninguno
 * tendría que saber que esto existe.
 */

/** Cuánto tiene que quedarse quieta la foto en el centro para pintarse. */
const ESPERA_MS = 450;

export function DuotoneEnVista() {
  const pathname = usePathname();

  useEffect(() => {
    if (!isTouch()) return;

    const fotos = document.querySelectorAll<HTMLElement>(".duotone");
    if (!fotos.length) return;

    const esperas = new Map<Element, number>();

    const observador = new IntersectionObserver(
      (entradas) => {
        for (const entrada of entradas) {
          const foto = entrada.target;
          const pendiente = esperas.get(foto);
          if (pendiente) window.clearTimeout(pendiente);
          esperas.delete(foto);

          if (entrada.isIntersecting) {
            esperas.set(
              foto,
              window.setTimeout(() => foto.classList.add("duotone--viva"), ESPERA_MS),
            );
          } else {
            foto.classList.remove("duotone--viva");
          }
        }
      },
      // La franja del medio: el 40% central de la pantalla.
      { rootMargin: "-30% 0px -30% 0px" },
    );

    fotos.forEach((foto) => observador.observe(foto));

    return () => {
      observador.disconnect();
      esperas.forEach((espera) => window.clearTimeout(espera));
    };
    // Se vuelve a buscar en cada página: las fotos de la anterior ya no están.
  }, [pathname]);

  return null;
}
