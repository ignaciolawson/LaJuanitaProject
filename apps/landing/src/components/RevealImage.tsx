"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { gsap, useGSAP, prefersReduced } from "@/lib/gsap";

type RevealImageProps = {
  children: ReactNode;
  className?: string;
  /** How much the image scales down as it scrolls through the viewport (Ken Burns feel). 0 disables. */
  parallaxScale?: number;
};

export function RevealImage({
  children,
  className,
  parallaxScale = 0.18,
}: RevealImageProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const mediaRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const wrapper = wrapperRef.current;
      const media = mediaRef.current;
      if (!wrapper || !media) return;
      // Con menos movimiento pedido no se toca nada: la foto ya está en su
      // estado final. Antes se aplicaba igual el clip inicial y la cortina
      // se abría con el scroll de todos modos.
      if (prefersReduced()) return;

      gsap.set(media, { scale: 1 + parallaxScale, clipPath: "inset(100% 0 0 0)" });

      gsap.to(media, {
        clipPath: "inset(0% 0 0 0)",
        duration: 1.1,
        ease: "power4.out",
        scrollTrigger: {
          trigger: wrapper,
          start: "top 80%",
          toggleActions: "play none none reverse",
        },
      });

      if (parallaxScale > 0) {
        gsap.to(media, {
          scale: 1,
          ease: "none",
          scrollTrigger: {
            trigger: wrapper,
            start: "top bottom",
            end: "bottom top",
            scrub: 0.6,
          },
        });
      }
    },
    { scope: wrapperRef, dependencies: [parallaxScale] },
  );

  return (
    <div
      ref={wrapperRef}
      className={clsx("relative overflow-hidden", className)}
      // Placa neutra debajo de la foto. Estas imágenes son lazy, así que
      // entre que la cortina se abre y el archivo termina de bajar se veía
      // el fondo de la página a través del hueco. Va con color-mix sobre los
      // tokens para que funcione igual en tinta y en papel. (Es CSS estático:
      // acá color-mix no molesta, lo que GSAP no sabe interpolar es animarlo.)
      style={{ background: "color-mix(in srgb, var(--page-fg) 7%, var(--page-bg))" }}
    >
      <div ref={mediaRef} className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}
