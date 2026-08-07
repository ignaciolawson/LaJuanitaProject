import type { ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { SplitReveal } from "@/components/motion/SplitReveal";
import { Reveal } from "@/components/Reveal";

export function PageHero({
  eyebrow,
  title,
  description,
  image,
}: {
  eyebrow: string;
  title: ReactNode;
  description?: string;
  image: string;
}) {
  return (
    /* Las páginas interiores se quedan en tinta: `data-theme` acá evita
       que el tema quede colgado del último color de la home al navegar. */
    <section
      data-theme="ink"
      className="relative flex min-h-[65svh] items-end overflow-hidden bg-[color:var(--page-bg)] pb-16 pt-32 text-[color:var(--page-fg)] sm:min-h-[70svh]"
    >
      <div className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-30 grayscale"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/40 via-ink/70 to-ink" />
      </div>

      <Container className="relative z-10">
        <Reveal>
          <span className="label">{eyebrow}</span>
        </Reveal>
        <SplitReveal
          as="h1"
          type="lines"
          trigger="load"
          className="t-display h-lg mt-6 max-w-4xl"
        >
          {title}
        </SplitReveal>
        {description && (
          <Reveal delay={0.3} className="mt-6 max-w-lg">
            <p className="t-body text-lg text-[color:var(--page-muted)]">{description}</p>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
