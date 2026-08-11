import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { Reveal } from "@/components/Reveal";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { PostCard } from "@/components/blog/PostCard";
import { POSTS } from "@/data/posts";

/**
 * Novedades en la home — las tres últimas notas del blog.
 *
 * Va en tinta y entre el sello y el cierre a propósito: ese tramo final ya es
 * un bloque ink completo, así que sumar la sección acá no parte ningún bloque
 * de tema ni agrega una inversión (ver la tabla en `app/page.tsx`).
 *
 * Es la única sección de la home cuyo contenido cambia solo. Vale la pena
 * justamente por eso: si el blog se actualiza, la portada se actualiza con él.
 * Y al revés — si el blog queda abandonado, la home lo muestra. Esa es la
 * razón de que sean tres tarjetas chicas y no un bloque grande.
 *
 * No lleva "use client": no anima nada por su cuenta, la entrada la ponen
 * `Reveal` y `SplitReveal`, que ya son componentes de cliente.
 */
export function Journal() {
  const latest = POSTS.slice(0, 3);

  return (
    <section
      id="blog"
      data-theme="ink"
      className="bg-[color:var(--page-bg)] py-[var(--gap)] text-[color:var(--page-fg)]"
    >
      <Container wide>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <span className="label">Blog</span>
            <SplitReveal as="h2" type="chars" className="t-display h-md mt-5">
              Apuntes
            </SplitReveal>
          </div>
          <p className="t-body max-w-[34ch] text-sm text-[color:var(--page-muted)]">
            Técnica de cabina, lo que pasa en la escena y novedades de la casa.
          </p>
        </div>

        <div className="mt-14 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {latest.map((post, i) => (
            <Reveal key={post.slug} delay={i * 0.05} className="h-full">
              <PostCard post={post} size="sm" />
            </Reveal>
          ))}
        </div>

        <div className="mt-12">
          <Button href="/blog" cursor="LEER">
            Ver todas las notas
          </Button>
        </div>
      </Container>
    </section>
  );
}
