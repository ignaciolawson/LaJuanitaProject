import type { Metadata } from "next";
import { Disc3, Speaker, Headphones, Cable } from "lucide-react";

import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { VelocityMarquee } from "@/components/motion/VelocityMarquee";
import { Container } from "@/components/ui/Container";
import { GearInquiryForm } from "@/components/forms/GearInquiryForm";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd } from "@/lib/seo";
import { GEAR } from "@/data/gear";
import { CONTACT } from "@/data/contact";

const ICONS = {
  controller: Disc3,
  monitor: Speaker,
  headphones: Headphones,
  accessories: Cable,
} as const;

export const metadata: Metadata = pageMetadata({
  title: "Venta de equipamiento para DJ en Pilar",
  description:
    "La Juanita Shop: controladores, monitores de estudio, auriculares y accesorios para DJ y producción musical, con asesoramiento según tu nivel y presupuesto. Pilar, Buenos Aires.",
  path: "/equipos",
});

/**
 * La Juanita Shop.
 *
 * Sin catálogo ni precios: no conozco el stock real y publicar modelos que
 * después no están es peor que no publicar nada. La página explica el rango
 * de cada categoría y empuja a la consulta, que además es la forma en que
 * el negocio ya vende — asesorando.
 *
 * Cuando exista el catálogo, esta página es el lugar natural para una
 * grilla de productos con precio, y el formulario baja a un segundo plano.
 */
export default function EquiposPage() {
  return (
    <>
      {/* Sólo migas de pan. Nada de `Product` ni `Offer`: no hay catálogo, ni
          marcas, ni modelos, ni precios — y marcar como producto algo que no
          se puede comprar es justamente lo que Google penaliza como datos
          estructurados que no se corresponden con la página. Cuando exista
          catálogo real, acá van `Product` + `Offer`. */}
      <JsonLd data={graph(breadcrumbLd([{ name: "Equipos", path: "/equipos" }]))} />

      <PageHero
        eyebrow="La Juanita Shop"
        title="Armá o renová tu setup"
        description="Controladores, monitores, auriculares y accesorios. Todo lo que necesitás, en un solo lugar."
        image="/images/estudio/equipos.jpg"
      />

      {/* Banda roja, el mismo recurso que usan en redes */}
      <div data-theme="ink" className="bg-red text-white">
        <VelocityMarquee
          className="t-display-tight py-3 text-[clamp(26px,3.6vw,52px)] leading-none"
          speed={26}
          separator="—"
          items={["DJ Shop", "DJ Shop", "DJ Shop", "DJ Shop"]}
        />
      </div>

      {/* Cómo compramos con vos */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-4">
              <span className="label">Cómo funciona</span>
            </div>
            <div className="lg:col-span-8">
              <SplitReveal
                as="p"
                type="words"
                className="t-display-tight text-[clamp(22px,2.4vw,34px)] leading-[1.2] normal-case"
              >
                No te vendemos el equipo más caro. Te vendemos el que te sirve.
              </SplitReveal>

              <div className="mt-8 max-w-[56ch] space-y-5 text-[color:var(--page-muted)]">
                <SplitReveal as="p" type="lines" className="t-body text-[17px]">
                  Antes de cotizarte cualquier cosa preguntamos tres cosas: en
                  qué nivel estás, dónde vas a usarlo y con cuánto contás. Con
                  eso la conversación cambia por completo — a veces la respuesta
                  es un equipo más barato del que venías a buscar, y a veces es
                  esperar un mes y llevarte algo que no vas a tener que cambiar
                  el año que viene.
                </SplitReveal>
                <SplitReveal as="p" type="lines" className="t-body text-[17px]">
                  Somos los mismos que damos clase y grabamos acá adentro, así
                  que el equipo que te recomendamos es equipo que usamos. Si
                  algo no nos convence, te lo decimos.
                </SplitReveal>
              </div>
            </div>
          </div>
        </Container>
      </section>

      {/* Categorías */}
      <section
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <span className="label">Qué conseguís</span>
          <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
            Categorías
          </SplitReveal>

          <div className="mt-16 grid gap-6 lg:grid-cols-2 lg:gap-8">
            {GEAR.map((category, i) => {
              const Icon = ICONS[category.icon];
              return (
                <Reveal key={category.slug} delay={i * 0.06}>
                  <article className="group flex h-full flex-col border border-[color:var(--page-line)] p-7 transition-colors hover:border-red sm:p-9">
                    <div className="flex items-start justify-between gap-6">
                      <div className="min-w-0">
                        <span className="t-mono text-accent">
                          {String(i + 1).padStart(2, "0")}
                        </span>
                        <h3 className="t-display-tight mt-3 text-[clamp(26px,2.8vw,40px)] leading-[0.96]">
                          {category.name}
                        </h3>
                        <p className="t-serif mt-2 text-lg text-[color:var(--page-muted)]">
                          {category.tagline}
                        </p>
                      </div>
                      <Icon
                        size={34}
                        strokeWidth={1.3}
                        aria-hidden
                        className="shrink-0 text-accent transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>

                    <p className="t-body mt-6 max-w-[48ch] text-[color:var(--page-muted)]">
                      {category.description}
                    </p>

                    <div className="mt-auto pt-7">
                      <span className="t-mono text-[color:var(--page-faint)]">Incluye</span>
                      <ul className="mt-4 grid gap-2 border-t border-[color:var(--page-line)] pt-5">
                        {category.covers.map((item) => (
                          <li key={item} className="t-body flex gap-2.5 text-sm">
                            <span aria-hidden className="text-accent">
                              ·
                            </span>
                            <span className="text-[color:var(--page-muted)]">{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                </Reveal>
              );
            })}
          </div>

          <p className="t-mono mt-10 border-t border-[color:var(--page-line)] pt-6 text-[color:var(--page-faint)]">
            Marcas, modelos y precios se confirman por consulta según stock del
            momento.
          </p>
        </Container>
      </section>

      {/* Consulta */}
      <section
        id="consultar"
        data-theme="ink"
        className="border-t border-[color:var(--page-line)] bg-ink-2 py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-14 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)] lg:gap-20">
            <div>
              <span className="label">Consultar</span>
              <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
                Decinos qué buscás
              </SplitReveal>
              <p className="t-body mt-6 max-w-[38ch] text-[color:var(--page-muted)]">
                Contanos en qué andás y te armamos opciones con precio
                actualizado. Si no sabés bien qué necesitás, mejor todavía: para
                eso está la consulta.
              </p>
              <p className="t-mono mt-8 text-[color:var(--page-faint)]">
                ¿Preferís hablar directo?{" "}
                <a
                  href={`https://wa.me/${CONTACT.whatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-u text-accent"
                >
                  Escribinos por WhatsApp
                </a>
              </p>
            </div>

            <GearInquiryForm />
          </div>
        </Container>
      </section>
    </>
  );
}
