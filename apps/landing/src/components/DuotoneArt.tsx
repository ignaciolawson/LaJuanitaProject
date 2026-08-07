import Image from "next/image";
import clsx from "clsx";
import { Disc3 } from "lucide-react";

/**
 * Shared "cover art" treatment for releases that don't have real artwork yet —
 * a duotone (red/black) pass over a studio photo instead of a flat gradient
 * swatch, so the sello section reads as designed rather than a placeholder grid.
 */
export function DuotoneArt({
  src,
  alt,
  className,
  sizes,
  priority,
}: {
  src: string;
  alt: string;
  className?: string;
  sizes: string;
  priority?: boolean;
}) {
  return (
    <div className={clsx("relative overflow-hidden bg-ink-2", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes}
        priority={priority}
        className="object-cover grayscale contrast-125"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-red/50 via-ink/60 to-ink mix-blend-color" />
      <div className="absolute inset-0 flex items-center justify-center">
        <Disc3 size={32} className="text-[color:var(--page-fg)]/30" aria-hidden />
      </div>
    </div>
  );
}
