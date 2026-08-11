import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, faqLd } from "@/lib/seo";
import { FAQ } from "@/data/faq";

export const metadata: Metadata = pageMetadata({
  title: "Preguntas frecuentes sobre los cursos",
  description:
    "Si hace falta experiencia previa, qué equipamiento se usa, si hay certificado, cómo es la práctica libre y las formas de pago en La Juanita Studio, Pilar.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      {/* De todo el marcado del sitio, éste es el que más rinde para motores
          de respuesta: son pares pregunta/respuesta ya delimitados, en
          lenguaje natural y que se entienden sueltos — la unidad exacta que un
          asistente de IA extrae y cita. Google ya casi no muestra el resultado
          enriquecido de FAQ, así que el valor de esto hoy NO es la estrella en
          el SERP: es que la respuesta esté disponible en forma legible por
          máquina. */}
      <JsonLd
        data={graph(
          breadcrumbLd([{ name: "Preguntas frecuentes", path: "/faq" }]),
          faqLd(FAQ),
        )}
      />

      <PageHero
        eyebrow="Preguntas frecuentes"
        title={
          <>
            ¿Tenés <span className="font-normal text-[color:var(--page-muted)]">dudas</span>?
          </>
        }
        image="/images/estudio/sala-mastering.jpg"
      />

      <section data-theme="ink" className="bg-[color:var(--page-bg)] py-20 sm:py-28">
        <Container className="max-w-4xl">
          <FaqAccordion items={FAQ} />
        </Container>
      </section>
    </>
  );
}
