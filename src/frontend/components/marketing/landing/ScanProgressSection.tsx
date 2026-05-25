"use client";

import Link from "next/link";
import { LoadingBlob } from "@/components/marketing/landing/LoadingBlob";
import { btnPrimary, btnSecondary, eyebrow, headingH2, marketingContainer } from "@/lib/marketing/design-tokens";

type ScanProgressSectionProps = {
  visible: boolean;
  hidden: boolean;
  domain: string;
  progressMessage: string;
  isRateLimited: boolean;
  onRateLimitDismiss: () => void;
};

export function ScanProgressSection({
  visible,
  hidden,
  domain,
  progressMessage,
  isRateLimited,
  onRateLimitDismiss,
}: ScanProgressSectionProps) {
  if (!visible) return null;

  return (
    <section
      id="scan-progress-section"
      className={`border-b border-border bg-surface-container-low transition-all duration-700 ${
        hidden
          ? "max-h-0 py-0 opacity-0 overflow-hidden pointer-events-none border-b-0"
          : "py-16 md:py-28 opacity-100 px-6 md:px-10"
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
            <div className="mb-10 md:mb-12">
              <LoadingBlob />
            </div>

            <p className={`${eyebrow} animate-pulse`}>Checking your visibility</p>
            <h2 className={`${headingH2} mt-3 break-words px-2`}>Analyzing {domain}</h2>
            <p className="font-mono text-[10px] uppercase text-text-muted mt-3 max-w-md tracking-wider min-h-[2.5em]">
              {progressMessage}
            </p>

            <div
              className="loading-progress-track w-full max-w-sm mt-10"
              role="progressbar"
              aria-valuetext={progressMessage}
            >
              <div className="loading-progress-bar" />
            </div>
          </>
        )}
      </div>
    </section>
  );
}
