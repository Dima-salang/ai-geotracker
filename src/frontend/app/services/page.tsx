"use client";

import Link from "next/link";
import { useState } from "react";
import DitheredParticles from "../../components/DitheredParticles";

export default function ServicesPage() {
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);

  const SERVICES = [
    {
      idx: "01",
      title: "AI Visibility Check",
      subtitle: "See if AI recommends your store",
      description: "When potential customers ask AI engines (like ChatGPT or Google Gemini) for recommendations in your area, do you show up? We run instant scans to test if your business name is cited or completely invisible.",
      details: [
        "Checks ChatGPT, Gemini, Claude, and Perplexity Search simultaneously",
        "Calculates a straightforward 1-to-100 Visibility Score",
        "Lists which search phrases successfully cite your website"
      ],
      accent: "bg-[#00e5ff]"
    },
    {
      idx: "02",
      title: "Competitor Scouting",
      subtitle: "See why AI recommends your competitors",
      description: "If AI tools are directing local customers to your competitors instead of you, we find out exactly why. We analyze what keywords, neighborhood terms, and service catalogs they cite to give you complete competitive parity.",
      details: [
        "Tracks direct competitor recommendations across 20+ search prompts",
        "Identifies localized citation gaps in your target neighborhood",
        "Highlights missed local product categories"
      ],
      accent: "bg-[#ffaa00]"
    },
    {
      idx: "03",
      title: "AI Recommendation Blueprints",
      subtitle: "Simple guides to help you get recommended",
      description: "We translate complex machine-learning parameters into a straightforward, step-by-step optimization checklist. We give you plain instructions to update your website so AI platforms start recommending your store.",
      details: [
        "Simple website code changes and structured business data guides",
        "Actionable prompts to refine what AI tells customers about you",
        "Proven templates to boost your local Share of Voice (SOV)"
      ],
      accent: "bg-[#0055ff]"
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
            Our Services
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

        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-20 flex-grow relative z-10">
          {/* Header Section */}
          <div className="mb-16 border-b border-foreground/10 pb-8 max-w-3xl">
            <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
              Layman Business Solutions
            </span>
            <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight uppercase leading-none mb-6">
              Services We Provide
            </h1>
            <p className="font-sans text-base text-text-muted leading-relaxed">
              We help local business owners and franchise networks take control of how they are recommended on AI search engines. No complex jargon, just straightforward business visibility blueprints.
            </p>
          </div>

          {/* Services Cards */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-16">
            {SERVICES.map((serv, index) => {
              const isHovered = hoveredCard === index;
              return (
                <div
                  key={index}
                  onMouseEnter={() => setHoveredCard(index)}
                  onMouseLeave={() => setHoveredCard(null)}
                  className={`bg-background border-2 border-foreground p-8 flex flex-col justify-between transition-all duration-300 relative rounded-none ${
                    isHovered 
                      ? "shadow-[8px_8px_0px_#0055ff] -translate-y-1" 
                      : "shadow-[4px_4px_0px_#1a1a1a]"
                  }`}
                >
                  <div>
                    {/* Badge */}
                    <div className="flex justify-between items-center mb-6">
                      <span className="font-mono text-xs font-black bg-foreground text-background px-3 py-1">
                        STAGE_{serv.idx}
                      </span>
                      <span className={`w-3 h-3 ${serv.accent} border border-foreground`}></span>
                    </div>

                    <h2 className="font-display text-2xl font-black uppercase mb-2 tracking-tight">
                      {serv.title}
                    </h2>
                    <h3 className="font-sans text-xs text-primary font-bold uppercase tracking-wider mb-6">
                      {serv.subtitle}
                    </h3>
                    
                    <p className="font-sans text-xs text-text-muted leading-relaxed mb-6 border-b border-foreground/10 pb-6">
                      {serv.description}
                    </p>

                    {/* Features list */}
                    <ul className="space-y-3 font-mono text-[10px] text-foreground mb-8">
                      {serv.details.map((detail, idx) => (
                        <li key={idx} className="flex items-start gap-2">
                          <span className="text-primary font-black select-none">✓</span>
                          <span>{detail}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Link
                    href="/"
                    className="w-full text-center font-mono text-xs py-3 bg-foreground text-background border border-foreground hover:bg-primary hover:text-white transition-all uppercase font-bold tracking-widest"
                  >
                    Scout Storefront Now
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <footer className="w-full py-4 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center bg-surface-container-low border-t border-border h-16 gap-2 z-10">
          <div className="font-mono text-xs font-bold text-foreground">
            GeoTracker Services
          </div>
          <div className="font-mono text-[10px] uppercase text-text-muted">
            ©2026 GeoTracker Core | Houston, Texas
          </div>
        </footer>
      </main>
    </>
  );
}
