import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { EditorialRow } from "@/components/EditorialRow";
import { Container } from "@/components/ui/Container";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, personLd } from "@/lib/seo";
import { TEACHERS } from "@/data/teachers";

export const metadata: Metadata = pageMetadata({
  title: "Profesores de la academia",
  description:
    "Quiénes enseñan en La Juanita Studio: artistas y productores en actividad, al frente de los programas de DJ, producción musical y mastering en Pilar.",
  path: "/profesores",
});

export default function ProfesoresPage() {
  return (
    <>
      {/* `Person` por cada profesor, atados a la organización con `worksFor`.
          Es la señal de E-E-A-T más concreta que tiene el sitio: convierte
          "una academia" en "una academia con estas personas detrás", que es lo
          que Google evalúa como experiencia y lo que un asistente de IA usa
          para decidir si una fuente sabe de lo que habla. */}
      <JsonLd
        data={graph(
          breadcrumbLd([{ name: "Profesores", path: "/profesores" }]),
          ...TEACHERS.map(personLd),
        )}
      />

      <PageHero
        eyebrow="Profesores"
        title={
          <>
            Aprendé de quienes{" "}
            <span className="font-normal text-[color:var(--page-muted)]">viven de esto</span>
          </>
        }
        description="Nuestro equipo docente son artistas y productores activos en la escena, no solo profesores."
        image="/images/artistas/najles.webp"
      />

      <Container className="divide-y divide-[color:var(--page-line)] py-4">
        {TEACHERS.map((teacher, i) => (
          <EditorialRow
            key={teacher.name}
            index={i}
            image={teacher.image}
            imageAlt={teacher.name}
            title={teacher.name}
            subtitle={teacher.role}
            description={teacher.bio}
            reverse={i % 2 === 1}
            grayscale
            priority={i === 0}
          />
        ))}
      </Container>
    </>
  );
}
