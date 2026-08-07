"use client";

import { useRef, type ElementType, type ReactNode } from "react";
import { gsap, useGSAP, SplitText } from "@/lib/gsap";

type RevealTextProps = {
  children: ReactNode;
  as?: ElementType;
  className?: string;
  /** "load" animates immediately on mount (hero headlines); "scroll" waits for the viewport. */
  trigger?: "load" | "scroll";
  delay?: number;
  stagger?: number;
};

export function RevealText({
  children,
  as: Tag = "div",
  className,
  trigger = "scroll",
  delay = 0,
  stagger = 0.06,
}: RevealTextProps) {
  const ref = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const split = SplitText.create(el, {
        type: "lines",
        mask: "lines",
        linesClass: "reveal-line",
      });

      gsap.set(split.lines, { yPercent: 110 });

      const anim = {
        yPercent: 0,
        duration: 0.9,
        stagger,
        delay,
        ease: "expo.out",
      };

      if (trigger === "load") {
        gsap.to(split.lines, anim);
      } else {
        gsap.to(split.lines, {
          ...anim,
          scrollTrigger: {
            trigger: el,
            start: "top 85%",
            toggleActions: "play none none reverse",
          },
        });
      }

      return () => split.revert();
    },
    { scope: ref },
  );

  const Wrapper = Tag as ElementType;
  return (
    <Wrapper ref={ref} className={className}>
      {children}
    </Wrapper>
  );
}
