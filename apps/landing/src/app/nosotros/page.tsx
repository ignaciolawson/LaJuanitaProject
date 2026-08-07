import type { Metadata } from "next";
import Image from "next/image";
import { PageHero } from "@/components/PageHero";
import { RevealImage } from "@/components/RevealImage";
import { Reveal } from "@/components/Reveal";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";

export const metadata: Metadata = {
  title: "Nosotros",
  description:"La Juanita nació como sello discográfico y hoy es también una academia de DJ y producción musical en Pilar.",
};

const STATS = [
  { value: "Pilar", label: "Sede actual" },
  { value: "Córdoba", label: "Próxima expansión" },
  { value: "1", label: "Sello discográfico propio" },
];

export default function NosotrosPage() {
  return (
    <>
      <PageHero
        eyebrow="Sobre nosotros"
        title={
          <>
            Gente de la <span className="font-normal text-[color:var(--page-muted)]">música</span>
          </>
        }
        description="Un estudio hecho por y para quienes viven de esto."
        image="/images/estudio/sala-mastering.jpg"
      />

      <section data-theme="ink" className="bg-[color:var(--page-bg)] py-20 sm:py-28">
        <Container className="grid items-center gap-16 lg:grid-cols-2">
          <Reveal>
            <p className="text-lg leading-relaxed text-[color:var(--page-muted)]">
              La Juanita nació como sello discográfico. Con el tiempo, los mismos
              artistas y productores que grababan puertas adentro empezaron a
              formar a la próxima generación — así nació la academia.
            </p>
            <p className="mt-6 text-lg leading-relaxed text-[color:var(--page-muted)]">
              Hoy formamos DJs y productores con el mismo equipamiento y los
              mismos estándares que usamos para nuestros propios lanzamientos:
              cabinas Pioneer DJ profesionales y una sala de mastering tratada
              acústicamente.
            </p>

            <ul className="mt-10 grid grid-cols-3 gap-6 border-t border-[color:var(--page-line)] pt-8">
              {STATS.map((stat) => (
                <li key={stat.label}>
                  <p className="font-display text-xl font-extrabold text-[color:var(--page-fg)] sm:text-2xl">
                    {stat.value}
                  </p>
                  <p className="mt-1 text-xs text-[color:var(--page-faint)]">{stat.label}</p>
                </li>
              ))}
            </ul>
          </Reveal>

          <RevealImage className="aspect-[4/5] ">
            <Image
              src="/images/estudio/team.jpg"
              alt="Equipo de La Juanita Studio en la sala de producción"
              fill
              sizes="(min-width: 1024px) 40vw, 90vw"
              className="object-cover"
            />
          </RevealImage>
        </Container>
      </section>

      <RevealImage className="h-[60vh] w-full" parallaxScale={0.25}>
        <Image
          src="/images/estudio/fachada.jpeg"
          alt="Fachada de La Juanita Studio en Pilar"
          fill
          sizes="100vw"
          className="object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-transparent to-ink/30" />
      </RevealImage>

      <section data-theme="ink" className="bg-ink-2 py-20 text-center sm:py-28">
        <Container>
          <Reveal>
            <h2 className="mx-auto max-w-xl t-display-tight text-3xl leading-[0.95] text-[color:var(--page-fg)] sm:text-4xl">
              Conocé los programas y{" "}
              <span className="font-normal text-[color:var(--page-muted)]">arrancá cuando quieras</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 flex justify-center">
            <Button href="/programas" variant="outline">
              Ver programas
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
