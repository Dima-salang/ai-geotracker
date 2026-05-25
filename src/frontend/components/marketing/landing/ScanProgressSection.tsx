"use client";

import Link from "next/link";
import type { ResearchFact } from "@/hooks/useVisibilityScan";
import { btnPrimary, btnSecondary, eyebrow, headingH2, marketingContainer } from "@/lib/marketing/design-tokens";

const FLOATING_POSITIONS = [
  { top: "-55%", left: "-85%" },
  { top: "-15%", right: "-90%" },
  { bottom: "-65%", left: "-55%" },
  { top: "-80%", right: "-55%" },
  { bottom: "45%", left: "-90%" },
  { bottom: "-50%", right: "-70%" },
] as const;

type ScanProgressSectionProps = {
  visible: boolean;
  hidden: boolean;
  domain: string;
  progressMessage: string;
  isRateLimited: boolean;
  researchedFacts: ResearchFact[];
  onRateLimitDismiss: () => void;
};

export function ScanProgressSection({
  visible,
  hidden,
  domain,
  progressMessage,
  isRateLimited,
  researchedFacts,
  onRateLimitDismiss,
}: ScanProgressSectionProps) {
  if (!visible) return null;

  return (
    <section
      id="scan-progress-section"
      className={`border-b border-border bg-surface-container-low transition-all duration-700 ${
        hidden
          ? "max-h-0 py-0 opacity-0 overflow-hidden pointer-events-none border-b-0"
          : "py-16 md:py-24 opacity-100 px-6 md:px-10"
      }`}
      aria-live="polite"
      aria-busy={!isRateLimited}
    >
      <div className={`${marketingContainer} max-w-2xl flex flex-col items-center text-center`}>
        {isRateLimited ? (
          <>
            <p className={eyebrow}>Free check limit reached</p>
            <h2 className={`${headingH2} mt-4`}>
              You&apos;ve used your free checks for {domain}
            </h2>
            <p className="font-sans text-sm text-text-muted mt-4 leading-relaxed max-w-lg">
              Upgrade for unlimited checks and full action plans—or try a different website.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 mt-8 w-full sm:w-auto justify-center">
              <Link href="/pricing" className={btnPrimary}>
                View plans
              </Link>
              <button type="button" onClick={onRateLimitDismiss} className={btnSecondary}>
                Try another site
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="relative w-48 h-48 sm:w-56 sm:h-56 md:w-72 md:h-72 flex items-center justify-center mb-8 md:mb-10">
              <div className="absolute inset-0 ethereal-blob" aria-hidden />
              {researchedFacts.map((fact, idx) => {
                const pos = FLOATING_POSITIONS[idx % FLOATING_POSITIONS.length];
                return (
                  <div
                    key={fact.id}
                    className={`floating-pill floating-fact-enter-${(idx % 6) + 1} max-w-[140px] sm:max-w-none`}
                    style={pos}
                  >
                    <span className="font-mono text-[9px] text-primary uppercase tracking-widest block mb-0.5 font-bold">
                      {fact.label}
                    </span>
                    <span className="font-sans text-xs font-bold text-foreground leading-tight">
                      {fact.value}
                    </span>
                  </div>
                );
              })}
            </div>

            <p className={eyebrow}>Checking your visibility</p>
            <h2 className={`${headingH2} mt-3 break-words`}>Analyzing {domain}</h2>
            <p className="font-mono text-[10px] uppercase text-text-muted mt-3 max-w-md tracking-wider">
              {progressMessage}
            </p>

            <div className="w-full max-w-xs h-1 bg-border mt-8 overflow-hidden" role="progressbar" aria-valuetext="In progress">
              <div className="h-full w-2/5 bg-primary animate-pulse" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
