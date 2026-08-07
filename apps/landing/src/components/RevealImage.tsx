"use client";

import { useRef, type ReactNode } from "react";
import clsx from "clsx";
import { gsap, useGSAP } from "@/lib/gsap";

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
    <div ref={wrapperRef} className={clsx("relative overflow-hidden", className)}>
      <div ref={mediaRef} className="absolute inset-0">
        {children}
      </div>
    </div>
  );
}
