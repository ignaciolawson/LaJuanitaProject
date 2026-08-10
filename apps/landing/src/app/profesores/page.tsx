import type { Metadata } from "next";
import { PageHero } from "@/components/PageHero";
import { EditorialRow } from "@/components/EditorialRow";
import { Container } from "@/components/ui/Container";
import { TEACHERS } from "@/data/teachers";

export const metadata: Metadata = {
  title: "Profesores",
  description:"Artistas y productores activos en la escena electrónica, al frente de la academia La Juanita.",
};

export default function ProfesoresPage() {
  return (
    <>
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
