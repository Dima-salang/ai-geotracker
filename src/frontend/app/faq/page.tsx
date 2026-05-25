"use client";

import Link from "next/link";
import { useState } from "react";
import DitheredParticles from "../../components/DitheredParticles";

export default function FAQPage() {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const FAQS = [
    {
      q: "What is AI Visibility (or AEO) and why does traditional SEO no longer work?",
      a: "AI Visibility (also called Answer Engine Optimization or AEO) is the process of styling your website so that popular AI tools like ChatGPT, Gemini, and Claude can read your store details and recommend you directly. Traditional SEO only gets you listed on standard Google pages, whereas AEO ensures that when a customer asks ChatGPT for a recommendation, the AI replies with your business name and details."
    },
    {
      q: "How does GeoTracker calculate my AI Visibility Score?",
      a: "We compute your score based on four simple checks: (1) Mention Rate: How often does AI pick your business out of local options?; (2) Sentiment: Does the AI speak positively about your services?; (3) Actionability: Does the AI provide links to book you, call you, or see your location?; (4) Domain Match: Does the AI cite your correct web link?"
    },
    {
      q: "How does the Location Search Grounder help my store get cited?",
      a: "Before querying the AI engines, our tool searches the web to extract your exact storefront details. We verify your physical location, suburbs you serve, and specific local catalog products. This guarantees we audit the exact scenarios that local customers search in your neighborhood."
    },
    {
      q: "Do I need special access keys to run these audits?",
      a: "No! All AI scanning runs automatically through our servers. Local business owners can scan their storefront instantly for free. Advanced franchise representatives can configure custom database key rotation in the Admin Dashboard to scan thousands of stores concurrently without limits."
    },
    {
      q: "How do AI Search engines gather information about my storefront?",
      a: "AI models crawl popular online directories, customer review platforms, public maps, and your own website copy. If your website is missing structured schemas (like address maps or specific local list tags), the AI engines cannot verify your details and will ignore your store in recommendations."
    },
    {
      q: "Is there an easy way to fix my visibility deficits?",
      a: "Yes! Every single scan on GeoTracker generates a clear, step-by-step Visibility Blueprint. This is a simple checklist showing you exactly what code schemas to add, what local directories to update, and what terms to add to your website to instantly start getting cited by AI."
    }
  ];

  return (
    <>
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
            GeoTracker
          </Link>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
            Documentation FAQ
          </span>
        </div>
        <Link
          href="/"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
        >
          [← BACK TO HOME]
        </Link>
      </nav>

      {/* Main Body */}
      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between relative overflow-hidden">
        <div className="absolute inset-0 pointer-events-none z-0">
          <DitheredParticles />
        </div>

        <div className="w-full max-w-4xl mx-auto px-6 md:px-10 py-20 flex-grow relative z-10">
          {/* Header Section */}
          <div className="mb-16 border-b border-foreground/10 pb-8 text-center max-w-2xl mx-auto">
            <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
              Frequently Asked Questions
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight uppercase leading-none mb-6">
              AI Visibility FAQs
            </h1>
            <p className="font-sans text-base text-text-muted leading-relaxed">
              Find clear, straightforward explanations about local visibility scans, Answer Engine Optimization (AEO), and how to get your store cited by ChatGPT and Gemini.
            </p>
          </div>

          {/* Accordion List */}
          <div className="border-4 border-foreground bg-background shadow-[8px_8px_0px_#1a1a1a] mb-16 rounded-none overflow-hidden">
            {FAQS.map((faq, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="border-b-2 border-foreground last:border-b-0">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : idx)}
                    className="w-full flex justify-between items-center p-6 text-left font-display text-base md:text-lg font-bold uppercase transition-all select-none hover:bg-primary/[0.01] cursor-pointer"
                  >
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-xs text-primary">0{idx + 1}.</span>
                      {faq.q}
                    </span>
                    <span className="font-mono text-sm font-black text-primary transition-transform duration-300">
                      {isOpen ? "[ ✗ ]" : "[ ＋ ]"}
                    </span>
                  </button>
                  <div className={`transition-all duration-300 ease-in-out overflow-hidden ${
                    isOpen ? "max-h-[300px] border-t-2 border-foreground p-6 bg-surface-container-low/40" : "max-h-0"
                  }`}>
                    <p className="font-sans text-xs text-text-muted leading-relaxed select-text">
                      {faq.a}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Quick CTA */}
          <div className="text-center bg-primary/5 border-2 border-dashed border-primary/45 p-8 shadow-[4px_4px_0px_rgba(0,85,255,0.05)] rounded-none">
            <h3 className="font-display text-xl font-bold uppercase mb-2">Still have questions?</h3>
            <p className="font-sans text-xs text-text-muted mb-4 max-w-md mx-auto">
              Ready to test where your storefront ranks in conversational search results today? Run a quick visibility check in seconds.
            </p>
            <Link
              href="/"
              className="inline-block font-mono text-xs px-8 py-3 bg-primary text-white hover:bg-primary-hover transition-all uppercase font-bold tracking-widest border border-primary shadow-[2px_2px_0px_rgba(0,0,0,0.15)]"
            >
              Start Free Audit
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-4 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center bg-surface-container-low border-t border-border h-16 gap-2 z-10">
          <div className="font-mono text-xs font-bold text-foreground">
            GeoTracker FAQ
          </div>
          <div className="font-mono text-[10px] uppercase text-text-muted">
            ©2026 GeoTracker Core | Houston, Texas
          </div>
        </footer>
      </main>
    </>
  );
}
