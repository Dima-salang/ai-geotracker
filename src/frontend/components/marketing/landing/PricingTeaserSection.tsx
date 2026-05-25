import Link from "next/link";
import { PRICING_TIERS } from "@/lib/marketing/pricing-tiers";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { eyebrow, marketingContainer } from "@/lib/marketing/design-tokens";

export function PricingTeaserSection() {
  return (
    <section id="pricing-section" className="py-20 md:py-28 px-6 md:px-10 bg-surface-container-low reveal-on-scroll border-b border-border">
      <div className={marketingContainer}>
        <SectionHeader
          eyebrowText="Pricing"
          title="Start free. Grow when you're ready."
          description="Every plan includes real AI checks—not generic SEO scores."
          className="mb-12 pb-6 border-b border-foreground/10"
        />
        <PricingCards tiers={PRICING_TIERS} />
        <p className="text-center mt-10">
          <Link href="/pricing" className={`${eyebrow} hover:underline`}>
            Compare all plan details →
          </Link>
        </p>
      </div>
    </section>
  );
}
