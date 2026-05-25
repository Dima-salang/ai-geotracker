"use client";

import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { CTABanner } from "@/components/marketing/landing/CTABanner";
import { FaqTeaserSection } from "@/components/marketing/landing/FaqTeaserSection";
import { HeroSection } from "@/components/marketing/landing/HeroSection";
import { HowItWorksSection } from "@/components/marketing/landing/HowItWorksSection";
import { PricingTeaserSection } from "@/components/marketing/landing/PricingTeaserSection";
import { ResultsSection } from "@/components/marketing/landing/ResultsSection";
import { ScanProgressSection } from "@/components/marketing/landing/ScanProgressSection";
import { StatsSection } from "@/components/marketing/landing/StatsSection";
import { ValueSection } from "@/components/marketing/landing/ValueSection";
import { useVisibilityScan } from "@/hooks/useVisibilityScan";

export function LandingPageClient() {
  const scan = useVisibilityScan();

  const showProgress = scan.progressStage !== "";
  const hideProgress = scan.showDashboard;

  return (
    <MarketingLayout>
      <main>
        <HeroSection
          domain={scan.domain}
          onDomainChange={scan.setDomain}
          onSubmit={scan.startScan}
          loading={scan.loading}
          errorMsg={scan.errorMsg}
          hasResult={!!scan.scanResult}
          onReset={() => {
            scan.resetScan();
            document.getElementById("hero-section")?.scrollIntoView({ behavior: "smooth" });
          }}
        />

        <ScanProgressSection
          visible={showProgress}
          hidden={hideProgress}
          domain={scan.domain}
          progressMessage={scan.progressMessage}
          isRateLimited={scan.isRateLimited}
          researchedFacts={scan.researchedFacts}
          onRateLimitDismiss={scan.clearRateLimit}
        />

        <ResultsSection
          visible={scan.showDashboard || !!scan.scanResult}
          loading={scan.loading}
          overallScore={scan.liveOverallScore}
          summary={scan.liveSummary}
          recommendations={scan.liveRecommendations}
          details={scan.liveResearchedDetails}
          providerResults={scan.activeResults}
          scanId={scan.scanResult?.scanId}
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
