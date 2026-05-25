"use client";

import Link from "next/link";
import DitheredParticles from "@/components/DitheredParticles";
import { MarketingLayout } from "@/components/marketing/MarketingLayout";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { SERVICE_OFFERINGS } from "@/lib/marketing/services";
import { btnPrimary, cardBrutal, marketingContainer } from "@/lib/marketing/design-tokens";

export default function ServicesPage() {
  return (
    <MarketingLayout mainClassName="blueprint-bg">
      <main className="flex-grow relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0" aria-hidden>
          <DitheredParticles />
        </div>

        <div className={`relative z-10 ${marketingContainer} py-16 md:py-24`}>
          <SectionHeader
            eyebrowText="What we do"
            title="Services built for local business owners"
            description="See if AI recommends you, understand your competitors, and get a plain-language plan to improve—without a technical background."
            className="mb-14 pb-8 border-b border-foreground/10"
          />

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8">
            {SERVICE_OFFERINGS.map((service) => (
              <article
                key={service.title}
                className={`${cardBrutal} border-2 border-foreground p-6 md:p-8 flex flex-col hover:shadow-[8px_8px_0px_#0055ff] hover:-translate-y-0.5 transition-all`}
              >
                <span className={`w-3 h-3 ${service.accentClass} border border-foreground mb-6`} aria-hidden />
                <h2 className="font-display text-2xl font-bold uppercase mb-2 tracking-tight">
                  {service.title}
                </h2>
                <p className="font-mono text-xs text-primary font-bold uppercase tracking-wider mb-4">
                  {service.subtitle}
                </p>
                <p className="font-sans text-sm text-text-muted leading-relaxed mb-6 flex-grow">
                  {service.description}
                </p>
                <ul className="space-y-2 mb-8">
                  {service.details.map((detail) => (
                    <li key={detail} className="flex gap-2 font-mono text-[10px] text-foreground font-bold">
                      <span className="text-primary shrink-0">✓</span>
                      {detail}
                    </li>
                  ))}
                </ul>
                <Link href="/" className={`w-full text-center ${btnPrimary}`}>
                  Check my business free
                </Link>
              </article>
            ))}
          </div>
        </div>
      </main>
    </MarketingLayout>
  );
}
