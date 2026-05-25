"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { supabase } from "../../utils/supabase";

export default function PricingPage() {
  const [userSession, setUserSession] = useState<any>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUserSession(session.user);
      }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUserSession(session.user);
      } else {
        setUserSession(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <div className="min-h-screen blueprint-bg text-black">
      
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border">
        <div className="flex items-center gap-8">
          <Link href="/" className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
            GeoTracker
          </Link>
          <div className="hidden md:flex gap-6">
            <Link href="/" className="font-mono text-xs tracking-tighter uppercase text-text-muted font-medium hover:text-primary transition-colors">
              AUDIT
            </Link>
            <a href="#" className="font-mono text-xs tracking-tighter uppercase text-text-muted font-medium hover:text-primary transition-colors">
              SERVICES
            </a>
            <Link href="/pricing" className="font-mono text-xs tracking-tighter uppercase text-primary font-bold border-b-2 border-primary pb-1">
              PRICING
            </Link>
            <a href="#" className="font-mono text-xs tracking-tighter uppercase text-text-muted font-medium hover:text-primary transition-colors">
              FAQS
            </a>
          </div>
        </div>
        
        {userSession ? (
          <Link
            href="/dashboard"
            className="font-mono text-xs tracking-tighter bg-primary text-white px-6 py-2 hover:bg-primary-hover transition-all uppercase font-bold"
          >
            [DASHBOARD]
          </Link>
        ) : (
          <Link
            href="/"
            className="font-mono text-xs tracking-tighter bg-primary text-white px-6 py-2 hover:bg-primary-hover transition-all uppercase font-bold"
          >
            SIGN_IN
          </Link>
        )}
      </nav>

      {/* Main Container */}
      <main className="pt-28 pb-20 px-6 md:px-10 max-w-7xl mx-auto space-y-16">
        
        {/* Header Block */}
        <div className="text-center max-w-3xl mx-auto space-y-4">
          <span className="font-mono text-xs text-primary uppercase font-bold tracking-[0.25em] block animate-pulse">
            ◆ AI RECOMMENDATION AUDITING PLANS ◆
          </span>
          <h1 className="font-display text-[2.5rem] md:text-[3.5rem] font-black uppercase tracking-tight leading-none text-black">
            Choose Your AI Discovery Moat
          </h1>
          <p className="font-sans text-xs md:text-sm text-text-muted font-bold max-w-2xl mx-auto">
            Quantify and repair how your business is cited in ChatGPT, Gemini, and Perplexity. Don't let competitors capture your search share.
          </p>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Free Card */}
          <div className="border border-foreground/10 bg-[#FAF9F6] p-8 flex flex-col justify-between relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:scale-[1.01] transition-all">
            <div className="space-y-6">
              <div>
                <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-1">
                  [01] DIAGNOSE
                </span>
                <h3 className="font-display text-2xl font-black uppercase text-black">Free</h3>
                <div className="flex items-baseline gap-1 py-2 border-y border-foreground/5 mt-3">
                  <span className="font-mono text-4xl font-extrabold text-black">$0</span>
                  <span className="font-mono text-xs text-text-muted uppercase font-bold">/ forever</span>
                </div>
                <p className="font-sans text-xs text-text-muted mt-3 leading-relaxed font-bold">
                  For business owners who want to know where they stand.
                </p>
              </div>

              <ul className="space-y-2.5 font-mono text-[10px] text-black/85 font-bold pt-2">
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Real-Time 25-Point Visibility Check
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> AI Visibility Score (0–100)
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Top 3 Missing Citation Gaps
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Weekly Visibility Audit Email
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Competitor Comparison Table
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <Link
                href={userSession ? "/dashboard" : "/"}
                className="w-full font-mono text-xs bg-black text-white hover:bg-[#0055FF] transition-all py-3.5 font-black uppercase tracking-widest border border-black/10 block text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
              >
                START FREE
              </Link>
            </div>
          </div>

          {/* Premium Card */}
          <div className="border border-foreground/10 bg-[#FAF9F6] p-8 flex flex-col justify-between relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:scale-[1.01] transition-all">
            <div className="absolute top-4 right-4 font-mono text-[8px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold">
              MOST POPULAR
            </div>
            <div className="space-y-6">
              <div>
                <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-1">
                  [02] REPAIR CITATIONS
                </span>
                <h3 className="font-display text-2xl font-black uppercase text-black">Premium</h3>
                <div className="flex items-baseline gap-1 py-2 border-y border-foreground/5 mt-3">
                  <span className="font-mono text-4xl font-extrabold text-[#0055FF]">$49</span>
                  <span className="font-mono text-xs text-text-muted uppercase font-bold">/ month</span>
                </div>
                <p className="font-sans text-xs text-text-muted mt-3 leading-relaxed font-bold">
                  For owners who want the full diagnostic, not just the symptom.
                </p>
              </div>

              <ul className="space-y-2.5 font-mono text-[10px] text-black/85 font-bold pt-2">
                <li className="text-[9px] text-primary uppercase tracking-wider font-black block">
                  Everything in Free, plus:
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Step-by-Step AI Repair Plan
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Direct Competitor Benchmarks
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Local Suburb Coverage Map
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Priority Verified Audit Badge
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Unlimited On-Demand Audits
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <a
                href="mailto:sales@iozera.ai?subject=Inquiry regarding Premium AI Auditing Moat"
                className="w-full font-mono text-xs bg-primary text-white hover:bg-primary-hover transition-all py-3.5 font-black uppercase tracking-widest border border-black/10 block text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
              >
                TALK TO SALES
              </a>
            </div>
          </div>

          {/* Ultra Premium Card */}
          <div className="border border-foreground/10 bg-[#FAF9F6] p-8 flex flex-col justify-between relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] hover:scale-[1.01] transition-all">
            <div className="space-y-6">
              <div>
                <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-1">
                  [03] FULL REMEDIATION
                </span>
                <h3 className="font-display text-2xl font-black uppercase text-black">Ultra Premium</h3>
                <div className="flex items-baseline gap-1 py-2 border-y border-foreground/5 mt-3">
                  <span className="font-mono text-4xl font-extrabold text-black">$150</span>
                  <span className="font-mono text-xs text-text-muted uppercase font-bold">/ month</span>
                </div>
                <p className="font-sans text-xs text-text-muted mt-3 leading-relaxed font-bold">
                  For owners who want the problem fixed, not just measured.
                </p>
              </div>

              <ul className="space-y-2.5 font-mono text-[10px] text-black/85 font-bold pt-2">
                <li className="text-[9px] text-zinc-600 uppercase tracking-wider font-black block">
                  Everything in Premium, plus:
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Done-For-You AI Optimization
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Continuous Citation Bug Fixes
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> AI-Ready Storefront Page
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Personalized Search Growth Plan
                </li>
                <li className="flex items-center gap-2">
                  <span className="text-emerald-600 text-xs">✔</span> Direct line to our AI Specialist
                </li>
              </ul>
            </div>

            <div className="pt-8">
              <a
                href="mailto:sales@iozera.ai?subject=Inquiry regarding Ultra Premium DFY Remediation Moat"
                className="w-full font-mono text-xs bg-black text-white hover:bg-zinc-800 transition-all py-3.5 font-black uppercase tracking-widest border border-black/10 block text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
              >
                TALK TO SALES
              </a>
            </div>
          </div>

        </div>

        {/* Secondary Comparison/Trust Block */}
        <div className="border border-foreground/10 bg-white p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] relative overflow-hidden select-none">
          <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-black/20"></div>
          <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-black/20"></div>
          <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-black/20"></div>
          <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-black/20"></div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center md:text-left">
            <div>
              <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-1">
                ◆ TRANSPARENT COMMERCE
              </span>
              <h4 className="font-display text-lg font-black uppercase text-black">Simulated Handshakes</h4>
              <p className="font-sans text-[11px] text-text-muted mt-2 leading-relaxed font-bold">
                Our workspace allows interactive, dynamic subscription updates to test simulated search console limitations completely inside your operator sandbox.
              </p>
            </div>
            <div>
              <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-1">
                ◆ MULTI-LLM CONSENSUS
              </span>
              <h4 className="font-display text-lg font-black uppercase text-black">Active Citations Map</h4>
              <p className="font-sans text-[11px] text-text-muted mt-2 leading-relaxed font-bold">
                Every plan compiles real-time crawlers across modern systems like ChatGPT-4, Claude-3, Gemini-Pro, and Perplexity to guarantee coverage insights.
              </p>
            </div>
            <div>
              <span className="font-mono text-[9px] text-[#0055FF] tracking-widest uppercase font-bold block mb-1">
                ◆ CONTINUOUS DEFENSE
              </span>
              <h4 className="font-display text-lg font-black uppercase text-black">Continuous Remediation</h4>
              <p className="font-sans text-[11px] text-text-muted mt-2 leading-relaxed font-bold">
                Don't wait for your citations to rot. Deploy ongoing schema and site crawls to maintain maximum local visibility indexes at all times.
              </p>
            </div>
          </div>
        </div>

      </main>

    </div>
  );
}
