import Link from "next/link";
import { btnOnPrimary, headingH2, marketingContainer } from "@/lib/marketing/design-tokens";

export function CTABanner() {
  return (
    <section className="py-16 md:py-20 px-6 md:px-10 bg-primary text-white border-b border-border">
      <div className={`${marketingContainer} max-w-4xl text-center`}>
        <h2 className={`${headingH2} text-white`}>
          Your next customer might already be asking AI—make sure the answer is you.
        </h2>
        <Link href="#hero-section" className={`inline-block mt-8 ${btnOnPrimary}`}>
          Run my free check
        </Link>
      </div>
    </section>
  );
}
