"use client";

import { useState } from "react";
import type { FaqItem } from "@/lib/marketing/faqs";
import { bodySmall, cardBrutal } from "@/lib/marketing/design-tokens";

type FaqAccordionProps = {
  items: FaqItem[];
  className?: string;
};

export function FaqAccordion({ items, className = "" }: FaqAccordionProps) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className={`${cardBrutal} border-2 border-foreground divide-y-2 divide-foreground ${className}`}>
      {items.map((faq, idx) => {
        const isOpen = openIndex === idx;
        const panelId = `faq-panel-${idx}`;
        const buttonId = `faq-button-${idx}`;
        return (
          <div key={faq.question}>
            <button
              id={buttonId}
              type="button"
              onClick={() => setOpenIndex(isOpen ? null : idx)}
              className="w-full flex justify-between items-start gap-4 p-5 md:p-6 text-left hover:bg-primary/[0.02] transition-colors touch-manipulation min-h-11"
              aria-expanded={isOpen}
              aria-controls={panelId}
            >
              <span className="font-display text-sm md:text-base font-bold uppercase text-foreground leading-snug text-left">
                <span className="font-mono text-xs text-primary mr-2">0{idx + 1}.</span>
                {faq.question}
              </span>
              <span className="font-mono text-sm font-black text-primary shrink-0" aria-hidden>
                {isOpen ? "[ − ]" : "[ + ]"}
              </span>
            </button>
            <div
              id={panelId}
              role="region"
              aria-labelledby={buttonId}
              className={`grid transition-[grid-template-rows] duration-300 ease-out ${
                isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <div className="overflow-hidden">
                <p className={`px-5 md:px-6 pb-5 md:pb-6 ${bodySmall} border-t-2 border-foreground bg-surface-container-low/40`}>
                  {faq.answer}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
