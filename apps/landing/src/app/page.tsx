import { Hero } from "@/components/sections/Hero";
import { Marquee } from "@/components/Marquee";
import { IndexNav, type IndexItem } from "@/components/IndexNav";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/Button";
import { PROGRAMS } from "@/data/programs";
import { RELEASES } from "@/data/releases";
import { TEACHERS } from "@/data/teachers";
import { UPCOMING_DATES } from "@/data/dates";
import { StatsVu } from "@/components/StatsVu";

const ITEMS: IndexItem[] = [
  {
    index: "01",
    href: "/nosotros",
    label: "Nosotros",
    description: "Un estudio hecho por y para gente de la música.",
    image: "/images/estudio/team.jpg",
  },
  {
    index: "02",
    href: "/programas",
    label: "Programas",
    description: "DJ, producción y mix & mastering, sobre equipamiento profesional.",
    image: "/images/estudio/equipos.jpg",
    meta: PROGRAMS.map((p) => p.name),
  },
  {
    index: "03",
    href: "/sello",
    label: "Sello",
    description: "La Juanita Records — nuestros artistas y lanzamientos.",
    image: "/images/estudio/sala-mastering.jpg",
    meta: RELEASES.slice(0, 3).map((r) => r.title),
  },
  {
    index: "04",
    href: "/profesores",
    label: "Profesores",
    description: "Artistas y productores activos en la escena.",
    image: "/images/artistas/ghezz.png",
    meta: TEACHERS.map((t) => t.name),
  },
  {
    index: "05",
    href: "/faq",
    label: "FAQ",
    description: "Todo lo que necesitás saber antes de anotarte.",
    image: "/images/estudio/equipos.jpg",
  },
  {
    index: "06",
    href: "/contacto",
    label: "Contacto",
    description: "Vení a conocer la sede de Pilar.",
    image: "/images/estudio/fachada.jpeg",
  },
];

export default function Home() {
  return (
    <>
      <Hero />
      <Marquee
        items={UPCOMING_DATES.map((d) => (
          <span key={d.title}>
            {d.day} {d.month} · <b className="text-white">{d.title}</b>
          </span>
        ))}
      />

      <section id="index" className="bg-bg py-16 sm:py-24">
        <Container>
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-wide text-red">Explorá</span>
          </Reveal>
          <IndexNav items={ITEMS} />
        </Container>
      </section>

      <section className="border-t border-border-subtle bg-surface py-20 sm:py-28">
        <Container>
          <Reveal>
            <span className="font-mono text-xs uppercase tracking-wide text-red">
              Salida general
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              La Juanita <span className="font-normal text-text-secondary">en números</span>
            </h2>
          </Reveal>
          <div className="mt-10">
            <StatsVu />
          </div>
        </Container>
      </section>

      <section className="border-t border-border-subtle bg-bg py-24 sm:py-32">
        <Container className="text-center">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
              ¿Listo para llevar tu <span className="text-red">sonido</span>{" "}
              <span className="font-normal text-text-secondary">al siguiente nivel?</span>
            </h2>
          </Reveal>
          <Reveal delay={0.1} className="mt-8 flex justify-center">
            <Button href="/contacto" variant="primary">
              Inscribite ahora
            </Button>
          </Reveal>
        </Container>
      </section>
    </>
  );
}
