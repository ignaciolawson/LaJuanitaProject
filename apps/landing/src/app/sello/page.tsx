import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { RevealImage } from "@/components/RevealImage";
import { DuotoneArt } from "@/components/DuotoneArt";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd } from "@/lib/seo";
import { RELEASES } from "@/data/releases";
import { UPCOMING_DATES } from "@/data/dates";
import { CONTACT } from "@/data/contact";

export const metadata: Metadata = pageMetadata({
  title: "La Juanita Records — el sello discográfico",
  description:
    "El sello discográfico de La Juanita Studio: distribución, arte y mastering en la misma sala donde se produce. Para artistas de la escena electrónica de zona norte.",
  path: "/sello",
});

export default function SelloPage() {
  const [featured, ...rest] = RELEASES;

  return (
    <>
      {/* Sólo migas de pan. `MusicAlbum` / `MusicRecording` por cada
          lanzamiento sería lo correcto, pero `data/releases.ts` es placeholder
          heredado: títulos, artistas y fechas están inventados. Marcar
          lanzamientos falsos como discos reales le daría a Google y a los
          asistentes de IA una discografía que no existe, atada al nombre de
          artistas reales. Va cuando estén los datos del sello. */}
      <JsonLd data={graph(breadcrumbLd([{ name: "Sello", path: "/sello" }]))} />

      <PageHero
        eyebrow="Sello discográfico"
        title={
          <>
            La Juanita <span className="font-normal text-[color:var(--page-muted)]">Records</span>
          </>
        }
        description="Editamos y distribuimos la música de nuestros artistas, con el mismo estudio de mastering donde formamos a nuestros alumnos."
        image="/images/estudio/team.jpg"
      />

      <section data-theme="ink" className="bg-[color:var(--page-bg)] py-20 sm:py-28">
        <Container>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <Reveal>
              <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-[color:var(--page-faint)]">
                Último lanzamiento
              </span>
            </Reveal>
            <Reveal>
              <Button href={CONTACT.spotify} variant="outline" external>
                Escuchar en Spotify
              </Button>
            </Reveal>
          </div>

          {/* Featured release */}
          <div className="mt-8 flex flex-col gap-8 lg:flex-row lg:items-center lg:gap-16">
            <RevealImage className="aspect-square w-full  lg:w-[45%]">
              <DuotoneArt
                src={featured.image}
                alt={featured.title}
                sizes="(min-width: 1024px) 45vw, 100vw"
                priority
                className="h-full w-full"
              />
            </RevealImage>
            <Reveal className="lg:w-[55%]">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-accent">
                {featured.genre} · {featured.date}
              </p>
              <h2 className="mt-3 t-display-tight text-4xl leading-[0.95] text-[color:var(--page-fg)] sm:text-5xl">
                {featured.title}
              </h2>
              <p className="mt-3 text-lg text-[color:var(--page-muted)]">{featured.artist}</p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-[color:var(--page-faint)]">
                Preview de 10 segundos disponible próximamente — por ahora,
                escuchalo completo en Spotify.
              </p>
            </Reveal>
          </div>

          {/* Rest of the catalog, as a list — not a grid of equal squares */}
          <Reveal
            as="ul"
            stagger={0.08}
            className="mt-16 divide-y divide-[color:var(--page-line)] border-y border-[color:var(--page-line)]"
          >
            {rest.map((release) => (
              <li key={release.title}>
                <a
                  href={release.url}
                  data-cursor="PLAY"
                  className="group flex items-center gap-5 py-5 transition-colors hover:bg-ink-2/50"
                >
                  <DuotoneArt
                    src={release.image}
                    alt={release.title}
                    sizes="64px"
                    className="h-16 w-16 shrink-0 "
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate t-display-tight text-lg text-[color:var(--page-fg)]">
                      {release.title}
                    </p>
                    <p className="truncate text-sm text-[color:var(--page-muted)]">
                      {release.artist} · {release.genre}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-[color:var(--page-faint)]">{release.date}</span>
                </a>
              </li>
            ))}
          </Reveal>
        </Container>
      </section>

      <section data-theme="ink" className="border-t border-[color:var(--page-line)] bg-ink-2 py-20 sm:py-28">
        <Container>
          <Reveal>
            <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-accent">
              Agenda
            </span>
            <h2 className="mt-3 t-display-tight text-3xl leading-[0.95] text-[color:var(--page-fg)] sm:text-4xl">
              Próximas <span className="font-normal text-[color:var(--page-muted)]">fechas</span>
            </h2>
          </Reveal>

          <Reveal
            as="ul"
            stagger={0.1}
            className="mt-12 divide-y divide-[color:var(--page-line)] border-y border-[color:var(--page-line)]"
          >
            {UPCOMING_DATES.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-8"
              >
                <div className="flex items-baseline gap-2 sm:w-24 sm:flex-col sm:items-start sm:gap-0">
                  <span className="font-display text-3xl font-bold text-[color:var(--page-fg)]">{item.day}</span>
                  <span className="font-display text-sm font-semibold uppercase tracking-wide text-accent">
                    {item.month}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-[color:var(--page-faint)]">
                    {item.type}
                  </span>
                  <p className="mt-1 t-display-tight text-lg text-[color:var(--page-fg)]">{item.title}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-[color:var(--page-muted)]">
                  <MapPin size={16} className="text-accent" aria-hidden />
                  {item.location}
                </div>
              </li>
            ))}
          </Reveal>
        </Container>
      </section>
    </>
  );
}
