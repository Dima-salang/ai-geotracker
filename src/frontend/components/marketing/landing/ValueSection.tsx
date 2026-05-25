import Link from "next/link";
import { BENTO_CARDS } from "@/lib/marketing/bento-cards";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { bentoGrid, bodyText, eyebrow, marketingContainer } from "@/lib/marketing/design-tokens";

const ICONS = {
  lead: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" aria-hidden>
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  ),
  reputation: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted" aria-hidden>
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  ),
  optimize: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted" aria-hidden>
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  competitive: (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-primary" aria-hidden>
      <path d="M3 3v18h18" />
      <path d="m19 9-5 5-4-4-3 3" />
    </svg>
  ),
};

export function ValueSection() {
  const [lead, reputation, optimize, competitive] = BENTO_CARDS;

  return (
    <section id="value-section" className="py-20 md:py-28 px-6 md:px-10 bg-surface-container-low reveal-on-scroll">
      <div className={marketingContainer}>
        <SectionHeader
          eyebrowText="Why business owners use GeoTracker"
          title="Turn AI recommendations into real customers"
          description="One clear score. One action plan. No technical manuals."
          className="mb-14 pb-6 border-b border-foreground/10"
        />

        <div className={`${bentoGrid} grid-cols-1 md:grid-cols-12`}>
          <article className="md:col-span-8 bg-background p-8 md:p-12 md:border-r border-border border-b md:border-b-0 group hover:bg-primary/[0.03] transition-colors">
            {ICONS.lead}
            <h3 className="font-display text-2xl md:text-[2rem] font-bold uppercase mt-6 mb-4 tracking-tight">
              {lead.title}
            </h3>
            <p className={`${bodyText} max-w-lg`}>{lead.body}</p>
            <Link
              href="#hero-section"
              className={`inline-flex items-center gap-2 mt-8 ${eyebrow} hover:gap-3 transition-all`}
            >
              {lead.cta} →
            </Link>
          </article>

          <article className="md:col-span-4 bg-surface-container-low p-8 md:p-10 flex flex-col border-b md:border-b-0 border-border">
            {ICONS.reputation}
            <h4 className="font-mono text-xs font-bold uppercase mt-4 mb-4">{reputation.title}</h4>
            <p className="font-mono text-[10px] text-text-muted leading-relaxed">{reputation.body}</p>
          </article>

          <article className="md:col-span-4 bg-surface-container-high p-8 md:p-10 border-b md:border-b-0 md:border-r border-border">
            {ICONS.optimize}
            <h3 className="font-display text-2xl font-bold uppercase mt-4 mb-4 tracking-tight">
              {optimize.title}
            </h3>
            <p className={bodyText}>{optimize.body}</p>
          </article>

          <article className="md:col-span-8 bg-background p-8 md:p-12 group hover:bg-surface-container-low/50 transition-colors">
            <div className="flex justify-between items-start mb-6">
              {ICONS.competitive}
              <span className="font-mono text-[10px] bg-primary text-white px-3 py-1 uppercase font-bold">
                Popular
              </span>
            </div>
            <h3 className="font-display text-2xl md:text-[2rem] font-bold uppercase mb-4 tracking-tight">
              {competitive.title}
            </h3>
            <p className={`${bodyText} max-w-lg`}>{competitive.body}</p>
          </article>
        </div>
      </div>
    </section>
  );
}
