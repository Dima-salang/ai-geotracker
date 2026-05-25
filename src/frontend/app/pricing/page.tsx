"use client";

import Link from "next/link";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { PricingCards } from "@/components/marketing/PricingCards";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { PRICING_TIERS } from "@/lib/marketing/pricing-tiers";
import { bodySmall, cardBrutal, eyebrow, marketingContainer } from "@/lib/marketing/design-tokens";

const TRUST_POINTS = [
  {
    title: "Transparent pricing",
    body: "No hidden fees. Start with a free check, upgrade when you want unlimited reports and hands-on help.",
  },
  {
    title: "Real AI platforms",
    body: "We query the tools your customers actually use—ChatGPT, Gemini, Claude, Perplexity, and more.",
  },
  {
    title: "Ongoing visibility",
    body: "Paid plans let you re-check after you update your site and listings, so you can see progress over time.",
  },
];

export default function PricingPage() {
  return (
    <MarketingLayout mainClassName="blueprint-bg">
      <main className={`flex-grow ${marketingContainer} py-16 md:py-24 w-full`}>
        <SectionHeader
          eyebrowText="Plans"
          title="Choose the level of help you need"
          description="Every plan starts with understanding whether AI recommends your business. Upgrade when you want unlimited checks or done-for-you fixes."
          align="center"
          className="mx-auto text-center mb-14 pb-6 border-b border-foreground/10"
        />

        <PricingCards tiers={PRICING_TIERS} />

        <div className={`mt-12 md:mt-16 grid grid-cols-1 md:grid-cols-3 gap-0 ${cardBrutal} border-2 border-foreground`}>
          {TRUST_POINTS.map((point, i) => (
            <div
              key={point.title}
              className={`p-6 md:p-8 text-center md:text-left ${
                i < TRUST_POINTS.length - 1 ? "border-b md:border-b-0 md:border-r border-border" : ""
              }`}
            >
              <p className={eyebrow}>{point.title}</p>
              <p className={`${bodySmall} mt-3`}>{point.body}</p>
            </div>
          ))}
        </div>

        <p className="text-center mt-12 font-mono text-[10px] uppercase text-text-muted tracking-wider">
          Questions?{" "}
          <Link href="/faq" className="text-primary font-bold hover:underline">
            FAQ
          </Link>
          {" · "}
          <a href="mailto:sales@iozera.ai" className="text-primary font-bold hover:underline">
            sales@iozera.ai
          </a>
        </p>
      </main>
    </MarketingLayout>
  );
}
