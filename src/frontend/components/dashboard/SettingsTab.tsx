"use client";

import React from "react";

interface ProfileData {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  tier: string;
  organization_id: string | null;
  organization_name: string | null;
  businesses: Array<{
    id: string;
    name: string;
    domain: string;
    industry: string;
    primary_city: string;
    primary_state: string;
    country: string;
    service_focuses: string[];
    target_suburbs: string[];
    formatted_address: string | null;
  }>;
}

interface SettingsTabProps {
  profile: ProfileData | null;
  upgradingTier: string | null;
  handleUpgradeTier: (tier: string) => Promise<void>;
}

export default function SettingsTab({
  profile,
  upgradingTier,
  handleUpgradeTier,
}: SettingsTabProps) {
  if (!profile) return null;

  const activeBusiness = profile.businesses?.[0];

  const getTierDisplay = (tier: string) => {
    switch (tier?.toLowerCase()) {
      case "enterprise":
        return "ULTRA PREMIUM";
      case "premium":
        return "PREMIUM";
      default:
        return "FREE";
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Tab Header */}
      <div className="border-b border-foreground/10 pb-6">
        <span className="font-mono text-xs text-[#0055FF] mb-2 uppercase tracking-[0.2em] block">
          ◆ SYSTEM PARAMETERS & BILLING
        </span>
        <h2 className="font-display text-[2.2rem] md:text-[2.6rem] font-bold tracking-tight uppercase leading-none text-black">
          System Settings
        </h2>
      </div>

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Storefront Parameters Card */}
        {activeBusiness && (
          <div className="lg:col-span-6 border border-foreground/10 p-6 md:p-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] space-y-6">
            <div>
              <h3 className="font-mono text-[10px] text-[#0055FF] uppercase font-black tracking-widest mb-2">
                ◆ STOREFRONT CONFIGURATION
              </h3>
              <h4 className="font-display text-lg font-black uppercase text-black leading-none">
                Location Metadata
              </h4>
            </div>

            <table className="w-full font-sans text-xs">
              <tbody>
                <tr className="border-b border-black/5">
                  <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase w-1/3 font-bold">Storefront Name</td>
                  <td className="py-3.5 text-black font-bold uppercase">{activeBusiness.name}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Target Industry</td>
                  <td className="py-3.5 text-black font-bold uppercase">{activeBusiness.industry}</td>
                </tr>
                <tr className="border-b border-black/5">
                  <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Geographic Suburbs</td>
                  <td className="py-3.5 text-black font-bold">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeBusiness.target_suburbs && activeBusiness.target_suburbs.length > 0 ? (
                        activeBusiness.target_suburbs.map((sub) => (
                          <span key={sub} className="bg-[#FAF9F6] border border-foreground/10 px-2 py-0.5 font-mono text-[9px] uppercase font-bold text-black">
                            {sub}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-muted italic">None specified</span>
                      )}
                    </div>
                  </td>
                </tr>
                <tr>
                  <td className="font-mono text-[9px] text-text-muted py-3.5 uppercase font-bold">Service Offerings</td>
                  <td className="py-3.5 text-black font-bold">
                    <div className="flex flex-wrap gap-1 mt-1">
                      {activeBusiness.service_focuses && activeBusiness.service_focuses.length > 0 ? (
                        activeBusiness.service_focuses.map((svc) => (
                          <span key={svc} className="bg-[#FAF9F6] border border-foreground/10 px-2 py-0.5 font-mono text-[9px] uppercase font-bold text-black">
                            {svc}
                          </span>
                        ))
                      ) : (
                        <span className="text-text-muted italic">None specified</span>
                      )}
                    </div>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        )}

        {/* Current Active Plan summary panel */}
        <div className={`lg:col-span-6 border p-6 md:p-8 flex flex-col justify-between shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] ${
          profile.tier === "premium" 
            ? "border-primary/20 bg-primary/[0.02]" 
            : profile.tier === "enterprise" 
            ? "border-emerald-500/20 bg-emerald-500/[0.02]" 
            : "border-foreground/10 bg-white"
        }`}>
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-mono text-[10px] text-black uppercase font-black tracking-widest">
                ◆ Active Subscription
              </h3>
              <span className={`font-mono text-[9px] px-2.5 py-0.5 uppercase font-bold border rounded-none ${
                profile.tier === "premium"
                  ? "bg-primary/10 text-primary border-primary/20"
                  : profile.tier === "enterprise"
                  ? "bg-emerald-600/10 text-emerald-600 border-emerald-600/20"
                  : "bg-zinc-100 text-text-muted border-zinc-200"
              }`}>
                {getTierDisplay(profile.tier)}
              </span>
            </div>

            <div className="p-5 border border-foreground/5 bg-[#FAF9F6] space-y-3">
              {profile.tier === "free" ? (
                <>
                  <span className="font-mono text-[9px] text-rose-600 uppercase tracking-wider block font-black">
                    Exposure Scan Limit Enabled
                  </span>
                  <p className="font-sans text-xs text-text-muted leading-relaxed font-bold">
                    You are on the Free Tier. Quick scans are capped to prevent API abuse. Upgrade to Premium or Ultra Premium to claim your local search citations and monitor dynamic AI changes.
                  </p>
                </>
              ) : profile.tier === "premium" ? (
                <>
                  <span className="font-mono text-[9px] text-[#0055FF] uppercase tracking-wider block font-black animate-pulse">
                    ◆ PREMIUM ACTIVE DEFENSE ◆
                  </span>
                  <p className="font-sans text-xs text-text-muted leading-relaxed font-bold">
                    Premium diagnosis running. Weekly automated audits, step-by-step repair plans, and comprehensive benchmarks are unlocked for your profile.
                  </p>
                </>
              ) : (
                <>
                  <span className="font-mono text-[9px] text-emerald-600 uppercase tracking-wider block font-black animate-pulse">
                    ◆ ULTRA PREMIUM DEFENSE ACTIVE ◆
                  </span>
                  <p className="font-sans text-xs text-text-muted leading-relaxed font-bold">
                    Maximum defensive coverage secured. Handled via our AI specialists team. Done-For-You optimization, content roadmaps, and ongoing remediations are active.
                  </p>
                </>
              )}
            </div>
          </div>

          <div className="border-t border-foreground/10 pt-4 mt-6 font-mono text-[9px] text-text-muted uppercase">
            SECURE_TICKET: {profile.id.slice(10, 24).toUpperCase() || "UNASSIGNED"}
          </div>
        </div>
      </div>

      {/* Subscription simulated billing centers */}
      <div className="space-y-6 pt-4">
        <div>
          <span className="font-mono text-[9px] text-[#0055FF] block uppercase tracking-widest mb-1 font-bold">
            ◆ SUBSCRIPTION BILLING HUB
          </span>
          <h3 className="font-display text-2xl font-black uppercase text-black leading-none">
            Upgrade Your Defense Moat
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          
          {/* Plan Card: Free */}
          <div className="border border-foreground/10 bg-white p-6 flex flex-col justify-between relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)]">
            <div className="space-y-4">
              <div>
                <h4 className="font-display text-xl font-black uppercase tracking-tight text-black">FREE</h4>
                <div className="flex items-baseline gap-1 py-1">
                  <span className="font-mono text-3xl font-extrabold text-black">$0</span>
                  <span className="font-mono text-[10px] text-text-muted uppercase font-bold">/ forever</span>
                </div>
                <p className="font-sans text-[11px] text-text-muted mt-2 leading-relaxed">
                  For business owners who want to know where they stand.
                </p>
              </div>

              <ul className="space-y-2 font-mono text-[9px] text-black/80 font-bold border-t border-foreground/5 pt-4">
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> 25-Point Visibility Check
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> AI Visibility Score (0–100)
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Top 3 Missing Gaps
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Weekly Audit Email
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Competitor Table
                </li>
              </ul>
            </div>

            <div className="pt-6">
              <button
                disabled
                className="w-full font-mono text-[10px] bg-zinc-100 text-zinc-400 py-3 font-black uppercase tracking-widest border border-zinc-200 cursor-not-allowed text-center rounded-none"
              >
                {profile.tier === "free" ? "ACTIVE FREE TIER" : "START FREE"}
              </button>
            </div>
          </div>

          {/* Plan Card: Premium */}
          <div className={`border p-6 flex flex-col justify-between relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] ${
            profile.tier === "premium" ? "border-[#0055FF] bg-primary/[0.01]" : "border-foreground/10 bg-white"
          }`}>
            {profile.tier === "premium" && (
              <div className="absolute -top-3 left-4 font-mono text-[8px] bg-[#0055FF] text-white px-2 py-0.5 uppercase font-bold tracking-wider">
                CURRENT ACTIVE PLAN
              </div>
            )}
            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-start">
                  <h4 className="font-display text-xl font-black uppercase tracking-tight text-black">PREMIUM</h4>
                  <span className="font-mono text-[8px] bg-primary/10 text-primary border border-primary/20 px-1.5 py-0.5 uppercase font-bold">
                    MOST POPULAR
                  </span>
                </div>
                <div className="flex items-baseline gap-1 py-1">
                  <span className="font-mono text-3xl font-extrabold text-[#0055FF]">$49</span>
                  <span className="font-mono text-[10px] text-text-muted uppercase font-bold">/ month</span>
                </div>
                <p className="font-sans text-[11px] text-text-muted mt-2 leading-relaxed">
                  For owners who want the full diagnostic, not just the symptom.
                </p>
              </div>

              <ul className="space-y-2 font-mono text-[9px] text-black/80 font-bold border-t border-foreground/5 pt-4">
                <li className="font-black text-primary text-[8px] uppercase tracking-wider block mb-1">
                  Everything in Free, plus:
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Step-by-Step AI Repair Plan
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Top 3 Competitor Benchmarks
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Local Suburb Coverage Map
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Priority Verified Audit Badge
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Unlimited On-Demand Audits
                </li>
              </ul>
            </div>

            <div className="pt-6">
              {profile.tier === "premium" ? (
                <button
                  disabled
                  className="w-full font-mono text-[10px] bg-emerald-600 text-white py-3 font-black uppercase tracking-widest border border-emerald-700 cursor-not-allowed text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                >
                  ✓ ACTIVE PREMIUM
                </button>
              ) : (
                <button
                  onClick={() => handleUpgradeTier("premium")}
                  disabled={upgradingTier != null}
                  className="w-full font-mono text-[10px] bg-[#0055FF] text-white py-3 hover:bg-[#0044DD] transition-all font-black uppercase tracking-widest border border-black/10 cursor-pointer text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                >
                  {upgradingTier === "premium" ? "TALKING TO SALES..." : "TALK TO SALES"}
                </button>
              )}
            </div>
          </div>

          {/* Plan Card: Ultra Premium */}
          <div className={`border p-6 flex flex-col justify-between relative shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] ${
            profile.tier === "enterprise" ? "border-emerald-600 bg-emerald-600/[0.01]" : "border-foreground/10 bg-white"
          }`}>
            {profile.tier === "enterprise" && (
              <div className="absolute -top-3 left-4 font-mono text-[8px] bg-emerald-600 text-white px-2 py-0.5 uppercase font-bold tracking-wider">
                CURRENT ACTIVE PLAN
              </div>
            )}
            <div className="space-y-4">
              <div>
                <h4 className="font-display text-xl font-black uppercase tracking-tight text-black">ULTRA PREMIUM</h4>
                <div className="flex items-baseline gap-1 py-1">
                  <span className="font-mono text-3xl font-extrabold text-emerald-600">$150</span>
                  <span className="font-mono text-[10px] text-text-muted uppercase font-bold">/ month</span>
                </div>
                <p className="font-sans text-[11px] text-text-muted mt-2 leading-relaxed">
                  For owners who want the problem fixed, not just measured.
                </p>
              </div>

              <ul className="space-y-2 font-mono text-[9px] text-black/80 font-bold border-t border-foreground/5 pt-4">
                <li className="font-black text-emerald-600 text-[8px] uppercase tracking-wider block mb-1">
                  Everything in Premium, plus:
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Done-For-You AI Optimization
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Continuous Citation Bug Fixes
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> AI-Ready Storefront Page
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Personalized Search Growth Plan
                </li>
                <li className="flex items-center gap-1.5">
                  <span className="text-emerald-600">✔</span> Direct line to our AI Specialist
                </li>
              </ul>
            </div>

            <div className="pt-6">
              {profile.tier === "enterprise" ? (
                <button
                  disabled
                  className="w-full font-mono text-[10px] bg-emerald-600 text-white py-3 font-black uppercase tracking-widest border border-emerald-700 cursor-not-allowed text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                >
                  ✓ ACTIVE ULTRA PREMIUM
                </button>
              ) : (
                <button
                  onClick={() => handleUpgradeTier("enterprise")}
                  disabled={upgradingTier != null}
                  className="w-full font-mono text-[10px] bg-black text-white py-3 hover:bg-zinc-800 transition-all font-black uppercase tracking-widest border border-black/10 cursor-pointer text-center rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.1)]"
                >
                  {upgradingTier === "enterprise" ? "TALKING TO SALES..." : "TALK TO SALES"}
                </button>
              )}
            </div>
          </div>

        </div>
      </div>

    </div>
  );
}
