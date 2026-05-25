"use client";

import Image from "next/image";
import { useState } from "react";
import DitheredParticles from "@/components/DitheredParticles";
import {
  bodyText,
  btnPrimary,
  eyebrow,
  headingH1,
  heroContainer,
  inputField,
  inputWrapper,
} from "@/lib/marketing/design-tokens";

type HeroSectionProps = {
  domain: string;
  onDomainChange: (value: string) => void;
  onSubmit: () => void;
  loading: boolean;
  errorMsg: string;
  hasResult: boolean;
  onReset: () => void;
};

export function HeroSection({
  domain,
  onDomainChange,
  onSubmit,
  loading,
  errorMsg,
  hasResult,
  onReset,
}: HeroSectionProps) {
  const [inputFocused, setInputFocused] = useState(false);

  return (
    <section
      id="hero-section"
      className="relative min-h-screen min-h-[100dvh] blueprint-bg flex items-start justify-center overflow-hidden border-b border-border pt-20 md:pt-32 pb-16"
    >
      <DitheredParticles />

      {/* Desktop: earth anchored right, no glow */}
      <div
        className="hidden md:block absolute right-[-11vw] lg:right-[-13vw] bottom-0 w-[75%] lg:w-[85%] h-full pointer-events-none z-0"
        aria-hidden
      >
        <div className="w-full h-full relative">
          <Image
            src="/ai-earth-removebg-preview-dithered.svg"
            alt=""
            fill
            priority
            sizes="(min-width: 768px) 75vw, 0px"
            className="object-contain object-right-bottom"
          />
        </div>
      </div>

      <div
        className={`relative z-10 ${heroContainer} grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center py-12 md:py-6`}
      >
        {/* Left: copy + form — shifted left on desktop like original */}
        <div className="flex flex-col justify-center order-1 text-center md:text-left md:max-w-[440px] lg:max-w-[480px] w-full md:-translate-x-6 lg:-translate-x-12 xl:-translate-x-16 mx-auto md:mx-0">


          <h1 className={`${headingH1} mb-6`}>
            Is AI sending customers to you—or your competitors?
          </h1>

          <p className={`${bodyText} mb-8 max-w-lg mx-auto md:mx-0`}>
            Customers ask ChatGPT, Gemini, and Claude who to trust and where to shop. GeoTracker shows
            whether they hear your name—and gives you simple steps to fix it.
          </p>

          <div className="flex flex-col gap-4 w-full max-w-md mx-auto md:mx-0">
            {/* Attached input + CTA per DESIGN.md */}
            <div
              className={`flex flex-col sm:flex-row w-full ${inputWrapper} p-px sm:items-stretch ${
                inputFocused ? "border-primary" : ""
              } ${loading ? "opacity-60" : ""}`}
            >
              <label htmlFor="hero-business-url" className="sr-only">
                Your business website
              </label>
              <div className="flex-1 min-w-0">
                <input
                  id="hero-business-url"
                  type="text"
                  inputMode="url"
                  autoComplete="url"
                  value={domain}
                  onChange={(e) => onDomainChange(e.target.value)}
                  placeholder="yourbusiness.com"
                  disabled={loading}
                  onFocus={() => setInputFocused(true)}
                  onBlur={() => setInputFocused(false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !loading) onSubmit();
                  }}
                  className={inputField}
                />
              </div>
              <button
                type="button"
                id="cta-check-visibility"
                onClick={onSubmit}
                disabled={loading}
                className={`${btnPrimary} w-full sm:w-auto sm:shrink-0 sm:border-l-0`}
              >
                {loading ? "Checking…" : "Check score"}
              </button>
            </div>

            {errorMsg ? (
              <p className="font-mono text-[10px] text-rose-600 uppercase font-bold text-left" role="alert">
                {errorMsg}
              </p>
            ) : null}
          </div>

          {hasResult && !loading ? (
            <button
              type="button"
              onClick={onReset}
              className="mt-4 font-mono text-[10px] uppercase font-bold text-primary hover:text-primary-hover text-left w-full md:w-auto touch-manipulation min-h-11"
            >
              ← Check another website
            </button>
          ) : null}

          <p className="font-mono text-[10px] uppercase text-text-muted mt-6 tracking-tighter">
            No credit card · Results in minutes
          </p>
        </div>

        {/* Mobile: earth below copy */}
        <div className="order-2 md:hidden flex items-center justify-center w-full max-w-[min(100%,600px)] mx-auto">
          <div className="w-full aspect-[677/369] relative">
            <Image
              src="/ai-earth-removebg-preview-dithered.svg"
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-contain"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
