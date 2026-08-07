import type { Metadata } from "next";
import { MapPin } from "lucide-react";
import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { RevealImage } from "@/components/RevealImage";
import { DuotoneArt } from "@/components/DuotoneArt";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { RELEASES } from "@/data/releases";
import { UPCOMING_DATES } from "@/data/dates";
import { CONTACT } from "@/data/contact";

export const metadata: Metadata = {
  title: "Sello Discográfico",
  description:
    "La Juanita Records — el sello discográfico detrás de la academia, con el mismo estudio de mastering.",
};

export default function SelloPage() {
  const [featured, ...rest] = RELEASES;

  return (
    <>
      <PageHero
        eyebrow="Sello discográfico"
        title={
          <>
            La Juanita <span className="font-normal text-text-secondary">Records</span>
          </>
        }
        description="Editamos y distribuimos la música de nuestros artistas, con el mismo estudio de mastering donde formamos a nuestros alumnos."
        image="/images/estudio/team.jpg"
      />

      <section className="bg-bg py-20 sm:py-28">
        <Container>
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
            <Reveal>
              <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-text-subdued">
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
            <RevealImage className="aspect-square w-full rounded-2xl lg:w-[45%]">
              <DuotoneArt
                src={featured.image}
                alt={featured.title}
                sizes="(min-width: 1024px) 45vw, 100vw"
                priority
                className="h-full w-full"
              />
            </RevealImage>
            <Reveal className="lg:w-[55%]">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-red">
                {featured.genre} · {featured.date}
              </p>
              <h2 className="mt-3 font-display text-4xl font-bold leading-[1.05] tracking-tight text-white sm:text-5xl">
                {featured.title}
              </h2>
              <p className="mt-3 text-lg text-text-secondary">{featured.artist}</p>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-text-subdued">
                Preview de 10 segundos disponible próximamente — por ahora,
                escuchalo completo en Spotify.
              </p>
            </Reveal>
          </div>

          {/* Rest of the catalog, as a list — not a grid of equal squares */}
          <Reveal
            as="ul"
            stagger={0.08}
            className="mt-16 divide-y divide-border-subtle border-y border-border-subtle"
          >
            {rest.map((release) => (
              <li key={release.title}>
                <a
                  href={release.url}
                  data-cursor="PLAY"
                  className="group flex items-center gap-5 py-5 transition-colors hover:bg-surface/50"
                >
                  <DuotoneArt
                    src={release.image}
                    alt={release.title}
                    sizes="64px"
                    className="h-16 w-16 shrink-0 rounded-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-lg font-bold text-white">
                      {release.title}
                    </p>
                    <p className="truncate text-sm text-text-secondary">
                      {release.artist} · {release.genre}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-text-subdued">{release.date}</span>
                </a>
              </li>
            ))}
          </Reveal>
        </Container>
      </section>

      <section className="border-t border-border-subtle bg-surface py-20 sm:py-28">
        <Container>
          <Reveal>
            <span className="font-display text-xs font-semibold uppercase tracking-[0.25em] text-red">
              Agenda
            </span>
            <h2 className="mt-3 font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">
              Próximas <span className="font-normal text-text-secondary">fechas</span>
            </h2>
          </Reveal>

          <Reveal
            as="ul"
            stagger={0.1}
            className="mt-12 divide-y divide-border-subtle border-y border-border-subtle"
          >
            {UPCOMING_DATES.map((item) => (
              <li
                key={item.title}
                className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:gap-8"
              >
                <div className="flex items-baseline gap-2 sm:w-24 sm:flex-col sm:items-start sm:gap-0">
                  <span className="font-display text-3xl font-bold text-white">{item.day}</span>
                  <span className="font-display text-sm font-semibold uppercase tracking-wide text-red">
                    {item.month}
                  </span>
                </div>
                <div className="flex-1">
                  <span className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-text-subdued">
                    {item.type}
                  </span>
                  <p className="mt-1 font-display text-lg font-bold text-white">{item.title}</p>
                </div>
                <div className="flex items-center gap-2 text-sm text-text-secondary">
                  <MapPin size={16} className="text-red" aria-hidden />
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
