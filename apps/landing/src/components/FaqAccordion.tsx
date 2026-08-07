"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import clsx from "clsx";
import { Reveal } from "@/components/Reveal";
import type { FaqItem } from "@/data/faq";

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <Reveal as="div" className="divide-y divide-border-subtle border-y border-border-subtle">
      {items.map((item, index) => {
        const isOpen = openIndex === index;
        return (
          <div key={item.question}>
            <button
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : index)}
              aria-expanded={isOpen}
              className="flex w-full cursor-pointer items-center justify-between gap-4 py-6 text-left"
            >
              <span className="font-display text-base font-bold text-white sm:text-lg">
                {item.question}
              </span>
              <Plus
                size={20}
                className={clsx(
                  "shrink-0 text-red transition-transform duration-300",
                  isOpen && "rotate-45",
                )}
                aria-hidden
              />
            </button>
            <div
              className={clsx(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <p className="overflow-hidden pb-6 text-sm leading-relaxed text-text-secondary">
                {item.answer}
              </p>
            </div>
          </div>
        );
      })}
    </Reveal>
  );
}
