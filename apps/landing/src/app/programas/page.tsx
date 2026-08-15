import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, courseLd } from "@/lib/seo";
import { PROGRAMS } from "@/data/programs";
import { SERVICES } from "@/data/services";

export const metadata: Metadata = pageMetadata({
  title: "Cursos de DJ y producción musical en Pilar",
  description:
    "Dos programas presenciales o virtuales en vivo: Convertite en DJ (8 clases) y Producción Musical Electrónica (16 clases), una clase por semana de una hora y media. Sobre Pioneer CDJ-3000 en cabina real, en Pilar, Buenos Aires.",
  path: "/programas",
});

/**
 * Índice de programas.
 *
 * Antes eran cuatro filas editoriales con todo el detalle acá mismo, lo que
 * dejaba la página larguísima y sin ningún lugar al que llevar a alguien
 * decidido. Ahora son tres tarjetas grandes que resumen y empujan a la
 * página de detalle, donde vive el temario y la inscripción.
 */
export default function ProgramasPage() {
  return (
    <>
      {/* Los tres `Course` van también acá y no sólo en cada detalle: es la
          página que un buscador tiende a elegir para una consulta genérica
          ("cursos de dj en pilar"), y desde ella se entiende la oferta
          completa. Cada uno declara el mismo `@id` que en su página de
          detalle, así que no son duplicados sino la misma entidad descrita
          desde dos lugares. */}
      <JsonLd
        data={graph(
          breadcrumbLd([{ name: "Programas", path: "/programas" }]),
          ...PROGRAMS.map(courseLd),
        )}
      />

      <PageHero
        eyebrow="Programas"
        title="Elegí tu camino"
        description="Tres programas en la sede de Pilar, sobre equipamiento Pioneer DJ profesional. Presenciales o virtuales en vivo."
        image="/images/estudio/equipos.jpg"
      />

      <section
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-6 lg:gap-8">
            {PROGRAMS.map((program, i) => (
              <Reveal key={program.slug} delay={i * 0.06}>
                <article className="group grid items-stretch border border-[color:var(--page-line)] transition-colors hover:border-red lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
                  <div className="relative min-h-[240px] overflow-hidden lg:min-h-[380px]">
                    <Image
                      src={program.image}
                      alt=""
                      fill
                      sizes="(max-width: 1024px) 100vw, 42vw"
                      className="duotone object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                      priority={i === 0}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--page-bg)]/70 to-transparent" />
                    <span className="t-mono absolute left-6 top-6 text-red">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                  </div>

                  <div className="flex flex-col p-7 sm:p-10">
                    <h2 className="t-display-tight text-[clamp(28px,3.4vw,48px)] leading-[0.95]">
                      {program.name}
                    </h2>
                    <p className="t-serif mt-2 text-xl text-[color:var(--page-muted)]">
                      {program.tagline}
                    </p>

                    <p className="t-body mt-6 max-w-[52ch] text-[color:var(--page-muted)]">
                      {program.description}
                    </p>

                    <ul className="mt-6 flex flex-wrap gap-2">
                      {program.highlights.map((h) => (
                        <li
                          key={h}
                          className="t-mono border border-[color:var(--page-line)] px-2.5 py-1 text-[color:var(--page-faint)]"
                        >
                          {h}
                        </li>
                      ))}
                    </ul>

                    <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-4 border-t border-[color:var(--page-line)] pt-6 sm:grid-cols-3">
                      {[
                        { k: "Duración", v: program.duration },
                        { k: "Modalidad", v: program.modality },
                        { k: "Inversión", v: program.price, note: program.priceNote },
                      ].map((item) => (
                        <div key={item.k}>
                          <dt className="t-mono text-[color:var(--page-faint)]">{item.k}</dt>
                          <dd className="t-body mt-1.5 text-sm">{item.v}</dd>
                          {item.note && (
                            <p className="t-mono mt-1 text-[color:var(--page-faint)]">{item.note}</p>
                          )}
                        </div>
                      ))}
                    </dl>

                    <div className="mt-auto pt-8">
                      <Link
                        href={`/programas/${program.slug}`}
                        data-cursor={program.cta === "apply" ? "INSCRIBIRME" : "CONSULTAR"}
                        className="btn btn--solid"
                      >
                        {program.cta === "apply" ? "Ver e inscribirme" : "Ver y consultar"}
                        <span aria-hidden className="text-[1.25em] leading-none">
                          ↗
                        </span>
                      </Link>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Puente a servicios: mucha gente que llega buscando "clases" en
          realidad necesita horas de cabina, no un programa de seis meses. */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <span className="label">¿No buscás un programa?</span>
              <SplitReveal as="h2" type="chars" className="t-display h-md mt-5 max-w-[12ch]">
                Alquilá el estudio
              </SplitReveal>
              <p className="t-body mt-6 max-w-[44ch] text-[color:var(--page-muted)]">
                Si ya tocás y lo que necesitás son horas de equipo, la cabina se
                reserva por hora. También grabamos sets con registro
                audiovisual.
              </p>
              <div className="mt-10">
                <Button href="/servicios" variant="solid" cursor="VER">
                  Ver servicios
                </Button>
              </div>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2">
              {SERVICES.map((service) => (
                <li
                  key={service.slug}
                  className="border border-[color:var(--page-line)] p-6"
                >
                  <h3 className="t-display-tight text-xl">{service.name}</h3>
                  <p className="t-body mt-2 text-sm text-[color:var(--page-muted)]">
                    {service.tagline}
                  </p>
                  <p className="t-mono mt-4 text-red">{service.price}</p>
                </li>
              ))}
            </ul>
          </div>
        </Container>
      </section>
    </>
  );
}
