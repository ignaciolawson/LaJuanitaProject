import Image from "next/image";

import { Reveal } from "@/components/Reveal";
import { RevealImage } from "@/components/RevealImage";
import type { PostBlock } from "@/data/posts";

/**
 * Cuerpo de una nota.
 *
 * Recibe el array de bloques tal como sale de `data/posts.ts` — que es la misma
 * forma que tiene el Portable Text de Sanity. Cuando el contenido venga del CMS,
 * este componente no cambia: cambia de dónde sale el array.
 *
 * No hay plugin de tipografía (`@tailwindcss/typography`) y no hace falta: el
 * sitio ya tiene sus propias utilidades (`.t-body`, `.t-display-tight`, `.label`)
 * y un `prose` genérico las pisaría con su propia escala, que es justo lo que el
 * diseño no quiere. Cada bloque trae su clase explícita.
 */
export function PostBody({ blocks }: { blocks: PostBlock[] }) {
  return (
    <div className="max-w-[68ch]">
      {blocks.map((block, i) => (
        <Block key={i} block={block} />
      ))}
    </div>
  );
}

function Block({ block }: { block: PostBlock }) {
  switch (block.type) {
    case "text":
      return (
        <Reveal as="p" className="t-body mt-7 text-[17px] leading-[1.65] first:mt-0">
          {block.text}
        </Reveal>
      );

    case "heading":
      return (
        <Reveal as="h2" className="t-display-tight mt-14 text-[clamp(24px,2.6vw,34px)] leading-[1.05]">
          {block.text}
        </Reveal>
      );

    case "list":
      return (
        <Reveal as="ul" className="mt-8 space-y-4 border-l border-[color:var(--page-line)] pl-6">
          {block.items.map((item) => (
            <li key={item} className="t-body flex gap-3 text-[17px] leading-[1.6]">
              <span aria-hidden className="mt-[0.6em] h-px w-3 shrink-0 bg-red" />
              <span>{item}</span>
            </li>
          ))}
        </Reveal>
      );

    case "ranked":
      return (
        <ol className="mt-10">
          {block.items.map((item, i) => (
            <Reveal
              key={item.title}
              as="li"
              delay={i * 0.04}
              className="grid grid-cols-[auto_minmax(0,1fr)] gap-5 border-t border-[color:var(--page-line)] py-6"
            >
              <span className="t-mono pt-1.5 text-red">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h3 className="t-display-tight text-xl">{item.title}</h3>
                <p className="t-body mt-2 text-[16px] leading-[1.6] text-[color:var(--page-muted)]">
                  {item.text}
                </p>
              </div>
            </Reveal>
          ))}
        </ol>
      );

    case "quote":
      return (
        <Reveal as="figure" className="my-14 border-l-2 border-red pl-7">
          <blockquote className="t-serif text-[clamp(21px,2.4vw,30px)] leading-[1.3]">
            {block.text}
          </blockquote>
          {block.attribution && (
            <figcaption className="t-mono mt-4 text-[color:var(--page-faint)]">
              {block.attribution}
            </figcaption>
          )}
        </Reveal>
      );

    case "image":
      return (
        <figure className="my-14">
          <RevealImage className="aspect-[4/3]" parallaxScale={0.12}>
            <Image
              src={block.src}
              alt={block.caption ?? ""}
              fill
              sizes="(max-width: 1024px) 100vw, 720px"
              className="object-cover"
            />
          </RevealImage>
          {block.caption && (
            <figcaption className="t-mono mt-3 text-[color:var(--page-faint)]">
              {block.caption}
            </figcaption>
          )}
        </figure>
      );

    case "embed":
      return <Embed block={block} />;
  }
}

/**
 * Video o track embebido.
 *
 * Con `id` vacío no se renderiza el iframe: se muestra una placa que dice que
 * falta el material. Es a propósito. Las notas de ejemplo no tienen videos
 * reales, y un iframe apuntando a un ID inventado se ve como un reproductor de
 * YouTube diciendo "el video no está disponible" — eso parece un sitio roto, no
 * un sitio sin terminar. Cuando el CMS traiga el ID real, el iframe aparece solo.
 */
function Embed({
  block,
}: {
  block: Extract<PostBlock, { type: "embed" }>;
}) {
  const isYouTube = block.provider === "youtube";

  if (!block.id) {
    return (
      <div className="my-14 border border-dashed border-[color:var(--page-line)] p-8 text-center">
        <span className="label">{isYouTube ? "Video" : "Escucha"}</span>
        <p className="t-body mt-4 text-sm text-[color:var(--page-muted)]">{block.title}</p>
        <p className="t-mono mt-2 text-[color:var(--page-faint)]">Pendiente de carga</p>
      </div>
    );
  }

  const src = isYouTube
    ? `https://www.youtube-nocookie.com/embed/${block.id}`
    : `https://open.spotify.com/embed/${block.id}`;

  return (
    <figure className="my-14">
      <div className={isYouTube ? "aspect-video" : "h-[152px]"}>
        <iframe
          src={src}
          title={block.title}
          loading="lazy"
          allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="h-full w-full border-0"
        />
      </div>
      <figcaption className="t-mono mt-3 text-[color:var(--page-faint)]">
        {block.title}
      </figcaption>
    </figure>
  );
}
