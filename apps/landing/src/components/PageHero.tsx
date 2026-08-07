import type { ReactNode } from "react";
import Image from "next/image";
import { Container } from "@/components/ui/Container";
import { RevealText } from "@/components/RevealText";
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
    <section className="relative flex min-h-[65svh] items-end overflow-hidden bg-bg pb-16 pt-32 sm:min-h-[70svh]">
      <div className="absolute inset-0">
        <Image
          src={image}
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-35"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-bg/40 via-bg/70 to-bg" />
      </div>

      <Container className="relative z-10">
        <Reveal>
          <span className="font-display text-xs font-semibold uppercase tracking-[0.3em] text-red">
            {eyebrow}
          </span>
        </Reveal>
        <RevealText
          as="h1"
          trigger="load"
          className="mt-4 max-w-3xl font-display text-5xl font-bold leading-[1.05] tracking-tight text-white sm:text-6xl lg:text-7xl"
        >
          {title}
        </RevealText>
        {description && (
          <Reveal delay={0.3} className="mt-6 max-w-lg">
            <p className="text-lg leading-relaxed text-text-secondary">{description}</p>
          </Reveal>
        )}
      </Container>
    </section>
  );
}
