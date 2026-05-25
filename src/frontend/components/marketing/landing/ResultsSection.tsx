"use client";

import ResultsDashboard, {
  type ProviderResult,
  type ResearchedDetails,
  type ScanRecommendation,
} from "@/components/ResultsDashboard";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { eyebrow, marketingContainer } from "@/lib/marketing/design-tokens";

type ResultsSectionProps = {
  visible: boolean;
  loading: boolean;
  overallScore: number;
  summary: { green: number; yellow: number; red: number };
  recommendations: ScanRecommendation[];
  details: ResearchedDetails;
  providerResults: ProviderResult[];
  scanId?: string;
};

export function ResultsSection({
  visible,
  loading,
  overallScore,
  summary,
  recommendations,
  details,
  providerResults,
  scanId,
}: ResultsSectionProps) {
  return (
    <section
      id="results-section"
      className={`px-6 md:px-10 bg-surface-container-low border-border transition-all duration-700 ${
        visible
          ? "opacity-100 py-16 md:py-20 border-b max-h-[8000px]"
          : "opacity-0 max-h-0 py-0 overflow-hidden pointer-events-none border-b-0"
      }`}
    >
      <div className={`${marketingContainer} max-w-6xl`}>
        <div className="mb-10 pb-4 border-b border-foreground/10 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-4">
          <SectionHeader
            eyebrowText={loading ? "Live results" : "Your report"}
            title="Your AI visibility scorecard"
            description={
              loading
                ? "Results appear as each AI platform responds."
                : "See who recommends you, who doesn’t, and what to fix next."
            }
          />
          <span className={`${eyebrow} shrink-0`}>
            {loading ? "Updating…" : "Complete"}
          </span>
        </div>
        <ResultsDashboard
          overallScore={overallScore}
          summary={summary}
          recommendations={recommendations}
          details={details}
          providerResults={providerResults}
          scanId={scanId}
          isScanning={loading}
        />
      </div>
    </section>
  );
}
