import Link from "next/link";
import { MARKETING_FAQS } from "@/lib/marketing/faqs";
import { FaqAccordion } from "@/components/marketing/FaqAccordion";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { btnPrimary, marketingContainer } from "@/lib/marketing/design-tokens";

const PREVIEW_COUNT = 4;

export function FaqTeaserSection() {
  return (
    <section id="faq-section" className="py-20 md:py-28 px-6 md:px-10 bg-[#FAF9F6] reveal-on-scroll">
      <div className={`${marketingContainer} max-w-3xl`}>
        <SectionHeader
          eyebrowText="Questions"
          title="Answers for business owners"
          align="center"
          className="mb-12 mx-auto text-center"
        />
        <FaqAccordion items={MARKETING_FAQS.slice(0, PREVIEW_COUNT)} />
        <div className="text-center mt-10 p-6 md:p-8 border-2 border-dashed border-primary/40 bg-primary/[0.04]">
          <p className="font-mono text-[10px] uppercase text-text-muted mb-4 tracking-wider">
            More questions about AI visibility?
          </p>
          <Link href="/faq" className={btnPrimary}>
            See all FAQs
          </Link>
        </div>
      </div>
    </section>
  );
}
