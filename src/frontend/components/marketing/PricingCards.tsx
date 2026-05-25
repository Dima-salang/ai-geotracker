import Link from "next/link";
import type { PricingTier } from "@/lib/marketing/pricing-tiers";
import { bodySmall, btnPrimary, btnSecondary, cardBrutal, cardBrutalActive, microTag } from "@/lib/marketing/design-tokens";

type PricingCardsProps = {
  tiers: PricingTier[];
};

export function PricingCards({ tiers }: PricingCardsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-0 md:border md:border-border md:bg-border">
      {tiers.map((tier, i) => (
        <article
          key={tier.id}
          className={`relative flex flex-col p-8 md:p-10 ${
            tier.highlighted
              ? `${cardBrutalActive} md:-m-px z-10`
              : `${cardBrutal} ${i < tiers.length - 1 ? "md:border-r-0" : ""}`
          }`}
        >
          {tier.badge ? (
            <span className={`${microTag} absolute -top-3 left-6`}>{tier.badge}</span>
          ) : null}

          <div className="flex-grow">
            <h3 className="font-display text-2xl font-bold uppercase text-foreground">{tier.name}</h3>
            <div className="flex items-baseline gap-1 mt-3 mb-4 border-y border-border py-3">
              <span className="font-mono text-4xl font-extrabold text-foreground">{tier.price}</span>
              <span className="font-mono text-xs text-text-muted uppercase font-bold">/ {tier.period}</span>
            </div>
            <p className={`${bodySmall} mb-6`}>{tier.description}</p>
            <ul className="space-y-2.5 border-t border-border pt-6">
              {tier.features.map((feature) => (
                <li key={feature} className="flex gap-2 font-mono text-[10px] text-foreground font-bold">
                  <span className="text-primary shrink-0">✓</span>
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="pt-8">
            {tier.href?.startsWith("mailto:") ? (
              <a
                href={tier.href}
                className={`block w-full text-center ${tier.highlighted ? btnPrimary : btnSecondary}`}
              >
                {tier.cta}
              </a>
            ) : (
              <Link
                href={tier.href || "/"}
                className={`block w-full text-center ${tier.highlighted ? btnPrimary : btnSecondary}`}
              >
                {tier.cta}
              </Link>
            )}
          </div>
        </article>
      ))}
    </div>
  );
}
