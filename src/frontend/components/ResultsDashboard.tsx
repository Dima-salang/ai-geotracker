"use client";

import { useEffect, useState } from "react";

export interface ProviderResult {
  provider: string;
  status: string; // 'green' | 'yellow' | 'red'
  score: number;
  rank_position?: number | null;
  mentioned: boolean;
  actionable: boolean;
  domain_match: boolean;
  reason?: string | null;
  error?: string | null;
  prompt_results?: Array<{
    prompt: string;
    prompt_index: number;
    mentioned: boolean;
    rank_position?: number | null;
    status: string;
    score: number;
    domain_match?: boolean;
    actionable?: boolean;
    reason?: string | null;
  }>;
}

export interface ScanRecommendation {
  severity: string; // 'high' | 'medium' | 'low'
  issue: string;
  recommendation: string;
}

export interface ResearchedDetails {
  business_name: string;
  domain: string;
  industry: string;
  primary_city: string;
  primary_state: string;
  country: string;
  service_focuses: string[];
  is_virtual?: boolean;
}

interface ResultsDashboardProps {
  overallScore: number;
  summary: {
    green: number;
    yellow: number;
    red: number;
  };
  recommendations: ScanRecommendation[];
  details: ResearchedDetails;
  providerResults: ProviderResult[];
  scanId?: string;
  isScanning?: boolean;
}

export default function ResultsDashboard({
  overallScore,
  summary,
  recommendations,
  details,
  providerResults,
  scanId,
  isScanning = false,
}: ResultsDashboardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const uniquePrompts = Array.from(
    new Set(
      providerResults.flatMap((pr) =>
        (pr.prompt_results || []).map((p) => p.prompt)
      )
    )
  ).filter(Boolean);

  const getCellDetails = (providerName: string, promptText: string) => {
    const pr = providerResults.find((p) => p.provider === providerName);
    if (!pr || pr.status === "loading") {
      return {
        bg: "bg-primary/[0.03] text-primary/80 border-primary/20 animate-pulse font-mono",
        label: "◆ Scanning",
        color: "text-primary",
        tooltip: "Query dispatch in progress across global context...",
      };
    }
    
    if (pr.error) {
      return {
        bg: "bg-rose-50/50 text-rose-800 border-rose-200/60 font-medium",
        label: "✗ Error",
        color: "text-rose-600",
        tooltip: pr.error,
      };
    }

    const pResult = (pr.prompt_results || []).find((p) => p.prompt === promptText);
    if (!pResult) {
      return {
        bg: "bg-primary/[0.03] text-primary/80 border-primary/20 animate-pulse font-mono",
        label: "◆ Dispatching",
        color: "text-primary",
        tooltip: "Analyzing provider output in real-time...",
      };
    }

    if (pResult.mentioned) {
      const rank = pResult.rank_position;
      if (rank != null && rank <= 3) {
        return {
          bg: "bg-emerald-50 text-emerald-800 border-emerald-200 font-bold",
          label: `✓ Top 3 (Rank #${rank})`,
          color: "text-emerald-600",
          tooltip: `Business cited at premium position #${rank} for this search query.`,
        };
      } else {
        return {
          bg: "bg-amber-50 text-amber-800 border-amber-200 font-bold",
          label: rank != null ? `⚠ Rank #${rank}` : "⚠ Mentioned",
          color: "text-amber-600",
          tooltip: rank != null 
            ? `Business cited but ranked outside top 3 (position #${rank}).`
            : "Business was cited in the simulated search results, but no distinct rank index was parsed.",
        };
      }
    } else {
      return {
        bg: "bg-rose-50 text-rose-800 border-rose-200",
        label: "✗ No Mention",
        color: "text-rose-600",
        tooltip: "No citation or visibility index detected for this prompt query.",
      };
    }
  };

  const formattedDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full max-w-7xl mx-auto border border-foreground/10 bg-background text-foreground transition-all duration-500 animate-in fade-in slide-in-from-bottom-8">
      {/* ── HEADER PANEL ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-foreground/10">
        <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-foreground/10 bg-surface-container-low">
          <div>
            <div className="flex items-center gap-3 mb-4">
              {isScanning ? (
                <span className="font-mono text-[10px] bg-primary text-white px-2.5 py-0.5 tracking-tight uppercase font-bold animate-pulse">
                  ◆ Streaming Results
                </span>
              ) : (
                <span className="font-mono text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 tracking-tight uppercase font-bold">
                  Audit Complete
                </span>
              )}
            </div>
            <h2 className="font-display text-[2rem] md:text-[2.2rem] font-bold tracking-tight uppercase mb-3">
              AI Search Visibility Report
            </h2>
            <p className="font-mono text-xs text-text-muted uppercase">
              Target Domain: <span className="text-foreground font-bold">{details.domain}</span>
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-foreground/5 pt-6">
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase tracking-wider mb-1">Audit Date</span>
              <span className="font-sans text-xs font-bold text-foreground">{formattedDate}</span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase tracking-wider mb-1">Location Context</span>
              <span className="font-sans text-xs font-bold text-foreground">
                {details.is_virtual ? "Global Search Space" : `${details.primary_city || "N/A"}${details.primary_state ? `, ${details.primary_state}` : ""}`}
              </span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase tracking-wider mb-1">Virtual Footprint</span>
              <span className="font-sans text-xs font-bold text-foreground">
                {details.is_virtual ? "Yes (Geolocation Independent)" : "No (Physical Proximity)"}
              </span>
            </div>
          </div>
        </div>

        {/* OVERALL SCORE BADGE */}
        <div className="md:col-span-4 p-6 md:p-8 flex flex-col items-center justify-center text-center bg-background">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
            Overall Visibility Rating
          </span>
          <div className={`relative flex items-center justify-center w-36 h-36 border bg-surface-container-low mb-4 transition-all duration-300 ${
            isScanning ? "border-primary animate-pulse" : "border-foreground/10"
          }`}>
            {/* Outer technical brackets */}
            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-foreground/30"></div>
            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-foreground/30"></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-foreground/30"></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-foreground/30"></div>

            <div className="text-center">
              <span className="font-display text-5xl font-extrabold tracking-tighter">
                {overallScore}
              </span>
              <span className="font-mono text-[10px] text-text-muted block mt-0.5">
                out of 100
              </span>
            </div>
          </div>
          <span className="font-sans text-xs uppercase tracking-tight font-bold">
            {isScanning ? (
              <span className="text-primary animate-pulse">Consensus Computing...</span>
            ) : overallScore >= 80 ? (
              <span className="text-emerald-600">Premium AI Reputation</span>
            ) : overallScore >= 50 ? (
              <span className="text-amber-600">Moderate Exposure Deficit</span>
            ) : (
              <span className="text-rose-600">Critical AI Discovery Deficit</span>
            )}
          </span>
        </div>
      </div>

      {/* ── RESEARCHED PROFILE (BENTO 2) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-foreground/10">
        <div className="md:col-span-6 p-6 md:p-8 border-b md:border-b-0 md:border-r border-foreground/10">
          <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
            Business Profile
          </h3>
          <table className="w-full font-sans text-xs">
            <tbody>
              <tr className="border-b border-foreground/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase w-1/3">Business Name</td>
                <td className="font-bold py-2.5 text-foreground">{details.business_name || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">Industry</td>
                <td className="py-2.5 text-foreground uppercase tracking-tight">{details.industry || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">Location</td>
                <td className="py-2.5 text-foreground">
                  {details.is_virtual ? (
                    <span className="font-mono text-[10px] text-primary font-bold">Global Online Business</span>
                  ) : (
                    `${details.primary_city || "N/A"}${details.primary_state ? `, ${details.primary_state}` : ""}${details.country ? `, ${details.country}` : ""}`
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">Storefront Type</td>
                <td className="py-2.5 font-bold">
                  {details.is_virtual ? (
                    <span className="text-primary uppercase text-[10px]">Yes (Global Footprint)</span>
                  ) : (
                    <span className="text-text-muted uppercase text-[10px]">No (Physical Storefront / Service Proximity)</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="md:col-span-6 p-6 md:p-8 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
              Identified Service Offerings
            </h3>
            <div className="flex flex-wrap gap-2">
              {details.service_focuses && details.service_focuses.length > 0 ? (
                details.service_focuses.map((svc) => (
                  <span
                    key={svc}
                    className="font-mono text-[10px] bg-background text-foreground border border-foreground/10 px-2.5 py-1 uppercase animate-in fade-in duration-300"
                  >
                    {svc}
                  </span>
                ))
              ) : isScanning ? (
                <span className="font-mono text-[10px] text-primary animate-pulse">
                  Extracting footprints from metadata...
                </span>
              ) : (
                <span className="font-mono text-[10px] text-text-muted italic">No service offerings identified</span>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-foreground/5 flex justify-between items-center">
            <span className="font-mono text-[10px] text-text-muted">Shareable Report Link</span>
            <button
              onClick={handleShare}
              className="font-mono text-[10px] text-white bg-primary px-3 py-1.5 hover:bg-primary-container transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? "COPIED!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>

      {/* ── AI ENGINE MATRIX (BENTO 3) ── */}
      <div className="p-6 md:p-8 border-b border-foreground/10">
        <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-6">
          AI Search Citation Performance
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-foreground/10 font-mono text-[10px] text-text-muted">
                <th className="pb-3 font-medium uppercase w-[35%] text-left">Search Query Statement</th>
                {providerResults.map((pr) => (
                  <th key={pr.provider} className="pb-3 font-medium uppercase text-center font-mono w-[15%]">
                    {pr.provider}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniquePrompts.length === 0 ? (
                <tr>
                  <td colSpan={providerResults.length + 1} className="py-8 text-center text-text-muted font-mono text-xs italic">
                    Awaiting citation results to build scorecard matrix...
                  </td>
                </tr>
              ) : (
                uniquePrompts.map((promptText, pIdx) => (
                  <tr key={pIdx} className="border-b border-foreground/5 hover:bg-surface-container-low transition-colors duration-150">
                    <td className="py-4 text-left font-mono text-[11px] text-foreground font-bold pr-4 max-w-[320px] truncate" title={promptText}>
                      {promptText}
                    </td>
                    {providerResults.map((pr) => {
                      const cell = getCellDetails(pr.provider, promptText);
                      return (
                        <td key={pr.provider} className="py-4 text-center">
                          <span 
                            className={`inline-flex items-center justify-center font-mono text-[10px] px-2.5 py-1 border cursor-help ${cell.bg}`}
                            title={cell.tooltip}
                          >
                            {cell.label}
                          </span>
                        </td>
                      );
                    })}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ACTIONABLE RECOMMENDATIONS (BENTO 4) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 bg-surface-container-low">
        <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-foreground/10">
          <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-6">
            AEO Optimization Strategy
          </h3>
          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="border border-foreground/5 bg-background p-4 flex gap-4 animate-in fade-in duration-500">
                  <div className="flex-shrink-0">
                    <span className={`font-mono text-[9px] font-bold px-2 py-0.5 text-white ${
                       rec.severity === "high" ? "bg-rose-600" : rec.severity === "medium" ? "bg-amber-500" : "bg-slate-500"
                    }`}>
                      {rec.severity.toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h4 className="font-bold text-xs mb-1 text-foreground">{rec.issue}</h4>
                    <p className="font-sans text-xs text-text-muted leading-relaxed">{rec.recommendation}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : isScanning ? (
            <div className="border border-primary/20 bg-primary/[0.02] p-6 text-center animate-pulse">
              <span className="font-mono text-[11px] text-primary block font-bold mb-1">
                Compiling Strategy Blueprint...
              </span>
              <span className="font-sans text-xs text-text-muted">
                Awaiting model citation matrix resolutions to isolate performance deficits.
              </span>
            </div>
          ) : (
            <div className="border border-foreground/5 bg-background p-6 text-center">
              <span className="font-mono text-[11px] text-emerald-600 block font-bold mb-1">
                Zero Critical Discrepancies Detected
              </span>
              <span className="font-sans text-xs text-text-muted">
                Your visibility indexes perfectly across all active provider configurations.
              </span>
            </div>
          )}
        </div>

        <div className="p-6 md:p-8 flex flex-col justify-between">
          <div>
            <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
              Visibility Performance Summary
            </h3>
            <p className="font-sans text-xs text-text-muted leading-relaxed mb-6">
              AI search engines construct recommendations using semantic embeddings and indexing weights. To secure premium placement, ensure your domain exposes explicit service schemas, structured service scopes, and hyper-coherent industry descriptions matching modern transformer validation structures.
            </p>
            <div className="p-4 border border-primary/20 bg-primary/5 flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                <span className="font-mono text-[10px] text-primary font-bold uppercase block mb-0.5">Geographic Indexing</span>
                <span className="font-sans text-[11px] text-text-muted leading-relaxed">
                  This domain operates as a virtual headquarters. Search engines evaluate its visibility using global service queries, bypassing traditional local geocoding filters.
                </span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-foreground/5 flex justify-between items-center font-mono text-[9px] text-text-muted">
            <span>Powered by GeoTracker AEO Core</span>
          </div>
        </div>
      </div>
    </div>
  );
}
