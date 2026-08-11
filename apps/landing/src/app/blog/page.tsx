import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";

import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PostCard } from "@/components/blog/PostCard";
import { POSTS, CATEGORY_LABEL, formatPostDate, readingMinutes } from "@/data/posts";
import { CONTACT } from "@/data/contact";

export const metadata: Metadata = {
  title: "Blog",
  description:
    "Notas técnicas, escena electrónica y novedades de La Juanita Studio. Lo que se habla en la cabina, escrito.",
};

/**
 * Índice del blog.
 *
 * La nota más reciente va sola arriba y grande: en un blog que va a publicar
 * poco y espaciado, una grilla pareja hace que la última nota se pierda entre
 * las de hace medio año. El destacado siempre es el primero de `POSTS`, que ya
 * viene ordenado por fecha — no hay un flag `featured` que alguien tenga que
 * acordarse de mover en el CMS.
 *
 * No hay filtro por categoría todavía: con seis notas sería un control que
 * nunca cambia nada. Cuando el volumen lo justifique, la categoría ya está en
 * el dato y el lugar natural es `/blog/categoria/[slug]`.
 */
export default function BlogPage() {
  const [featured, ...rest] = POSTS;

  return (
    <>
      <PageHero
        eyebrow="Blog"
        title="Apuntes de cabina"
        description="Notas técnicas, lo que pasa en la escena y novedades de la casa. Lo que se habla acá adentro, escrito."
        image="/images/espacio/sala-trabajo.jpg"
      />

      {/* Destacado */}
      <section
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <span className="label">Última nota</span>

          <Reveal className="mt-10">
            <Link
              href={`/blog/${featured.slug}`}
              data-cursor="LEER"
              className="group grid items-stretch border border-[color:var(--page-line)] transition-colors hover:border-red lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]"
            >
              <div className="relative min-h-[260px] overflow-hidden lg:min-h-[440px]">
                <Image
                  src={featured.cover}
                  alt=""
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 52vw"
                  className="duotone object-cover transition-transform duration-700 group-hover:scale-[1.04]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[color:var(--page-bg)]/70 to-transparent" />
              </div>

              <div className="flex flex-col justify-center p-7 sm:p-12">
                <span className="t-mono text-red">{CATEGORY_LABEL[featured.category]}</span>
                <h2 className="t-display-tight mt-4 text-[clamp(30px,3.6vw,52px)] leading-[0.98]">
                  {featured.title}
                </h2>
                <p className="t-body mt-6 max-w-[46ch] text-[color:var(--page-muted)]">
                  {featured.excerpt}
                </p>
                <div className="t-mono mt-8 flex flex-wrap items-center gap-x-3 gap-y-1 text-[color:var(--page-faint)]">
                  <span>{featured.author}</span>
                  <span aria-hidden>·</span>
                  <time dateTime={featured.date}>{formatPostDate(featured.date)}</time>
                  <span aria-hidden>·</span>
                  <span>{readingMinutes(featured)} min de lectura</span>
                </div>
                <span
                  aria-hidden
                  className="t-mono mt-8 inline-flex items-center gap-2 text-red transition-transform duration-500 group-hover:translate-x-1"
                >
                  Leer la nota →
                </span>
              </div>
            </Link>
          </Reveal>
        </Container>
      </section>

      {/* El resto, en papel: es la parte de la página que se lee. */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="flex flex-wrap items-end justify-between gap-6">
            <div>
              <span className="label">Todas las notas</span>
              <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
                Archivo
              </SplitReveal>
            </div>
            <p className="t-mono text-[color:var(--page-faint)]">
              {POSTS.length} {POSTS.length === 1 ? "nota" : "notas"}
            </p>
          </div>

          <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {rest.map((post, i) => (
              <Reveal key={post.slug} delay={i * 0.05} className="h-full">
                <PostCard post={post} />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Cierre. Sin formulario de suscripción a propósito: no hay backend que
          reciba mails, y un alta que no da de alta a nadie es peor que no
          ofrecerla. Mientras tanto, el canal donde el equipo ya publica. */}
      <section
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <span className="label">Seguinos</span>
              <SplitReveal as="h2" type="chars" className="t-display h-md mt-5 max-w-[14ch]">
                No te pierdas nada
              </SplitReveal>
              <p className="t-body mt-6 max-w-[44ch] text-[color:var(--page-muted)]">
                Publicamos notas nuevas cada tanto, pero el día a día del estudio
                va por Instagram: fechas, adelantos de lanzamientos y lo que
                pasa en la cabina.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button href={CONTACT.instagram} external variant="solid" cursor="INSTAGRAM">
                Instagram
              </Button>
              <Button href="/programas" cursor="VER">
                Ver los programas
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
