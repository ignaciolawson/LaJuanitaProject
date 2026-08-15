import type { Metadata } from "next";

import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { ProgramsRail } from "@/components/sections/ProgramsRail";
import { Numbers } from "@/components/sections/Numbers";
import { Teachers } from "@/components/sections/Teachers";
import { Releases } from "@/components/sections/Releases";
import { Journal } from "@/components/sections/Journal";
import { Services } from "@/components/sections/Services";
import { Gear } from "@/components/sections/Gear";
import { Cta } from "@/components/sections/Cta";
import { VelocityMarquee } from "@/components/motion/VelocityMarquee";
import { UPCOMING_DATES } from "@/data/dates";

/**
 * Sólo el canonical: el título, la descripción y las tarjetas sociales de la
 * home salen de los valores por defecto del layout, que ya están escritos para
 * ella. Declarar el canonical acá y no allá es lo que evita que lo hereden las
 * rutas que no definen el suyo (ver la nota en `layout.tsx`).
 */
export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

/**
 * Home.
 *
 * El orden va de tinta a papel y vuelve: cabina → luz → cabina. El
 * ThemeScroller hace la transición de fondo del documento entero, así que
 * la secuencia de secciones ES parte del diseño, no sólo del contenido.
 *
 *   ink   Hero            cabina a oscuras
 *   ink   Agenda          tira de fechas
 *   ink   Manifiesto      la charla, todavía a oscuras
 *   ink   Programas       riel horizontal anclado
 *   bone  Números         ── entra la luz
 *   bone  Profesores      abanico de fichas
 *   bone  Servicios       alquiler de cabina y grabación
 *   ink   Equipos         ── vuelve la cabina, con la banda roja de redes
 *   ink   Sello           pila de lanzamientos
 *   ink   Novedades       las tres últimas notas del blog
 *   ink   Cierre          wordmark arqueado
 *
 * Son DOS inversiones, no seis. La versión original alternaba sección por
 * sección (bone/ink/bone/ink/bone) y el fondo del documento entero se daba
 * vuelta cinco veces en el tramo del medio: leído de corrido era un
 * estrobo, no un cambio de luz.
 *
 * El bloque de papel es de tres secciones y va al medio, no antes: la tinta
 * tiene que dominar. Ojo con mandar Programas a `bone` — está anclada a
 * pantalla completa con scroll horizontal, así que ocupa mucho más recorrido
 * del que aparenta en esta lista, y sola alcanza para dar vuelta la
 * proporción de toda la página.
 *
 * Dos es el piso: para que el fondo vuelva a tinta hacen falta una ida y una
 * vuelta. Si hay que bajar más el efecto, se acorta el bloque de papel, no
 * se agregan cortes.
 */
export default function Home() {
  return (
    <>
      <Hero />

      <section
        data-theme="ink"
        className="border-y border-[color:var(--page-line)] bg-[color:var(--page-bg)] text-[color:var(--page-fg)]"
      >
        <VelocityMarquee
          className="t-mono"
          speed={34}
          items={UPCOMING_DATES.map((d) => (
            <span key={d.title} className="flex items-center gap-3">
              <span className="text-accent">
                {d.day} {d.month}
              </span>
              <span>{d.title}</span>
              <span className="text-[color:var(--page-faint)]">{d.location}</span>
            </span>
          ))}
        />
      </section>

      <Manifesto />
      <ProgramsRail />
      <Numbers />
      <Teachers />
      <Services />
      <Gear />
      <Releases />
      <Journal />
      <Cta />
    </>
  );
}
