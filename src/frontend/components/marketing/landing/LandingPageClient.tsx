"use client";

import { useCallback, useState } from "react";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { CTABanner } from "@/components/marketing/landing/CTABanner";
import { DevPreviewToggle } from "@/components/marketing/landing/DevPreviewToggle";
import { FaqTeaserSection } from "@/components/marketing/landing/FaqTeaserSection";
import { HeroSection } from "@/components/marketing/landing/HeroSection";
import { HowItWorksSection } from "@/components/marketing/landing/HowItWorksSection";
import { PricingTeaserSection } from "@/components/marketing/landing/PricingTeaserSection";
import { ResultsSection } from "@/components/marketing/landing/ResultsSection";
import { ScanProgressSection } from "@/components/marketing/landing/ScanProgressSection";
import { StatsSection } from "@/components/marketing/landing/StatsSection";
import { ValueSection } from "@/components/marketing/landing/ValueSection";
import {
  DEV_PREVIEW_DETAILS,
  DEV_PREVIEW_DOMAIN,
  DEV_PREVIEW_PROGRESS_MESSAGE,
  DEV_PREVIEW_PROVIDERS,
  DEV_PREVIEW_RECOMMENDATIONS,
  DEV_PREVIEW_SCORE,
  DEV_PREVIEW_SUMMARY,
} from "@/lib/marketing/dev-preview-data";
import { useVisibilityScan } from "@/hooks/useVisibilityScan";

export function LandingPageClient() {
  const scan = useVisibilityScan();
  const [devPreview, setDevPreview] = useState(false);

  const toggleDevPreview = useCallback(() => {
    setDevPreview((on) => {
      const next = !on;
      if (next && !scan.domain.trim()) {
        scan.setDomain(DEV_PREVIEW_DOMAIN);
      }
      if (next) {
        requestAnimationFrame(() => {
          document.getElementById("scan-progress-section")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
          });
        });
      }
      return next;
    });
  }, [scan]);

  const realScanActive = scan.progressStage !== "" || scan.loading || !!scan.scanResult;

  const showProgress = scan.progressStage !== "" || devPreview;
  const hideProgress = (scan.showDashboard || !!scan.scanResult) && !devPreview;

  const showResults = scan.showDashboard || !!scan.scanResult || devPreview;

  const progressDomain = scan.domain.trim() || DEV_PREVIEW_DOMAIN;
  const progressMessage =
    scan.progressStage !== "" ? scan.progressMessage : DEV_PREVIEW_PROGRESS_MESSAGE;

  const resultsLoading = devPreview && !realScanActive ? false : scan.loading;
  const overallScore = devPreview && !realScanActive ? DEV_PREVIEW_SCORE : scan.liveOverallScore;
  const summary = devPreview && !realScanActive ? DEV_PREVIEW_SUMMARY : scan.liveSummary;
  const recommendations =
    devPreview && !realScanActive ? DEV_PREVIEW_RECOMMENDATIONS : scan.liveRecommendations;
  const details =
    devPreview && !realScanActive ? DEV_PREVIEW_DETAILS : scan.liveResearchedDetails;
  const providerResults =
    devPreview && !realScanActive ? DEV_PREVIEW_PROVIDERS : scan.activeResults;
  const scanId = devPreview && !scan.scanResult ? "preview" : scan.scanResult?.scanId;

  return (
    <MarketingLayout>
      <DevPreviewToggle active={devPreview} onToggle={toggleDevPreview} />

      <main>
        <HeroSection
          domain={scan.domain}
          onDomainChange={scan.setDomain}
          onSubmit={scan.startScan}
          loading={scan.loading}
          errorMsg={scan.errorMsg}
          hasResult={!!scan.scanResult}
          onReset={() => {
            setDevPreview(false);
            scan.resetScan();
            document.getElementById("hero-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <ScanProgressSection
          visible={showProgress}
          hidden={hideProgress}
          domain={progressDomain}
          progressMessage={progressMessage}
          isRateLimited={scan.isRateLimited}
          onRateLimitDismiss={scan.clearRateLimit}
        />

        <ResultsSection
          visible={showResults}
          loading={resultsLoading}
          overallScore={overallScore}
          summary={summary}
          recommendations={recommendations}
          details={details}
          providerResults={providerResults}
          scanId={scanId}
        />

        <StatsSection />
        <ValueSection />
        <HowItWorksSection />
        <PricingTeaserSection />
        <CTABanner />
        <FaqTeaserSection />
      </main>
    </MarketingLayout>
  );
}
