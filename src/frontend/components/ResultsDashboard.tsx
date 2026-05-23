"use client";

import { useEffect, useState } from "react";
import React from "react";
import { marked } from "marked";

export interface ProviderResult {
  provider: string;
  display_name?: string;
  model?: string | null;
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
    competitors?: string[];
    raw_response?: string;
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
  latitude?: number | null;
  longitude?: number | null;
  google_maps_url?: string | null;
  formatted_address?: string | null;
}

export function renderMarkdown(text: string): { __html: string } {
  if (!text) return { __html: "" };
  return { __html: marked.parse(text) as string };
}

interface ResultsDashboardProps {
  overallScore: number;
  summary: {
    green: number;
    yellow: number;
    red: number;
    client_sov?: number;
    executive_summary?: string;
    competitors?: string[];
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
  
  // Model-specific cell selection to prevent multi-column gemini collision
  const [selectedCell, setSelectedCell] = useState<{ 
    provider: string; 
    model: string | null; 
    prompt: string; 
  } | null>(null);

  // Compute Share of Voice (SOV)
  const competitorMentionsMap: Record<string, number> = {};
  let clientMentionsCount = 0;

  providerResults.forEach((pr) => {
    (pr.prompt_results || []).forEach((pResult) => {
      if (pResult.mentioned) {
        clientMentionsCount++;
      }
      (pResult.competitors || []).forEach((comp) => {
        const cleanName = comp
          .trim()
          .replace(/^(the|a|an)\s+/i, "")
          .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()]/g, "")
          .toUpperCase();
        if (cleanName && cleanName !== details.business_name.toUpperCase()) {
          competitorMentionsMap[cleanName] = (competitorMentionsMap[cleanName] || 0) + 1;
        }
      });
    });
  });

  const totalPossibleCitations = Math.max(1, providerResults.length * 3); // 3 prompts
  const clientSOV = Math.min(100, Math.round((clientMentionsCount / totalPossibleCitations) * 100));

  const competitorsSOVList = Object.entries(competitorMentionsMap)
    .map(([name, count]) => ({
      name: name.split(" ").map(w => w.charAt(0) + w.slice(1).toLowerCase()).join(" "),
      sov: Math.min(100, Math.round((count / totalPossibleCitations) * 100)),
    }))
    .sort((a, b) => b.sov - a.sov)
    .slice(0, 4); // top 4 competitors

  // Strip routing prefixes for clean display
  const cleanLabel = (value: string | null | undefined): string => {
    if (!value) return "";
    return value
      .replace(/^openrouter\//, "")
      .replace(/^openrouter_/, "");
  };

  const handleShare = () => {
    if (typeof window !== "undefined") {
      const shareUrl = scanId 
        ? `${window.location.origin}/scans/${scanId}`
        : window.location.href;
      navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);

      // Log link sharing telemetry to backend
      const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
      fetch(`${BACKEND_URL}/api/v1/telemetry/engagement`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          event_type: "copy_link",
          target: scanId || "current_report"
        })
      }).catch(err => console.error("Engagement telemetry failed:", err));
    }
  };

  const uniquePrompts = Array.from(
    new Set(
      providerResults.flatMap((pr) =>
        (pr.prompt_results || []).map((p) => p.prompt)
      )
    )
  ).filter(Boolean);

  const getCellDetails = (providerName: string, modelName: string | null | undefined, promptText: string) => {
    const pr = providerResults.find((p) => p.provider === providerName && p.model === modelName);
    if (!pr || pr.status === "loading") {
      return {
        bg: "bg-[#0055FF]/[0.03] text-[#0055FF]/80 border-[#0055FF]/20 animate-pulse font-mono",
        label: "◆ Scanning",
        color: "text-[#0055FF]",
        tooltip: "Query dispatch in progress across global context...",
      };
    }
    
    if (pr.error) {
      return {
        bg: "bg-rose-950/10 text-rose-600 border-rose-900/20 font-medium",
        label: "✗",
        color: "text-rose-600",
        tooltip: pr.error,
      };
    }

    const pResult = (pr.prompt_results || []).find((p) => p.prompt === promptText);
    if (!pResult) {
      return {
        bg: "bg-[#0055FF]/[0.03] text-[#0055FF]/80 border-[#0055FF]/20 animate-pulse font-mono",
        label: "◆ Dispatching",
        color: "text-[#0055FF]",
        tooltip: "Analyzing provider output in real-time...",
      };
    }

    if (pResult.mentioned) {
      const rank = pResult.rank_position;
      if (rank != null) {
        if (rank <= 3) {
          return {
            bg: "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-bold",
            label: `#${rank}`,
            color: "text-emerald-600",
            tooltip: `Featured at rank position #${rank} with high local relevance.`,
          };
        } else {
          return {
            bg: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold",
            label: `#${rank}`,
            color: "text-amber-600",
            tooltip: `Client recommended, but ranked at position #${rank}.`,
          };
        }
      }
      return {
        bg: "bg-amber-500/10 text-amber-600 border-amber-500/20 font-bold",
        label: "#1",
        color: "text-amber-600",
        tooltip: `Client recommended, but ranked position is unresolved.`,
      };
    }

    return {
      bg: "bg-rose-500/10 text-rose-600 border-rose-500/20 font-medium",
      label: "✗",
      color: "text-rose-600",
      tooltip: pResult.reason || "Client brand was excluded from the recommendation lists.",
    };
  };

  const formattedDate = new Date().toISOString().slice(0, 10);
  
  return (
    <div className="w-full max-w-7xl mx-auto border border-foreground/10 bg-[#FAF9F6] text-black transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 rounded-none p-0">
      
      {/* ═══════════════════════ PLACEMENT 1: HEADER & PROFILE BENTO ═══════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-foreground/10">
        <div className="md:col-span-8 p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-foreground/10 bg-[#FAF9F6]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              {isScanning ? (
                <span className="font-mono text-[10px] bg-[#0055FF] text-white px-2.5 py-0.5 tracking-tight uppercase font-bold animate-pulse rounded-none">
                  ◆ Streaming AI Search Answers
                </span>
              ) : (
                <span className="font-mono text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 tracking-tight uppercase font-bold rounded-none">
                  AI Search Audit Complete
                </span>
              )}
            </div>
            <h2 className="font-display text-[2.5rem] md:text-[3rem] font-black tracking-tight uppercase mb-3 leading-none text-black">
              AI Search Visibility Report
            </h2>
            <p className="font-mono text-xs text-text-muted uppercase">
              Target Domain: <span className="text-[#0055FF] font-bold select-all">{details.domain}</span>
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-foreground/10 pt-6">
            <div>
              <span className="font-mono text-[9px] text-[#0055FF] block uppercase tracking-wider mb-1 font-bold">Audit Date</span>
              <span className="font-sans text-xs font-black text-black">{formattedDate}</span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-[#0055FF] block uppercase tracking-wider mb-1 font-bold">Location Context</span>
              <span className="font-sans text-xs font-black text-black">
                {details.is_virtual ? "Global Search Space" : `${details.primary_city || "N/A"}${details.primary_state ? `, ${details.primary_state}` : ""}`}
              </span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-[#0055FF] block uppercase tracking-wider mb-1 font-bold">Virtual Footprint</span>
              <span className="font-sans text-xs font-black text-black">
                {details.is_virtual ? "Yes (Geolocation Independent)" : "No (Physical Storefront)"}
              </span>
            </div>
          </div>
        </div>

        {/* OVERALL SCORE BADGE */}
        <div className="md:col-span-4 p-8 flex flex-col items-center justify-center text-center bg-white/50">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3 font-bold">
            AI Search Discovery Score
          </span>
          <div className={`relative flex items-center justify-center w-40 h-40 border border-foreground/20 mb-4 bg-white transition-all duration-300 hover:border-[#0055FF] ${
            isScanning ? "border-[#0055FF] animate-pulse" : "border-foreground/20"
          }`}>
            {/* Technical grid brackets */}
            <div className="absolute top-2 left-2 w-2.5 h-2.5 border-t border-l border-black/20"></div>
            <div className="absolute top-2 right-2 w-2.5 h-2.5 border-t border-r border-black/20"></div>
            <div className="absolute bottom-2 left-2 w-2.5 h-2.5 border-b border-l border-black/20"></div>
            <div className="absolute bottom-2 right-2 w-2.5 h-2.5 border-b border-r border-black/20"></div>

            <div className="text-center">
              <span className="font-mono text-7xl font-extrabold tracking-tighter text-black">
                {overallScore}
              </span>
              <span className="font-mono text-[10px] text-text-muted block mt-0.5 font-bold">
                out of 100
              </span>
            </div>
          </div>
          <span className="font-sans text-xs uppercase tracking-tight font-black">
            {isScanning ? (
              <span className="text-[#0055FF] animate-pulse">Consensus Computing...</span>
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

      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-foreground/10">
        {/* Business Profile Table */}
        <div className="md:col-span-6 p-8 border-b md:border-b-0 md:border-r border-foreground/10">
          <h3 className="font-mono text-[10px] text-[#0055FF] uppercase font-black tracking-widest mb-4">
            Business Profile
          </h3>
          <table className="w-full font-sans text-xs">
            <tbody>
              <tr className="border-b border-black/10">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase w-1/3 font-bold">Business Name</td>
                <td className="font-bold py-2.5 text-black">{details.business_name || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase font-bold">Industry</td>
                <td className="py-2.5 text-black uppercase tracking-tight font-bold">{details.industry || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-black/10">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase font-bold">Location</td>
                <td className="py-2.5 text-black">
                  {details.is_virtual ? (
                    <span className="font-mono text-[10px] text-[#0055FF] font-bold">Global Online Business</span>
                  ) : (
                    `${details.primary_city || "N/A"}${details.primary_state ? `, ${details.primary_state}` : ""}${details.country ? `, ${details.country}` : ""}`
                  )}
                </td>
              </tr>
              <tr>
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase font-bold">Storefront Type</td>
                <td className="py-2.5 font-bold">
                  {details.is_virtual ? (
                    <span className="text-[#0055FF] uppercase text-[10px] font-black">Yes (Global Footprint)</span>
                  ) : (
                    <span className="text-text-muted uppercase text-[10px]">No (Physical Storefront)</span>
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          {/* PREMIUM GOOGLE MAPS CARD FOR PHYSICAL STOREFRONTS */}
          {!details.is_virtual && (details.formatted_address || details.primary_city) && (
            <div className="mt-6 border border-foreground/10 p-3 bg-white shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] select-none">
              <span className="font-mono text-[9px] text-[#0055FF] uppercase tracking-wider block mb-2 font-bold flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-[#0055FF] rounded-full animate-ping"></span>
                Google Maps Verified Location
              </span>
              <div className="w-full h-32 relative bg-zinc-100 border border-foreground/5 overflow-hidden rounded-none">
                <iframe
                  title="Google Maps Location Verification"
                  width="100%"
                  height="100%"
                  style={{ border: 0, filter: "grayscale(30%) contrast(110%)" }}
                  loading="lazy"
                  allowFullScreen
                  referrerPolicy="no-referrer-when-downgrade"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(
                    details.formatted_address || `${details.business_name}, ${details.primary_city}, ${details.primary_state}`
                  )}&t=&z=14&ie=UTF8&iwloc=&output=embed`}
                />
              </div>
              {details.formatted_address && (
                <span className="font-mono text-[9px] text-text-muted block mt-2 leading-tight uppercase font-medium">
                  Address: {details.formatted_address}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Offerings list */}
        <div className="md:col-span-6 p-8 bg-white/30 flex flex-col justify-between">
          <div>
            <h3 className="font-mono text-[10px] text-[#0055FF] uppercase font-black tracking-widest mb-4">
              Identified Service Offerings
            </h3>
            <div className="flex flex-wrap gap-2">
              {details.service_focuses && details.service_focuses.length > 0 ? (
                details.service_focuses.map((svc) => (
                  <span
                    key={svc}
                    className="font-mono text-[10px] bg-white text-black border border-foreground/20 px-2.5 py-1 uppercase rounded-none font-bold"
                  >
                    {svc}
                  </span>
                ))
              ) : isScanning ? (
                <span className="font-mono text-[10px] text-[#0055FF] animate-pulse">
                  Extracting footprints from metadata...
                </span>
              ) : (
                <span className="font-mono text-[10px] text-text-muted italic">No service offerings identified</span>
              )}
            </div>
          </div>
          <div className="mt-8 pt-6 border-t border-foreground/10 flex justify-between items-center">
            <span className="font-mono text-[10px] text-text-muted font-bold">Shareable Report Link</span>
            <button
              onClick={handleShare}
              className="font-mono text-[10px] text-white bg-[#0055FF] px-4 py-2 hover:bg-[#0044DD] transition-all flex items-center gap-1.5 cursor-pointer rounded-none font-black uppercase tracking-wider border border-black/10"
            >
              {copied ? "COPIED!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>

      {/* ═══════════════════════ PLACEMENT 2: HIGH-CONTRAST CONSOLE RESULTS MATRIX (MAIN HIGHLIGHT) ═══════════════════════ */}
      <div className="p-8 bg-[#FAF9F6] border-b border-foreground/10 rounded-none">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-4 border-b border-foreground/10">
          <div>
            <span className="font-mono text-[10px] text-[#0055FF] uppercase font-black tracking-widest block mb-1">
              ◆ AI SEARCH MODEL AUDIT MATRIX
            </span>
            <h3 className="font-display text-2xl font-black uppercase tracking-tight text-black">
              Search Query Citation Performance
            </h3>
          </div>
          <span className="font-mono text-[9px] text-[#0055FF] uppercase tracking-widest font-black">
            *CLICK ANY CELL TO VIEW AI SEARCH ANSWERS
          </span>
        </div>

        <div className="overflow-x-auto select-none">
          <table className="w-full border-collapse text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-foreground/10 font-mono text-[10px] text-black">
                <th className="pb-4 font-black uppercase w-[35%] text-left">Search Query Statement</th>
                {providerResults.map((pr) => (
                  <th key={`${pr.provider}-${pr.model || "default"}`} className="pb-4 font-black uppercase text-center font-mono w-[15%] border-l border-foreground/10">
                    <span className="block text-black font-black uppercase tracking-tight text-xs">
                      {pr.display_name || cleanLabel(pr.provider) || pr.provider}
                    </span>
                    {pr.model && (
                      <span
                        className="block font-mono text-[9px] text-zinc-500 lowercase tracking-tighter normal-case font-medium mt-1 truncate bg-white border border-foreground/10 px-1.5 py-0.5 rounded-none max-w-[120px] mx-auto"
                        title={pr.model}
                      >
                        {cleanLabel(pr.model)}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {uniquePrompts.length === 0 ? (
                <tr>
                  <td colSpan={providerResults.length + 1} className="py-8 text-center text-zinc-500 font-mono text-xs italic">
                    Awaiting citation results to build scorecard matrix...
                  </td>
                </tr>
              ) : (
                uniquePrompts.map((promptText, pIdx) => (
                  <tr key={pIdx} className="border-b border-foreground/10 hover:bg-black/[0.01] transition-colors duration-150">
                    <td className="py-5 text-left font-mono text-[11px] text-black font-bold pr-4 max-w-[320px] truncate" title={promptText}>
                      {promptText}
                    </td>
                    {providerResults.map((pr) => {
                      const cell = getCellDetails(pr.provider, pr.model, promptText);
                      const isSelected = selectedCell?.provider === pr.provider && selectedCell?.model === pr.model && selectedCell?.prompt === promptText;
                      const isScanningOrDispatching = cell.label.includes("Scanning") || cell.label.includes("Dispatching");

                      let customBtnStyle = "border border-foreground/10 text-black bg-white";
                      if (isScanningOrDispatching) {
                        customBtnStyle = "bg-[#0055FF]/[0.03] text-[#0055FF]/80 border-[#0055FF]/20 animate-pulse";
                      } else if (cell.label.startsWith("#") && !cell.label.includes("✗")) {
                        customBtnStyle = `bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 hover:bg-emerald-600 hover:text-white ${isSelected ? 'ring-2 ring-emerald-500/20' : ''} transition-all duration-700 animate-in fade-in zoom-in-95`;
                      } else if (cell.label === "✗") {
                        customBtnStyle = `bg-rose-500/10 text-rose-600 border border-rose-500/20 hover:bg-rose-500 hover:text-white ${isSelected ? 'ring-2 ring-rose-500/20' : ''} transition-all duration-700 animate-in fade-in zoom-in-95`;
                      } else {
                        customBtnStyle = `bg-zinc-100/50 text-zinc-600 border border-zinc-300 hover:bg-zinc-300 hover:text-white ${isSelected ? 'ring-2 ring-zinc-300' : ''} transition-all duration-700 animate-in fade-in zoom-in-95`;
                      }

                      return (
                        <td key={`${pr.provider}-${pr.model || "default"}`} className="py-5 text-center border-l border-foreground/10">
                          <button 
                            onClick={() => setSelectedCell(isSelected ? null : { provider: pr.provider, model: pr.model || null, prompt: promptText })}
                            className={`inline-flex items-center justify-center font-mono text-[10px] px-3 py-1.5 transition-all cursor-pointer rounded-none hover:scale-[1.03] font-bold uppercase ${customBtnStyle}`}
                            title={cell.tooltip}
                          >
                            {isScanningOrDispatching ? (
                              <svg className="animate-spin h-3.5 w-3.5 text-[#0055FF]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                            ) : (
                              cell.label
                            )}
                          </button>
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

      {/* ── INTERACTIVE CELL INSPECTOR CONSOLE DRAWER ── */}
      {selectedCell && (
        <div className="bg-white text-black p-8 border-b border-foreground/10 rounded-none animate-in fade-in slide-in-from-top-4 duration-300 relative">
          <div className="flex justify-between items-center border-b border-foreground/10 pb-3 mb-4">
            <span className="font-mono text-xs text-[#0055FF] font-black uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-[#0055FF]"></span>
              AI SEARCH ANSWER — {selectedCell.provider.toUpperCase()} ({cleanLabel(selectedCell.model || "default").toUpperCase()})
            </span>
            <button 
              onClick={() => setSelectedCell(null)}
              className="font-mono text-[10px] text-primary hover:text-black uppercase font-bold cursor-pointer border border-foreground/10 px-2 py-0.5 bg-[#FAF9F6]"
            >
              [CLOSE X]
            </button>
          </div>
          
          <div className="space-y-4 font-sans text-xs">
            <div>
              <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider block mb-1 font-bold">Query Scenario</span>
              <p className="font-mono text-black font-bold bg-[#FAF9F6] p-3 border border-foreground/10 uppercase tracking-tight text-[11px]">{selectedCell.prompt}</p>
            </div>

            {(() => {
              const pr = providerResults.find((p) => p.provider === selectedCell.provider && p.model === selectedCell.model);
              const pResult = (pr?.prompt_results || []).find((p) => p.prompt === selectedCell.prompt);
              
              if (!pResult) {
                return <p className="font-mono text-[10px] text-text-muted">Awaiting citation outcome metrics...</p>;
              }

              return (
                <div className="space-y-4">
                  {/* Raw AI Response text box */}
                  <div>
                    <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider block mb-1 font-bold">AI Search Response Text</span>
                    <div 
                      className="bg-white p-5 border border-foreground/10 text-black leading-relaxed text-[12px] font-medium whitespace-normal"
                      dangerouslySetInnerHTML={{ __html: marked.parse(pResult.raw_response || "No response content provided.") as string }}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Side: Metadata and Competitors */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#FAF9F6] p-4 border border-foreground/10">
                        <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider block mb-1 font-bold">Citation Match</span>
                        <span className={`font-mono text-sm font-black uppercase ${pResult.mentioned ? "text-emerald-600" : "text-rose-600"}`}>
                          {pResult.mentioned ? `CITED (RANK #${pResult.rank_position ?? "N/A"})` : "MISSING"}
                        </span>
                      </div>
                      <div className="bg-[#FAF9F6] p-4 border border-foreground/10">
                        <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider block mb-1 font-bold">Web Link Match</span>
                        <span className={`font-mono text-sm font-black uppercase ${pResult.domain_match ? "text-emerald-600" : "text-rose-600"}`}>
                          {pResult.domain_match ? "VERIFIED LINK" : "NO LINKED PROFILE"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-[#FAF9F6] p-4 border border-foreground/10">
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider block mb-2 font-bold">Competing Brands Recommended</span>
                      {pResult.competitors && pResult.competitors.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {pResult.competitors.map((comp: string, cIdx: number) => (
                            <span key={cIdx} className="bg-white border border-foreground/10 text-black font-mono text-[10px] uppercase px-2 py-0.5 font-bold">
                              {comp}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-text-muted italic text-[10px]">No competing brands were cited in this query.</span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: AI Reasoning */}
                  <div className="md:col-span-7 bg-[#FAF9F6] p-4 border border-foreground/10 flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[9px] text-text-muted uppercase tracking-wider block mb-2 font-bold">AI CITATION ANALYSIS</span>
                      <p className="text-black leading-relaxed text-[12px] font-medium">
                        {pResult.reason || "Model returned generic local industry listings without direct brand visibility justification."}
                      </p>
                    </div>
                    <div className="font-mono text-[9px] text-[#0055FF] uppercase tracking-widest mt-4 font-bold">
                      *Consolidated via Upserv AI Judge
                    </div>
                  </div>
                </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* ═══════════════════════ PLACEMENT 3: AI EXECUTIVE SUMMARY & COMPETITIVE SOV ═══════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-foreground/10 bg-surface-container-low/30">
        <div className="md:col-span-6 p-8 border-b md:border-b-0 md:border-r border-foreground/10">
          <h3 className="font-mono text-[10px] text-[#0055FF] uppercase font-black tracking-widest mb-4">
            AI Share of Voice (SOV)
          </h3>
          <p className="font-sans text-xs text-text-muted mb-6">
            Percentage of conversational citations captured by each brand across query models.
          </p>
          
          <div className="space-y-4">
            {/* Client SOV */}
            <div>
              <div className="flex justify-between font-mono text-[10px] font-black uppercase mb-1">
                <span>{details.business_name || "YOUR BUSINESS"} (YOU)</span>
                <span className="text-[#0055FF]">{clientSOV}%</span>
              </div>
              <div className="w-full bg-[#EAEAEA] h-3 border border-foreground/10 relative">
                <div className="bg-[#0055FF] h-full transition-all duration-500" style={{ width: `${clientSOV}%` }} />
              </div>
            </div>

            {/* Competitors SOV */}
            {competitorsSOVList.length > 0 ? (
              competitorsSOVList.map((comp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between font-mono text-[10px] uppercase mb-1 font-bold">
                    <span className="font-bold">{comp.name}</span>
                    <span className="font-bold text-black">{comp.sov}%</span>
                  </div>
                  <div className="w-full bg-[#EAEAEA] h-3 border border-foreground/10 relative">
                    <div className="bg-zinc-700/60 h-full transition-all duration-500" style={{ width: `${comp.sov}%` }} />
                  </div>
                </div>
              ))
            ) : isScanning ? (
              <div className="font-mono text-[10px] text-[#0055FF] animate-pulse py-4 font-bold">
                ◆ Computing competitor citation footprints...
              </div>
            ) : (
              <div className="font-sans text-xs text-text-muted italic py-4">
                No major competitor visibility detected. You command dominant share.
              </div>
            )}
          </div>
        </div>

        {/* AI-Generated Executive Summary Block */}
        <div className="md:col-span-6 p-8 flex flex-col justify-between bg-white">
          <div>
            <h3 className="font-mono text-[10px] text-rose-600 uppercase font-black tracking-widest mb-4 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-rose-600"></span>
              AI Executive Summary
            </h3>
            
            <div className="border border-foreground/10 p-5 bg-[#FAF9F6] relative">
              <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-black/20"></div>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-black/20"></div>
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-black/20"></div>
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-black/20"></div>

              {isScanning ? (
                <div className="font-mono text-[10px] text-text-muted uppercase animate-pulse">
                  Compiling generative discovery analysis...
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className={`font-display text-[15px] font-black uppercase tracking-tight mb-1 leading-none ${
                    clientSOV < 40 ? "text-rose-600" : clientSOV < 75 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {clientSOV < 40 ? "Critical Visibility Deficit" : clientSOV < 75 ? "Exposure Vulnerability" : "Dominant Search Moat"}
                  </h4>
                  <p className="font-sans text-xs text-black/80 leading-relaxed font-bold">
                    {summary.executive_summary || `AI search models evaluated your online presence. Currently, you capture a ${clientSOV}% Share of Voice while competitors are actively occupying key digital queries.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-black/10 font-mono text-[9px] text-text-muted leading-normal">
            *Executive consensus compiled over a database of all active model queries.
          </div>
        </div>
      </div>

    </div>
  );
}
