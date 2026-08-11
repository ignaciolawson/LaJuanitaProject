import type { Metadata } from "next";
import Image from "next/image";

import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Container } from "@/components/ui/Container";
import { BookingForm } from "@/components/forms/BookingForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, serviceLd } from "@/lib/seo";
import { SERVICES } from "@/data/services";
import { CONTACT } from "@/data/contact";

export const metadata: Metadata = pageMetadata({
  title: "Alquiler de cabina y grabación de sets en Pilar",
  description:
    "Reservá la cabina por hora con Pioneer CDJ-3000 y mixer DJM-900NXS2, o grabá tu set con audio directo del mixer y dos cámaras en 4K. No hace falta ser alumno.",
  path: "/servicios",
});

/**
 * Servicios: alquiler de cabina y grabación de sets.
 *
 * Va como página propia y no como pestaña de Programas porque el público es
 * otro: acá cae gente que ya toca y necesita horas de equipo, no gente
 * evaluando formarse. El formulario de reserva está al final, con el
 * "qué incluye" completo arriba para que se llegue con la decisión tomada.
 */
export default function ServiciosPage() {
  return (
    <>
      <JsonLd
        data={graph(
          breadcrumbLd([{ name: "Servicios", path: "/servicios" }]),
          ...SERVICES.map(serviceLd),
        )}
      />

      <PageHero
        eyebrow="Servicios"
        title="Alquilá el estudio"
        description="La cabina y el equipo de grabación se reservan por hora. No hace falta ser alumno."
        image="/images/espacio/sala-trabajo.jpg"
      />

      {SERVICES.map((service, i) => (
        <section
          key={service.slug}
          id={service.slug}
          // Los cuatro servicios van en papel, como un bloque.
          //
          // Antes el tema alternaba por índice (`i % 2`) y con cuatro
          // servicios el fondo del documento entero se daba vuelta cinco
          // veces en una sola página. La variedad entre bloques la da el
          // zig-zag de la grilla de abajo, que no necesita invertir nada.
          data-theme="bone"
          className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
        >
          <Container wide>
            <div
              className={`grid items-center gap-12 lg:grid-cols-2 lg:gap-20 ${
                i % 2 === 1 ? "lg:[&>*:first-child]:order-2" : ""
              }`}
            >
              <div>
                <span className="label">
                  {String(i + 1).padStart(2, "0")} — {service.tagline}
                </span>
                <SplitReveal as="h2" type="chars" className="t-display h-md mt-5 max-w-[12ch]">
                  {service.name}
                </SplitReveal>

                <p className="t-body mt-8 max-w-[46ch] text-[17px] text-[color:var(--page-muted)]">
                  {service.description}
                </p>

                <div className="mt-10 border-t border-[color:var(--page-line)] pt-6">
                  <span className="t-mono text-[color:var(--page-faint)]">Qué incluye</span>
                  <ul className="mt-4 grid gap-2.5">
                    {service.includes.map((item) => (
                      <li key={item} className="t-body flex gap-3 text-[15px]">
                        <span aria-hidden className="text-red">
                          ·
                        </span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8 flex flex-wrap items-baseline gap-x-4 gap-y-1 border-t border-[color:var(--page-line)] pt-6">
                  <span className="t-display-tight text-3xl">{service.price}</span>
                  <span className="t-mono text-[color:var(--page-faint)]">
                    {service.priceNote}
                  </span>
                </div>
              </div>

              <Reveal>
                <div className="relative aspect-[4/5] w-full overflow-hidden">
                  <Image
                    src={service.image}
                    alt={`${service.name} en La Juanita Studio`}
                    fill
                    sizes="(max-width: 1024px) 100vw, 45vw"
                    className="duotone object-cover"
                  />
                </div>
              </Reveal>
            </div>
          </Container>
        </section>
      ))}

      {/* Reserva */}
      <section
        id="reservar"
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="max-w-[52ch]">
            <span className="label">Reservar</span>
            <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
              Elegí tu hora
            </SplitReveal>
            <p className="t-body mt-6 text-[color:var(--page-muted)]">
              Cargá los datos y te confirmamos disponibilidad. Si el horario que
              pediste ya está tomado, te proponemos el más cercano.
            </p>
          </div>

          <div className="mt-14">
            <BookingForm />
          </div>

          <p className="t-mono mt-12 border-t border-[color:var(--page-line)] pt-6 text-[color:var(--page-faint)]">
            ¿Necesitás algo distinto — más horas, banda completa, otro formato?{" "}
            <a
              href={`https://wa.me/${CONTACT.whatsapp}`}
              target="_blank"
              rel="noopener noreferrer"
              className="link-u text-red"
            >
              Escribinos y lo armamos
            </a>
          </p>
        </Container>
      </section>
    </>
  );
}
