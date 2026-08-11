import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { ProgramApplyForm } from "@/components/forms/ProgramApplyForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, courseLd } from "@/lib/seo";
import { PROGRAMS, getProgram } from "@/data/programs";
import { CONTACT } from "@/data/contact";

/**
 * Página de detalle de un programa.
 *
 * Es la respuesta al pedido de "que al hacer click te cuente qué es, por qué
 * elegir La Juanita y por qué es para vos". El orden está pensado para cómo
 * se decide algo así: primero entender qué es, después si es para uno,
 * recién ahí el temario, y el formulario al final — cuando ya hay razones
 * para completarlo.
 *
 * Mix & Mastering no muestra formulario: es a medida y con cupo de sala, así
 * que pedirle a alguien los mismos datos que en un programa con fecha de
 * arranque sería pedirle trabajo por una respuesta que igual va a ser
 * "hablemos".
 */

export function generateStaticParams() {
  return PROGRAMS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/programas/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) return {};

  return pageMetadata({
    // El título lleva la modalidad y la ciudad porque la búsqueda real no es
    // "convertite en dj" (que es el nombre comercial, y nadie lo busca): es
    // "curso de dj en pilar". El nombre propio del programa igual va primero
    // para que quien ya conoce la marca lo reconozca.
    title: `${program.name} — ${program.duration.split("·")[0].trim()} en Pilar`,
    description: program.description,
    path: `/programas/${program.slug}`,
  });
}

export default async function ProgramaPage({ params }: PageProps<"/programas/[slug]">) {
  const { slug } = await params;
  const program = getProgram(slug);
  if (!program) notFound();

  const others = PROGRAMS.filter((p) => p.slug !== program.slug);

  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbLd([
            { name: "Programas", path: "/programas" },
            { name: program.name, path: `/programas/${program.slug}` },
          ]),
          courseLd(program),
        )}
      />

      <PageHero
        eyebrow={program.shortName}
        title={program.name}
        description={program.tagline}
        image={program.image}
      />

      {/* Ficha rápida: lo que alguien chequea antes de leer nada */}
      <section
        data-theme="ink"
        className="border-y border-[color:var(--page-line)] bg-[color:var(--page-bg)] py-8"
      >
        <Container wide>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            {[
              { k: "Duración", v: program.duration },
              { k: "Modalidad", v: program.modality },
              { k: "Nivel", v: program.levelLabel },
              { k: "Inversión", v: program.price },
            ].map((item) => (
              <div key={item.k}>
                <dt className="t-mono text-[color:var(--page-faint)]">{item.k}</dt>
                <dd className="t-body mt-2 text-sm text-[color:var(--page-fg)]">{item.v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Qué es */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="label">Qué es</span>
            </div>
            <div className="lg:col-span-8">
              <div className="max-w-[58ch] space-y-6">
                {program.intro.map((paragraph, i) => (
                  <SplitReveal
                    key={i}
                    as="p"
                    type="lines"
                    className={
                      i === 0
                        ? "t-display-tight text-[clamp(20px,2.1vw,30px)] leading-[1.25] normal-case"
                        : "t-body text-[17px] text-[color:var(--page-muted)]"
                    }
                  >
                    {paragraph}
                  </SplitReveal>
                ))}
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Por qué acá — queda en papel para no partir el bloque de luz que
          va de "Qué es" hasta "Para quién". */}
      <section
        data-theme="bone"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <span className="label">Por qué en La Juanita</span>
          <SplitReveal as="h2" type="chars" className="t-display h-md mt-5 max-w-[14ch]">
            Lo que cambia
          </SplitReveal>

          <ol className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2">
            {program.reasons.map((reason, i) => (
              <Reveal
                key={reason.title}
                as="li"
                delay={i * 0.06}
                className="border-t border-[color:var(--page-line)] pt-5"
              >
                <span className="t-mono text-red">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="t-display-tight mt-3 text-2xl">{reason.title}</h3>
                <p className="t-body mt-3 max-w-[42ch] text-sm text-[color:var(--page-muted)]">
                  {reason.detail}
                </p>
              </Reveal>
            ))}
          </ol>
        </Container>
      </section>

      {/* Para quién + temario */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-16 lg:grid-cols-2 lg:gap-20">
            <div>
              <span className="label">Es para vos si</span>
              <ul className="mt-10 space-y-5">
                {program.forWho.map((item) => (
                  <Reveal
                    key={item}
                    as="li"
                    className="flex gap-4 border-b border-[color:var(--page-line)] pb-5"
                  >
                    <span aria-hidden className="t-mono shrink-0 text-red">
                      →
                    </span>
                    <span className="t-body text-[17px]">{item}</span>
                  </Reveal>
                ))}
              </ul>

              <div className="mt-12">
                <span className="label">Terminás con</span>
                <ul className="mt-8 space-y-3">
                  {program.outcomes.map((item) => (
                    <li key={item} className="t-body flex gap-3 text-sm">
                      <span aria-hidden className="text-red">
                        ·
                      </span>
                      <span className="text-[color:var(--page-muted)]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div>
              <span className="label">Temario</span>
              <ol className="mt-10">
                {program.modules.map((mod, i) => (
                  <Reveal
                    key={mod.title}
                    as="li"
                    delay={i * 0.04}
                    className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 border-b border-[color:var(--page-line)] py-5"
                  >
                    <span className="t-mono pt-1 text-[color:var(--page-faint)]">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="t-display-tight text-xl">{mod.title}</h3>
                      <p className="t-body mt-1.5 text-sm text-[color:var(--page-muted)]">
                        {mod.detail}
                      </p>
                    </div>
                  </Reveal>
                ))}
              </ol>
            </div>
          </div>
        </Container>
      </section>

      {/* Solicitud o consulta */}
      <section
        id="solicitar"
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          {program.cta === "apply" ? (
            <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
              <div>
                <span className="label">Solicitar lugar</span>
                <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
                  Anotate
                </SplitReveal>
                <p className="t-body mt-6 max-w-[38ch] text-[color:var(--page-muted)]">
                  Dejanos tus datos y te contamos fechas de arranque, cupos
                  disponibles y formas de pago. No es un compromiso: es una
                  conversación.
                </p>
                <p className="t-mono mt-8 text-[color:var(--page-faint)]">
                  ¿Preferís hablar antes?{" "}
                  <a
                    href={`https://wa.me/${CONTACT.whatsapp}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-u text-red"
                  >
                    Escribinos por WhatsApp
                  </a>
                </p>
              </div>

              <ProgramApplyForm programName={program.name} />
            </div>
          ) : (
            <div className="max-w-[62ch]">
              <span className="label">Cupo limitado</span>
              <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
                Hablemos
              </SplitReveal>
              <p className="t-body mt-6 text-[color:var(--page-muted)]">
                Este programa se arma a medida según tu material y el tiempo de
                sala disponible, así que arranca por una charla y no por un
                formulario. Contanos qué producís y coordinamos.
              </p>
              <div className="mt-10 flex flex-wrap gap-3">
                <Button href="/contacto" variant="solid" cursor="ESCRIBIR">
                  Consultar
                </Button>
                <Button
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  external
                  cursor="WHATSAPP"
                >
                  WhatsApp
                </Button>
              </div>
            </div>
          )}
        </Container>
      </section>

      {/* Los otros programas */}
      <section
        data-theme="ink"
        className="border-t border-[color:var(--page-line)] bg-ink-2 py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <span className="label">Otros programas</span>
          <div className="mt-10 grid gap-5 sm:grid-cols-2">
            {others.map((other) => (
              <Link
                key={other.slug}
                href={`/programas/${other.slug}`}
                data-cursor="ABRIR"
                className="group relative flex items-center gap-6 overflow-hidden border border-[color:var(--page-line)] p-6 transition-colors hover:border-red"
              >
                <div className="relative h-20 w-20 shrink-0 overflow-hidden">
                  <Image
                    src={other.image}
                    alt=""
                    fill
                    sizes="80px"
                    className="duotone object-cover"
                  />
                </div>
                <div className="min-w-0">
                  <h3 className="t-display-tight text-xl leading-tight">{other.name}</h3>
                  <p className="t-mono mt-2 text-[color:var(--page-faint)]">{other.duration}</p>
                </div>
                <span
                  aria-hidden
                  className="t-mono ml-auto shrink-0 text-red transition-transform duration-500 group-hover:translate-x-1"
                >
                  →
                </span>
              </Link>
            ))}
          </div>
        </Container>
      </section>
    </>
  );
}
