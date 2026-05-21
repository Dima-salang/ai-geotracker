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
}

export default function ResultsDashboard({
  overallScore,
  summary,
  recommendations,
  details,
  providerResults,
  scanId,
}: ResultsDashboardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    if (typeof window !== "undefined") {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formattedDate = new Date().toISOString().slice(0, 19).replace("T", " ");

  return (
    <div className="w-full max-w-7xl mx-auto border border-foreground/10 bg-background text-foreground transition-all duration-500 animate-in fade-in slide-in-from-bottom-8">
      {/* ── HEADER PANEL ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-foreground/10">
        <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-foreground/10 bg-surface-container-low">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <span className="font-mono text-[10px] bg-primary text-white px-2 py-0.5 tracking-tighter uppercase font-bold">
                AUDIT_COMPLETED
              </span>
              <span className="font-mono text-[10px] text-text-muted">
                SCAN_ID: {scanId || "N/A"}
              </span>
            </div>
            <h2 className="font-display text-[2rem] font-bold tracking-tight uppercase mb-2">
              Visibility Schema Report
            </h2>
            <p className="font-mono text-xs text-text-muted uppercase">
              TARGET_HOST: <span className="text-foreground font-bold">{details.domain}</span>
            </p>
          </div>

          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 border-t border-foreground/5 pt-6">
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase">TIMESTAMP</span>
              <span className="font-mono text-[10px] font-bold">{formattedDate} UTC</span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase">NODE_STATUS</span>
              <span className="font-mono text-[10px] text-emerald-600 font-bold">● ACTIVE_SYNC</span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase">VIRTUAL_STATUS</span>
              <span className="font-mono text-[10px] font-bold">
                {details.is_virtual ? (
                  <span className="text-primary font-bold">✓ VIRTUAL_HQ</span>
                ) : (
                  <span className="text-text-muted">✗ PHYSICAL_ONLY</span>
                )}
              </span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase">INTELLIGENCE</span>
              <span className="font-mono text-[10px] font-bold">DECISION_NODE</span>
            </div>
          </div>
        </div>

        {/* OVERALL SCORE BADGE */}
        <div className="md:col-span-4 p-6 md:p-8 flex flex-col items-center justify-center text-center bg-background">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-2">
            OVERALL_VISIBILITY_RATING
          </span>
          <div className="relative flex items-center justify-center w-36 h-36 border border-foreground/10 bg-surface-container-low mb-4">
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
                MAX_100
              </span>
            </div>
          </div>
          <span className="font-mono text-[11px] uppercase tracking-tighter font-bold">
            {overallScore >= 80 ? (
              <span className="text-emerald-600">PREMIUM AI REPUTATION</span>
            ) : overallScore >= 50 ? (
              <span className="text-amber-600">MODERATE EXPOSURE DEFICIT</span>
            ) : (
              <span className="text-rose-600">CRITICAL AI DISCOVERY AUDIT</span>
            )}
          </span>
        </div>
      </div>

      {/* ── RESEARCHED PROFILE (BENTO 2) ── */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-foreground/10">
        <div className="md:col-span-6 p-6 md:p-8 border-b md:border-b-0 md:border-r border-foreground/10">
          <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
            [RESEARCHED_META_IDENTITY]
          </h3>
          <table className="w-full font-sans text-xs">
            <tbody>
              <tr className="border-b border-foreground/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase w-1/3">RESEARCHED NAME</td>
                <td className="font-bold py-2.5 text-foreground">{details.business_name || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">INDUSTRY CATEGORY</td>
                <td className="py-2.5 text-foreground uppercase tracking-tight">{details.industry || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-foreground/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">GEOGRAPHIC ORIGIN</td>
                <td className="py-2.5 text-foreground">
                  {details.is_virtual ? (
                    <span className="font-mono text-[10px] text-primary font-bold">GLOBAL_ONLINE_BUSINESS</span>
                  ) : (
                    `${details.primary_city || "N/A"}${details.primary_state ? `, ${details.primary_state}` : ""}${details.country ? `, ${details.country}` : ""}`
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">VIRTUAL OPERATION</td>
                <td className="py-2.5 font-bold">
                  {details.is_virtual ? (
                    <span className="text-primary uppercase text-[10px]">TRUE (GEOLOCATION_INDEPENDENT)</span>
                  ) : (
                    <span className="text-text-muted uppercase text-[10px]">FALSE (LOCAL_STOREFRONT / SERVICE_RADIUS)</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="md:col-span-6 p-6 md:p-8 bg-surface-container-low flex flex-col justify-between">
          <div>
            <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
              [EXTRACTED_SERVICE_FOCUSES]
            </h3>
            <div className="flex flex-wrap gap-2">
              {details.service_focuses && details.service_focuses.length > 0 ? (
                details.service_focuses.map((svc) => (
                  <span
                    key={svc}
                    className="font-mono text-[10px] bg-background text-foreground border border-foreground/10 px-2.5 py-1 uppercase"
                  >
                    {svc}
                  </span>
                ))
              ) : (
                <span className="font-mono text-[10px] text-text-muted italic">NO_EXPLICIT_SERVICE_EXTRACTS</span>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-foreground/5 flex justify-between items-center">
            <span className="font-mono text-[10px] text-text-muted">SHAREABLE_REPORT_LINK</span>
            <button
              onClick={handleShare}
              className="font-mono text-[10px] text-white bg-primary px-3 py-1.5 hover:bg-primary-container transition-all flex items-center gap-1.5"
            >
              {copied ? "COPIED!" : "COPY LINK"}
            </button>
          </div>
        </div>
      </div>

      {/* ── AI ENGINE MATRIX (BENTO 3) ── */}
      <div className="p-6 md:p-8 border-b border-foreground/10">
        <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-6">
          [AI_SEARCH_ENGINE_COVERAGE_MATRIX]
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs min-w-[700px]">
            <thead>
              <tr className="border-b border-foreground/10 font-mono text-[10px] text-text-muted">
                <th className="pb-3 font-medium uppercase w-1/5">AI ENGINE NODE</th>
                <th className="pb-3 font-medium uppercase">MENTIONED</th>
                <th className="pb-3 font-medium uppercase">DOMAIN MATCH</th>
                <th className="pb-3 font-medium uppercase">RANK POS</th>
                <th className="pb-3 font-medium uppercase">VISIBILITY SCORE</th>
                <th className="pb-3 font-medium uppercase w-[30%]">RESOLUTION PATH / REASONING</th>
              </tr>
            </thead>
            <tbody>
              {providerResults.map((pr) => (
                <tr key={pr.provider} className="border-b border-foreground/5 hover:bg-surface-container-low transition-colors duration-150">
                  <td className="py-4 font-mono font-bold uppercase text-foreground flex items-center gap-2">
                    <span className={`w-2 h-2 ${
                      pr.status === "green" ? "bg-emerald-600" : pr.status === "yellow" ? "bg-amber-500" : "bg-rose-600"
                    }`}></span>
                    {pr.provider}
                  </td>
                  <td className="py-4">
                    <span className={`font-mono text-[10px] font-bold px-2 py-0.5 ${
                      pr.mentioned ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                    }`}>
                      {pr.mentioned ? "YES" : "NO"}
                    </span>
                  </td>
                  <td className="py-4">
                    <span className={`font-mono text-[10px] ${pr.domain_match ? "text-primary font-bold" : "text-text-muted"}`}>
                      {pr.domain_match ? "MATCHED" : "NOMATCH"}
                    </span>
                  </td>
                  <td className="py-4 font-mono font-bold text-foreground">
                    {pr.rank_position ? `#${pr.rank_position}` : "—"}
                  </td>
                  <td className="py-4 font-mono font-bold text-foreground">
                    {pr.score}/100
                  </td>
                  <td className="py-4 text-text-muted leading-relaxed font-sans pr-4">
                    {pr.error ? (
                      <span className="text-rose-600 font-mono text-[10px] break-all">{pr.error}</span>
                    ) : (
                      pr.reason || "Processed successfully without explicit mention tags."
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── ACTIONABLE RECOMMENDATIONS (BENTO 4) ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 bg-surface-container-low">
        <div className="p-6 md:p-8 border-b md:border-b-0 md:border-r border-foreground/10">
          <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-6">
            [AUDIT_DIAGNOSES_&_RECOMMENDATIONS]
          </h3>
          {recommendations && recommendations.length > 0 ? (
            <div className="space-y-4">
              {recommendations.map((rec, idx) => (
                <div key={idx} className="border border-foreground/5 bg-background p-4 flex gap-4">
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
          ) : (
            <div className="border border-foreground/5 bg-background p-6 text-center">
              <span className="font-mono text-[11px] text-emerald-600 block font-bold mb-1">
                ✓ ZERO CRITICAL DISCREPANCIES DETECTED
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
              [AEO_IMPLEMENTATION_SUMMARY]
            </h3>
            <p className="font-sans text-xs text-text-muted leading-relaxed mb-6">
              AI Engines construct search recommendations using complex vector representations and domain-indexing weights. To secure premium placement, ensure your domain exposes explicit semantic schemas, structured service scopes, and hyper-coherent industry descriptions matching modern transformer validation structures.
            </p>
            <div className="p-4 border border-primary/20 bg-primary/5 flex items-start gap-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary flex-shrink-0 mt-0.5">
                <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
              </svg>
              <div>
                <span className="font-mono text-[10px] text-primary font-bold uppercase block mb-0.5">TECHNICAL NOTE</span>
                <span className="font-sans text-[11px] text-text-muted leading-relaxed">
                  Virtual business classification redirects coverage query heuristics to global-free prompts, bypassing regional geocoding matrices.
                </span>
              </div>
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-foreground/5 flex justify-between items-center font-mono text-[9px] text-text-muted">
            <span>ENGINE_VER: 8.1.0</span>
            <span>SYSTEM_STABLE: 100%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
