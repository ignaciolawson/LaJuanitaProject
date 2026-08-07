import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Container } from "@/components/ui/Container";
import { FAQ } from "@/data/faq";

export const metadata: Metadata = {
  title: "Preguntas Frecuentes",
  description: "Todo lo que necesitás saber antes de anotarte en La Juanita Studio.",
};

export default function FaqPage() {
  return (
    <>
      <PageHero
        eyebrow="Preguntas frecuentes"
        title={
          <>
            ¿Tenés <span className="font-normal text-text-secondary">dudas</span>?
          </>
        }
        image="/images/estudio/sala-mastering.jpg"
      />

      <section className="bg-bg py-20 sm:py-28">
        <Container className="max-w-4xl">
          <FaqAccordion items={FAQ} />
        </Container>
      </section>
    </>
  );
}
