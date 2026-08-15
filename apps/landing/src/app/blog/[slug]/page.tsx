import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { PageHero } from "@/components/PageHero";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { PostBody } from "@/components/blog/PostBody";
import { PostCard } from "@/components/blog/PostCard";
import { JsonLd } from "@/components/seo/JsonLd";
import { pageMetadata, graph, breadcrumbLd, blogPostingLd } from "@/lib/seo";
import {
  POSTS,
  CATEGORY_LABEL,
  getPost,
  getRelatedPosts,
  formatPostDate,
  readingMinutes,
} from "@/data/posts";

/**
 * Nota del blog.
 *
 * Estático como el resto del sitio: los slugs salen de `data/posts.ts` en
 * build. Cuando el contenido pase a un CMS, esto se vuelve el punto de
 * decisión — `generateStaticParams` va a consultar la API y hará falta
 * revalidación (ISR o webhook), porque si no una nota publicada no aparece
 * hasta el próximo deploy.
 */

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: PageProps<"/blog/[slug]">): Promise<Metadata> {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) return {};

  return pageMetadata({
    title: post.title,
    description: post.excerpt,
    path: `/blog/${post.slug}`,
    type: "article",
    publishedTime: post.date,
    authors: [post.author],
    images: [post.cover],
  });
}

export default async function PostPage({ params }: PageProps<"/blog/[slug]">) {
  const { slug } = await params;
  const post = getPost(slug);
  if (!post) notFound();

  const related = getRelatedPosts(slug);

  return (
    <>
      {/* ⚠️ `author` sale de `post.author`, y hoy las seis notas son de
          ejemplo, firmadas con los nombres reales de los profesores (ver
          `data/posts.ts`). Publicar así no sólo muestra un texto que no
          escribieron: lo declara como dato estructurado, o sea que la
          atribución falsa pasa a ser una afirmación verificable sobre
          personas reales. El bloqueo para publicar sigue siendo reescribir o
          borrar esas notas, no sacar este marcado. */}
      <JsonLd
        data={graph(
          breadcrumbLd([
            { name: "Blog", path: "/blog" },
            { name: post.title, path: `/blog/${post.slug}` },
          ]),
          blogPostingLd(post),
        )}
      />

      <PageHero
        eyebrow={CATEGORY_LABEL[post.category]}
        title={post.title}
        description={post.excerpt}
        image={post.cover}
      />

      {/* Ficha de la nota */}
      <section
        data-theme="ink"
        className="border-y border-[color:var(--page-line)] bg-[color:var(--page-bg)] py-8"
      >
        <Container wide>
          <dl className="grid grid-cols-2 gap-x-6 gap-y-6 lg:grid-cols-4">
            {[
              { k: "Escribe", v: post.author },
              { k: "Publicada", v: formatPostDate(post.date) },
              { k: "Lectura", v: `${readingMinutes(post)} min` },
              { k: "Sección", v: CATEGORY_LABEL[post.category] },
            ].map((item) => (
              <div key={item.k}>
                <dt className="t-mono text-[color:var(--page-faint)]">{item.k}</dt>
                <dd className="t-body mt-2 text-sm text-[color:var(--page-fg)]">{item.v}</dd>
              </div>
            ))}
          </dl>
        </Container>
      </section>

      {/* Cuerpo. En papel: es texto largo y se lee mucho mejor con la página
          clara. Es el bloque de luz de esta ruta — ink → bone → ink. */}
      <section
        data-theme="bone"
        className="paper relative overflow-hidden bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container>
          <article>
            <PostBody blocks={post.body} />
          </article>

          <div className="mt-20 max-w-[68ch] border-t border-[color:var(--page-line)] pt-8">
            <Link href="/blog" data-cursor="VOLVER" className="t-mono link-u text-accent">
              ← Todas las notas
            </Link>
          </div>
        </Container>
      </section>

      {/* Seguí leyendo */}
      <section
        data-theme="ink"
        className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <span className="label">Seguí leyendo</span>
          <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((other, i) => (
              <Reveal key={other.slug} delay={i * 0.05} className="h-full">
                <PostCard post={other} size="sm" />
              </Reveal>
            ))}
          </div>
        </Container>
      </section>

      {/* Cierre */}
      <section
        data-theme="ink"
        className="border-t border-[color:var(--page-line)] bg-ink-2 py-[var(--gap)] text-[color:var(--page-fg)]"
      >
        <Container wide>
          <div className="grid gap-10 lg:grid-cols-2 lg:items-center lg:gap-20">
            <div>
              <span className="label">Practicalo</span>
              <SplitReveal as="h2" type="chars" className="t-display h-md mt-5 max-w-[13ch]">
                Sobre el equipo
              </SplitReveal>
              <p className="t-body mt-6 max-w-[44ch] text-[color:var(--page-muted)]">
                Leer sobre esto sirve hasta cierto punto. Lo que lo fija es
                tenerlo bajo las manos: la cabina se alquila por hora y los
                programas arrancan varias veces al año.
              </p>
            </div>

            <div className="flex flex-wrap gap-3 lg:justify-end">
              <Button href="/programas" variant="solid" cursor="VER">
                Ver los programas
              </Button>
              <Button href="/servicios#reservar" cursor="RESERVAR">
                Alquilar la cabina
              </Button>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
