import { Hero } from "@/components/sections/Hero";
import { Manifesto } from "@/components/sections/Manifesto";
import { ProgramsRail } from "@/components/sections/ProgramsRail";
import { Numbers } from "@/components/sections/Numbers";
import { Teachers } from "@/components/sections/Teachers";
import { Releases } from "@/components/sections/Releases";
import { Services } from "@/components/sections/Services";
import { Gear } from "@/components/sections/Gear";
import { Cta } from "@/components/sections/Cta";
import { VelocityMarquee } from "@/components/motion/VelocityMarquee";
import { UPCOMING_DATES } from "@/data/dates";

/**
 * Home.
 *
 * El orden alterna tinta y papel a propósito: cabina → luz → cabina. El
 * ThemeScroller hace la transición de fondo del documento entero, así que
 * la secuencia de secciones ES parte del diseño, no sólo del contenido.
 *
 *   ink   Hero            cabina a oscuras
 *   ink   Agenda          tira de fechas
 *   bone  Manifiesto      la charla a la luz del día
 *   ink   Programas       riel horizontal anclado
 *   bone  Números         cifras + VU
 *   ink   Profesores      abanico de fichas
 *   bone  Servicios       alquiler de cabina y grabación
 *   ink   Equipos         La Juanita Shop, con la banda roja de redes
 *   ink   Sello           pila de lanzamientos
 *   ink   Cierre          wordmark arqueado
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
              <span className="text-red">
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
      <Cta />
    </>
  );
}
