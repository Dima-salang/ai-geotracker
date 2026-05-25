"use client";

import { useEffect, useRef, useState } from "react";
import { HOW_IT_WORKS_STEPS } from "@/lib/marketing/how-it-works";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import {
  bodySmall,
  cardBrutal,
  cardBrutalActive,
  eyebrow,
  marketingContainer,
  microTag,
} from "@/lib/marketing/design-tokens";

export function HowItWorksSection() {
  const [activeStep, setActiveStep] = useState(0);
  const stepRefs = useRef<(HTMLButtonElement | null)[]>([]);

  useEffect(() => {
    const observers = HOW_IT_WORKS_STEPS.map((_, idx) => {
      const el = stepRefs.current[idx];
      if (!el) return null;
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting) setActiveStep(idx);
        },
        { threshold: 0.45, rootMargin: "-10% 0px -30% 0px" }
      );
      observer.observe(el);
      return observer;
    });
    return () => observers.forEach((o) => o?.disconnect());
  }, []);

  const current = HOW_IT_WORKS_STEPS[activeStep];

  return (
    <section
      id="how-it-works"
      className="py-20 md:py-28 px-6 md:px-10 border-b border-border bg-[#FAF9F6] reveal-on-scroll"
    >
      <div className={marketingContainer}>
        <SectionHeader
          eyebrowText="How it works"
          title="Four steps from website to action plan"
          description="We do the research. You get answers you can act on this week."
          className="mb-14 pb-6 border-b border-foreground/10"
        />

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-start">
          <div className="lg:col-span-7 space-y-4">
            {HOW_IT_WORKS_STEPS.map((item, idx) => {
              const isActive = activeStep === idx;
              return (
                <button
                  key={item.step}
                  type="button"
                  ref={(el) => {
                    stepRefs.current[idx] = el;
                  }}
                  onClick={() => setActiveStep(idx)}
                  className={`w-full text-left p-6 transition-all touch-manipulation min-h-[44px] ${
                    isActive ? cardBrutalActive : `${cardBrutal} hover:border-foreground/40`
                  }`}
                >
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <span className={`${eyebrow} ${isActive ? "" : "text-text-muted"}`}>
                      Step {item.step}
                    </span>
                    {isActive ? <span className={microTag}>Active</span> : null}
                  </div>
                  <h3 className="font-display text-xl font-bold uppercase tracking-tight">
                    {item.title}
                  </h3>
                  <p className={`${bodySmall} mt-2 font-bold`}>{item.tagline}</p>
                  {isActive ? (
                    <p className={`${bodySmall} mt-4 border-t border-border pt-4`}>
                      {item.description}
                    </p>
                  ) : null}
                </button>
              );
            })}
          </div>

          <div className="lg:col-span-5 lg:sticky lg:top-24">
            <div className={`${cardBrutal} border-4 border-foreground p-6 md:p-8 min-h-[260px] flex flex-col justify-center`}>
              <p className={eyebrow}>Example insight</p>
              <p className="font-display text-2xl font-bold uppercase mt-4 leading-snug">
                {current.title}
              </p>
              <p className={`${bodySmall} mt-4`}>{current.description}</p>
              <p className="mt-6 font-mono text-[10px] uppercase font-bold border border-primary text-primary px-3 py-2 inline-block w-fit">
                {current.highlight}
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
