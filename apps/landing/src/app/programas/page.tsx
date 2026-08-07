import type { Metadata } from "next";
import { Check } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { EditorialRow } from "@/components/EditorialRow";
import { Fader } from "@/components/Fader";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PROGRAMS } from "@/data/programs";
import { FeaturedQuote } from "@/components/FeaturedQuote";
import { TESTIMONIALS } from "@/data/testimonials";

export const metadata: Metadata = {
  title: "Programas",
  description:
    "DJ Nivel Inicial, DJ Avanzado, Producción Musical Electrónica y Mix & Mastering — cuatro programas presenciales en Pilar.",
};

export default function ProgramasPage() {
  return (
    <>
      <PageHero
        eyebrow="Programas"
        title={
          <>
            Elegí tu <span className="font-normal text-text-secondary">camino</span>
          </>
        }
        description="Cuatro programas presenciales en nuestra sede de Pilar, sobre equipamiento profesional Pioneer DJ."
        image="/images/estudio/equipos.jpg"
      />

      <Container className="divide-y divide-border-subtle py-4">
        {PROGRAMS.map((program, i) => (
          <EditorialRow
            key={program.slug}
            index={i}
            image={program.image}
            imageAlt={program.name}
            eyebrow={program.tagline}
            title={program.name}
            description={program.description}
            reverse={i % 2 === 1}
            priority={i === 0}
            channel
          >
            <ul className="mt-6 space-y-2">
              {program.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-text-secondary">
                  <Check size={16} className="mt-0.5 shrink-0 text-red" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-xs text-text-subdued">
              <span>{program.duration}</span>
              <span>{program.modality}</span>
            </div>

            <Fader level={program.level} label={program.levelLabel} />

            <div className="mt-6 flex items-center gap-6">
              <p className="font-display text-lg font-bold text-white">{program.price}</p>
              <Button href="/contacto" variant="outline">
                Consultar
              </Button>
            </div>
          </EditorialRow>
        ))}
      </Container>

      <section className="border-t border-border-subtle bg-surface py-20 sm:py-28">
        <Container>
          <FeaturedQuote testimonials={TESTIMONIALS} />
        </Container>
      </section>
    </>
  );
}
