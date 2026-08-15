import type { Metadata } from "next";
import Image from "next/image";

import { PageHero } from "@/components/PageHero";
import { RevealImage } from "@/components/RevealImage";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, organizationLd } from "@/lib/seo";

export const metadata: Metadata = pageMetadata({
  // Ídem contacto: el `template` ya agrega la marca.
  title: "Nosotros — el estudio, la academia y el sello",
  description:
    "La Juanita nació como sello discográfico y hoy es también academia de DJ y producción, estudio de mix & mastering y espacio de trabajo en Pilar, Buenos Aires.",
  path: "/nosotros",
});

/**
 * Nosotros.
 *
 * La versión anterior tenía dos párrafos y una foto: quedaba corta para la
 * página donde la gente decide si te tiene confianza. Ahora hay un relato
 * en tres tiempos (de dónde venimos / cómo es el lugar / cómo trabajamos),
 * con las fotos reales del espacio intercaladas.
 *
 * Los textos son placeholder — la historia real la escribe el cliente.
 */

// ⚠️ De esta línea de tiempo hay UN dato confirmado y sólo uno: **2021, el año
// de fundación** (§13 de `docs/requirements/platform.md`). Arrancaba en 2019 y
// contradecía el `foundingDate` que el JSON-LD publica como hecho verificado.
// Los otros años y los cuatro relatos siguen siendo placeholder: la historia
// real la escribe el cliente.
const TIMELINE = [
  {
    year: "2021",
    title: "Empieza el sello",
    detail:
      "La Juanita arranca como sello discográfico, publicando a artistas de la zona norte que no tenían dónde sacar su música.",
  },
  {
    year: "2022",
    title: "El estudio",
    detail:
      "Se arma la sala de mastering con tratamiento acústico propio, para dejar de depender de estudios de terceros.",
  },
  {
    year: "2023",
    title: "Nace la academia",
    detail:
      "Los mismos artistas que grababan puertas adentro empiezan a dar clase. La formación deja de ser informal y se vuelve programa.",
  },
  {
    year: "Hoy",
    title: "Sede Pilar",
    detail:
      "Academia, estudio, sello y espacio de trabajo conviviendo en el mismo lugar, con la cabina abierta también a quien no estudia acá.",
  },
];

const VALUES = [
  {
    title: "Se aprende tocando",
    detail:
      "La teoría existe, pero está al servicio de la práctica. Nadie se hizo DJ mirando diapositivas.",
  },
  {
    title: "Grupos chicos, en serio",
    detail:
      "Cupos limitados por camada. Si hay más gente que equipo, alguien está mirando de atrás y eso no es una clase.",
  },
  {
    title: "Nada de humo",
    detail:
      "No prometemos que vas a vivir de esto en seis meses. Te damos las herramientas y el criterio; el resto es tuyo.",
  },
  {
    title: "La puerta queda abierta",
    detail:
      "Terminar el programa no te saca del lugar. Muchos siguen alquilando cabina, grabando o publicando con nosotros.",
  },
];

export default function NosotrosPage() {
  return (
    <>
      {/* Es la página "quiénes somos", o sea la que Google usa para resolver
          la entidad del negocio. Repetir acá la organización con su `@id`
          refuerza esa asociación. */}
      <JsonLd
        data={graph(
          breadcrumbLd([{ name: "Nosotros", path: "/nosotros" }]),
          organizationLd(),
        )}
      />

      <PageHero
        eyebrow="Sobre nosotros"
        title="Gente de la música"
        description="Un estudio hecho por y para quienes viven de esto."
        image="/images/espacio/frente.jpg"
      />

      {/* De dónde venimos */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-14 lg:grid-cols-12 lg:gap-10">
            <div className="lg:col-span-7">
              <span className="label">Cómo empezó</span>

              <SplitReveal
                as="p"
                type="words"
                className="t-display-tight h-md mt-8 max-w-[16ch] normal-case"
              >
                Primero fue un sello. La escuela vino después.
              </SplitReveal>

              <div className="mt-10 max-w-[54ch] space-y-5 text-[color:var(--page-muted)]">
                <SplitReveal as="p" type="lines" className="t-body text-[17px]">
                  La Juanita nació para publicar música de gente de la zona que
                  no tenía dónde sacarla. Al poco tiempo, los mismos artistas que
                  venían a grabar empezaron a traer amigos que querían aprender —
                  y esas clases sueltas, informales, terminaron siendo el
                  germen de la academia.
                </SplitReveal>
                <SplitReveal as="p" type="lines" className="t-body text-[17px]">
                  Eso explica por qué el lugar está armado como está. No es una
                  escuela que después consiguió equipo: es un estudio que
                  empezó a dar clase. El equipamiento, la sala tratada y el
                  criterio son los mismos que usamos para nuestros propios
                  lanzamientos, porque son literalmente los mismos.
                </SplitReveal>
                <SplitReveal as="p" type="lines" className="t-body text-[17px]">
                  Hoy en Pilar conviven las cuatro cosas: la academia, el
                  estudio de mix y mastering, el sello, y un espacio donde la
                  gente se queda a trabajar, tomar algo y cruzarse. Esa mezcla
                  no es un accidente — es la parte que más nos importa.
                </SplitReveal>
              </div>
            </div>

            <div className="lg:col-span-5">
              <RevealImage className="aspect-[3/4]">
                <Image
                  src="/images/espacio/sala-trabajo.jpg"
                  alt="Interior de La Juanita Studio: mesa de trabajo negra y biblioteca con objetos del sello"
                  fill
                  sizes="(min-width: 1024px) 40vw, 90vw"
                  className="duotone object-cover"
                />
              </RevealImage>
              <p className="t-mono mt-3 text-[color:var(--page-faint)]">
                La sala común — sede Pilar
              </p>
            </div>
          </div>
        </Container>
      </section>

      {/* Foto ancha del frente */}
      <RevealImage className="h-[62vh] w-full" parallaxScale={0.25}>
        <Image
          src="/images/espacio/tocando.jpg"
          alt="Entrada de La Juanita Studio en Pilar, con el cartel de la marca"
          fill
          sizes="100vw"
          className="object-cover object-[center_70%]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/20 to-ink/40" />
      </RevealImage>

      {/* Línea de tiempo — sigue en papel: partirla en tinta dejaba la
          página invirtiéndose cuatro veces. */}
      <section
        data-theme="bone"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <span className="label">La línea de tiempo</span>
          <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
            Cómo llegamos
          </SplitReveal>

          <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
            {TIMELINE.map((item, i) => (
              <Reveal
                key={item.year}
                as="li"
                delay={i * 0.07}
                className="border-t border-[color:var(--page-line)] pt-5"
              >
                <span className="t-display text-[clamp(32px,3.5vw,54px)] leading-none text-accent">
                  {item.year}
                </span>
                <h3 className="t-display-tight mt-4 text-xl">{item.title}</h3>
                <p className="t-body mt-3 text-sm text-[color:var(--page-muted)]">
                  {item.detail}
                </p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      {/* El espacio, en fotos */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="label">El lugar</span>
              <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
                Pasá a verlo
              </SplitReveal>
            </div>
            <p className="t-body max-w-[36ch] text-sm text-[color:var(--page-muted)]">
              Estamos sobre la colectora, en Pilar. Se puede venir a conocer sin
              turno: la puerta está abierta en horario comercial.
            </p>
          </div>

          {/* Grilla desalineada a propósito: una cuadrícula perfecta de fotos
              iguales se lee como catálogo, no como un lugar. */}
          <div className="mt-16 grid gap-4 sm:grid-cols-12 sm:gap-6">
            <figure className="sm:col-span-7">
              <RevealImage className="aspect-[4/3]">
                <Image
                  src="/images/espacio/lounge.jpg"
                  alt="Zona de estar de La Juanita con gente trabajando y tomando café"
                  fill
                  sizes="(min-width: 640px) 55vw, 100vw"
                  className="duotone object-cover"
                />
              </RevealImage>
              <figcaption className="t-mono mt-3 text-[color:var(--page-faint)]">
                Sala común
              </figcaption>
            </figure>

            <figure className="sm:col-span-5 sm:pt-16">
              <RevealImage className="aspect-[3/4]">
                <Image
                  src="/images/espacio/patio.jpg"
                  alt="Mesas exteriores de La Juanita sobre la vereda"
                  fill
                  sizes="(min-width: 640px) 40vw, 100vw"
                  className="duotone object-cover"
                />
              </RevealImage>
              <figcaption className="t-mono mt-3 text-[color:var(--page-faint)]">
                Vereda y patio
              </figcaption>
            </figure>

            <figure className="sm:col-span-5">
              <RevealImage className="aspect-[3/4]">
                <Image
                  src="/images/estudio/sala-mastering.jpg"
                  alt="Sala de mastering tratada acústicamente"
                  fill
                  sizes="(min-width: 640px) 40vw, 100vw"
                  className="duotone object-cover"
                />
              </RevealImage>
              <figcaption className="t-mono mt-3 text-[color:var(--page-faint)]">
                Sala de mastering
              </figcaption>
            </figure>

            <figure className="sm:col-span-7 sm:pt-10">
              <RevealImage className="aspect-[4/3]">
                <Image
                  src="/images/espacio/frente.jpg"
                  alt="Frente de La Juanita Studio con el cartel sobre el vidrio"
                  fill
                  sizes="(min-width: 640px) 55vw, 100vw"
                  className="duotone object-cover"
                />
              </RevealImage>
              <figcaption className="t-mono mt-3 text-[color:var(--page-faint)]">
                Frente — colectora, Pilar
              </figcaption>
            </figure>
          </div>
        </Container>
      </section>

      {/* Cómo trabajamos */}
      <section
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <span className="label">Cómo trabajamos</span>
          <SplitReveal as="h2" type="chars" className="t-display h-md mt-5 max-w-[14ch]">
            Cuatro reglas
          </SplitReveal>

          <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {VALUES.map((value, i) => (
              <Reveal
                key={value.title}
                as="li"
                delay={i * 0.06}
                className="border-t border-[color:var(--page-line)] pt-5"
              >
                <span className="t-mono text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="t-display-tight mt-3 text-2xl">{value.title}</h3>
                <p className="t-body mt-3 max-w-[42ch] text-sm text-[color:var(--page-muted)]">
                  {value.detail}
                </p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      <section
        data-theme="ink"
        className="border-t border-[color:var(--page-line)] bg-ink-2 py-[var(--gap)] text-center text-[color:var(--page-fg)]"
      >
        <Container>
          <SplitReveal as="h2" type="chars" className="t-display h-md mx-auto max-w-[16ch]">
            Vení a conocerlo
          </SplitReveal>
          <p className="t-body mx-auto mt-6 max-w-[42ch] text-[color:var(--page-muted)]">
            Mirá los programas, o reservá una hora de cabina y probá el equipo
            antes de decidir nada.
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Button href="/programas" variant="solid" cursor="VER">
              Ver programas
            </Button>
            <Button href="/servicios" cursor="RESERVAR">
              Alquilar cabina
            </Button>
          </div>
        </Container>
      </section>
    </>
  );
}
