"use client";

import Link from "next/link";
import DitheredParticles from "@/components/DitheredParticles";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { MARKETING_FAQS } from "@/lib/marketing/faqs";
import { btnPrimary, marketingContainer } from "@/lib/marketing/design-tokens";

export default function FAQPage() {
  return (
    <MarketingLayout mainClassName="blueprint-bg">
      <main className="flex-grow relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
          <DitheredParticles />
        </div>

        <div className={`relative z-10 ${marketingContainer} max-w-3xl py-16 md:py-24`}>
          <SectionHeader
            eyebrowText="Help center"
            title="Frequently asked questions"
            description="Clear answers about AI visibility, how our check works, and what to do after you get your score."
            align="center"
            className="mx-auto text-center mb-12 pb-6 border-b border-foreground/10"
          />

          <FaqAccordion items={MARKETING_FAQS} />

          <div className="text-center mt-12 p-6 md:p-8 border-2 border-dashed border-primary/40 bg-primary/[0.04]">
            <h3 className="font-display text-xl font-bold uppercase mb-2">Ready to see your score?</h3>
            <p className="font-sans text-sm text-text-muted mb-5 max-w-md mx-auto">
              Enter your website on the home page and get results in minutes—free to start.
            </p>
            <Link href="/" className={btnPrimary}>
              Start free check
            </Link>
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
