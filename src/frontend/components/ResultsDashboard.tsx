"use client";

import { useEffect, useState, useRef } from "react";

export interface ProviderResult {
  provider: string;
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
  const [selectedCell, setSelectedCell] = useState<{ provider: string; prompt: string } | null>(null);
  const [scrollReachedBottom, setScrollReachedBottom] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver to handle the smooth, modern scroll-based CTA transition
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setScrollReachedBottom(entry.isIntersecting);
      },
      { threshold: 0.1 }
    );

    if (bottomRef.current) {
      observer.observe(bottomRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, []);

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
          .trim();
        if (cleanName && cleanName.toLowerCase() !== (details.business_name || "").toLowerCase()) {
          const formattedName = cleanName.split(' ')
            .map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
            .join(' ');
          competitorMentionsMap[formattedName] = (competitorMentionsMap[formattedName] || 0) + 1;
        }
      });
    });
  });

  const totalMentions = clientMentionsCount + Object.values(competitorMentionsMap).reduce((a, b) => a + b, 0);
  const clientSOV = summary.client_sov ?? (totalMentions > 0 ? Math.round((clientMentionsCount / totalMentions) * 100) : 0);

  const competitorsSOVList = Object.entries(competitorMentionsMap)
    .map(([name, count]) => ({
      name,
      mentions: count,
      sov: totalMentions > 0 ? Math.round((count / totalMentions) * 100) : 0,
    }))
    .sort((a, b) => b.mentions - a.mentions)
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
        bg: "bg-rose-950/20 text-rose-400 border-rose-900/40 font-medium",
        label: "✗",
        color: "text-rose-400",
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

    const isSelected = selectedCell?.provider === providerName && selectedCell?.prompt === promptText;

    if (pResult.mentioned) {
      const rank = pResult.rank_position;
      if (rank != null && rank <= 3) {
        return {
          bg: `bg-emerald-950/40 text-emerald-400 ${isSelected ? 'border-primary border-2' : 'border-emerald-900/50'} font-bold`,
          label: `#${rank}`,
          color: "text-emerald-400",
          tooltip: `Business cited at premium position #${rank} for this search query. Click to view reasons.`,
        };
      } else {
        return {
          bg: `bg-amber-950/40 text-amber-400 ${isSelected ? 'border-primary border-2' : 'border-amber-900/50'} font-bold`,
          label: rank != null ? `#${rank}` : "CITED",
          color: "text-amber-400",
          tooltip: rank != null 
            ? `Business cited but ranked outside top 3 (position #${rank}). Click to view reasons.`
            : "Business was cited in simulated results. Click to view reasons.",
        };
      }
    } else {
      return {
        bg: `bg-rose-950/40 text-rose-500 ${isSelected ? 'border-primary border-2' : 'border-rose-900/50'}`,
        label: "✗",
        color: "text-rose-500",
        tooltip: "No citation or visibility index detected for this query. Click to inspect competitors.",
      };
    }
  };

  const formattedDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="w-full max-w-7xl mx-auto border border-black bg-[#FAF9F6] text-black transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 rounded-none">
      
      {/* ═══════════════════════ PLACEMENT 1: HEADER & PROFILE BENTO ═══════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-black">
        <div className="md:col-span-8 p-6 md:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-black bg-[#FAF9F6]">
          <div>
            <div className="flex items-center gap-3 mb-4">
              {isScanning ? (
                <span className="font-mono text-[10px] bg-primary text-white px-2.5 py-0.5 tracking-tight uppercase font-bold animate-pulse rounded-none">
                  ◆ Streaming Results
                </span>
              ) : (
                <span className="font-mono text-[10px] bg-emerald-600 text-white px-2.5 py-0.5 tracking-tight uppercase font-bold rounded-none">
                  Audit Complete
                </span>
              )}
            </div>
            <h2 className="font-display text-[2rem] md:text-[2.2rem] font-bold tracking-tight uppercase mb-3 leading-none">
              AI Search Visibility Report
            </h2>
            <p className="font-mono text-xs text-text-muted uppercase">
              Target Domain: <span className="text-black font-bold">{details.domain}</span>
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-6 border-t border-black/10 pt-6">
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase tracking-wider mb-1">Audit Date</span>
              <span className="font-sans text-xs font-bold text-black">{formattedDate}</span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase tracking-wider mb-1">Location Context</span>
              <span className="font-sans text-xs font-bold text-black">
                {details.is_virtual ? "Global Search Space" : `${details.primary_city || "N/A"}${details.primary_state ? `, ${details.primary_state}` : ""}`}
              </span>
            </div>
            <div>
              <span className="font-mono text-[9px] text-text-muted block uppercase tracking-wider mb-1">Virtual Footprint</span>
              <span className="font-sans text-xs font-bold text-black">
                {details.is_virtual ? "Yes (Geolocation Independent)" : "No (Physical Proximity)"}
              </span>
            </div>
          </div>
        </div>

        {/* OVERALL SCORE BADGE */}
        <div className="md:col-span-4 p-6 md:p-8 flex flex-col items-center justify-center text-center bg-white/50">
          <span className="font-mono text-[10px] text-text-muted uppercase tracking-widest mb-3">
            AI Search Discovery Score
          </span>
          <div className={`relative flex items-center justify-center w-36 h-36 border border-black mb-4 bg-white transition-all duration-300 ${
            isScanning ? "border-primary animate-pulse" : "border-black"
          }`}>
            {/* Technical grid brackets */}
            <div className="absolute top-2 left-2 w-2 h-2 border-t border-l border-black/40"></div>
            <div className="absolute top-2 right-2 w-2 h-2 border-t border-r border-black/40"></div>
            <div className="absolute bottom-2 left-2 w-2 h-2 border-b border-l border-black/40"></div>
            <div className="absolute bottom-2 right-2 w-2 h-2 border-b border-r border-black/40"></div>

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

      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-black">
        {/* Business Profile Table */}
        <div className="md:col-span-6 p-6 md:p-8 border-b md:border-b-0 md:border-r border-black">
          <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
            Business Profile
          </h3>
          <table className="w-full font-sans text-xs">
            <tbody>
              <tr className="border-b border-black/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase w-1/3">Business Name</td>
                <td className="font-bold py-2.5 text-black">{details.business_name || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">Industry</td>
                <td className="py-2.5 text-black uppercase tracking-tight">{details.industry || "Unresolved"}</td>
              </tr>
              <tr className="border-b border-black/5">
                <td className="font-mono text-[10px] text-text-muted py-2.5 uppercase">Location</td>
                <td className="py-2.5 text-black">
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

        {/* Offerings list */}
        <div className="md:col-span-6 p-6 md:p-8 bg-white/30 flex flex-col justify-between">
          <div>
            <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
              Identified Service Offerings
            </h3>
            <div className="flex flex-wrap gap-2">
              {details.service_focuses && details.service_focuses.length > 0 ? (
                details.service_focuses.map((svc) => (
                  <span
                    key={svc}
                    className="font-mono text-[10px] bg-white text-black border border-black/10 px-2.5 py-1 uppercase rounded-none"
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
          <div className="mt-8 pt-6 border-t border-black/10 flex justify-between items-center">
            <span className="font-mono text-[10px] text-text-muted">Shareable Report Link</span>
            <button
              onClick={handleShare}
              className="font-mono text-[10px] text-white bg-primary px-3 py-1.5 hover:bg-primary-container transition-all flex items-center gap-1.5 cursor-pointer rounded-none font-bold"
            >
              {copied ? "COPIED!" : "Copy Link"}
            </button>
          </div>
        </div>
      </div>


      {/* ═══════════════════════ PLACEMENT 2: HIGH-CONTRAST CONSOLE RESULTS MATRIX (MAIN HIGHLIGHT) ═══════════════════════ */}
      <div className="p-6 md:p-8 bg-black text-white border-b border-black rounded-none">
        <div className="flex justify-between items-center mb-4">
          <div>
            <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest block mb-1">
              ◆ AI GENERATIVE ENGINE SIMULATIONS
            </span>
            <h3 className="font-display text-xl font-bold uppercase tracking-tight text-white">
              Search Query Citation Performance
            </h3>
          </div>
          <span className="hidden sm:inline font-mono text-[9px] text-zinc-500 uppercase tracking-widest">
            *CLICK ANY CELL TO VIEW SIMULATED LLM REPLIES
          </span>
        </div>

        <div className="overflow-x-auto select-none">
          <table className="w-full border-collapse text-left text-xs min-w-[800px]">
            <thead>
              <tr className="border-b border-zinc-800 font-mono text-[10px] text-zinc-400">
                <th className="pb-3 font-medium uppercase w-[35%] text-left">Search Query Statement</th>
                {providerResults.map((pr) => (
                  <th key={pr.provider} className="pb-3 font-medium uppercase text-center font-mono w-[15%]">
                    <span className="block text-white font-bold uppercase tracking-tight">
                      {cleanLabel(pr.provider) || pr.provider}
                    </span>
                    {pr.model && (
                      <span
                        className="block font-mono text-[9px] text-zinc-500 lowercase tracking-tighter normal-case font-medium mt-1 truncate bg-zinc-900 border border-zinc-800/40 px-1 py-0.5 rounded-none max-w-[120px] mx-auto"
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
                  <tr key={pIdx} className="border-b border-zinc-900 hover:bg-zinc-900/30 transition-colors duration-150">
                    <td className="py-4 text-left font-mono text-[11px] text-zinc-300 font-bold pr-4 max-w-[320px] truncate" title={promptText}>
                      {promptText}
                    </td>
                    {providerResults.map((pr) => {
                      const cell = getCellDetails(pr.provider, promptText);
                      const isSelected = selectedCell?.provider === pr.provider && selectedCell?.prompt === promptText;
                      return (
                        <td key={pr.provider} className="py-4 text-center">
                          <button 
                            onClick={() => setSelectedCell(isSelected ? null : { provider: pr.provider, prompt: promptText })}
                            className={`inline-flex items-center justify-center font-mono text-[10px] px-2.5 py-1 border transition-all cursor-pointer rounded-none hover:scale-105 ${cell.bg}`}
                            title={cell.tooltip}
                          >
                            {cell.label}
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
        <div className="bg-zinc-950 text-zinc-100 p-6 md:p-8 border-b border-black rounded-none animate-in fade-in slide-in-from-top-4 duration-300 relative">
          <div className="flex justify-between items-center border-b border-zinc-800 pb-3 mb-4">
            <span className="font-mono text-xs text-primary font-bold uppercase tracking-widest flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-primary rounded-full"></span>
              DETAILED AUDIT CONSOLE — {selectedCell.provider.toUpperCase()} ENGINE
            </span>
            <button 
              onClick={() => setSelectedCell(null)}
              className="font-mono text-[10px] text-zinc-400 hover:text-white uppercase font-bold cursor-pointer"
            >
              [CLOSE X]
            </button>
          </div>
          
          <div className="space-y-4 font-sans text-xs">
            <div>
              <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider block mb-1 font-bold">Simulated Query Scenario</span>
              <p className="font-mono text-zinc-100 font-bold bg-zinc-900 p-3 border border-zinc-800 uppercase tracking-tight">{selectedCell.prompt}</p>
            </div>

            {(() => {
              const pr = providerResults.find((p) => p.provider === selectedCell.provider);
              const pResult = (pr?.prompt_results || []).find((p) => p.prompt === selectedCell.prompt);
              
              if (!pResult) {
                return <p className="font-mono text-[10px] text-zinc-500">Awaiting citation outcome metrics...</p>;
              }
              
              return (
                <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
                  {/* Left Side: Metadata and Competitors */}
                  <div className="md:col-span-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-zinc-900 p-3 border border-zinc-800">
                        <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">Citation Match</span>
                        <span className={`font-mono text-xs font-bold uppercase ${pResult.mentioned ? "text-emerald-500" : "text-rose-500"}`}>
                          {pResult.mentioned ? `CITED (RANK #${pResult.rank_position ?? "N/A"})` : "MISSING"}
                        </span>
                      </div>
                      <div className="bg-zinc-900 p-3 border border-zinc-800">
                        <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider block mb-1">Web Link Match</span>
                        <span className={`font-mono text-xs font-bold uppercase ${pResult.domain_match ? "text-emerald-500" : "text-rose-500"}`}>
                          {pResult.domain_match ? "VERIFIED LINK" : "NO LINKED SCHEMAS"}
                        </span>
                      </div>
                    </div>

                    <div className="bg-zinc-900 p-4 border border-zinc-800">
                      <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider block mb-2 font-bold">Competing Brands Cited</span>
                      {pResult.competitors && pResult.competitors.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {pResult.competitors.map((comp: string, cIdx: number) => (
                            <span key={cIdx} className="bg-zinc-950 border border-zinc-800 text-zinc-300 font-mono text-[9px] uppercase px-2 py-0.5">
                              {comp}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-zinc-500 italic text-[10px]">No competing brands were cited in this simulated query.</span>
                      )}
                    </div>
                  </div>

                  {/* Right Side: AI Reasoning */}
                  <div className="md:col-span-7 bg-zinc-900 p-4 border border-zinc-800 flex flex-col justify-between">
                    <div>
                      <span className="font-mono text-[9px] text-zinc-500 uppercase tracking-wider block mb-2 font-bold">AI CITATION REASONING</span>
                      <p className="text-zinc-300 leading-relaxed text-xs">
                        {pResult.reason || "Simulated model returned generic local industry listings without direct brand visibility justification."}
                      </p>
                    </div>
                    <div className="font-mono text-[9px] text-zinc-600 uppercase tracking-widest mt-4">
                      *Consolidated via Upserv Judge AI
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}


      {/* ═══════════════════════ PLACEMENT 3: AI EXECUTIVE SUMMARY & COMPETITIVE SOV ═══════════════════════ */}
      <div className="grid grid-cols-1 md:grid-cols-12 border-b border-black bg-surface-container-low/30">
        <div className="md:col-span-6 p-6 md:p-8 border-b md:border-b-0 md:border-r border-black">
          <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-4">
            AI Share of Voice (SOV)
          </h3>
          <p className="font-sans text-xs text-text-muted mb-6">
            Percentage of conversational citations captured by each brand across simulated query models.
          </p>
          
          <div className="space-y-4">
            {/* Client SOV */}
            <div>
              <div className="flex justify-between font-mono text-[10px] font-bold uppercase mb-1">
                <span>{details.business_name || "YOUR BUSINESS"} (YOU)</span>
                <span className="text-primary">{clientSOV}%</span>
              </div>
              <div className="w-full bg-[#EAEAEA] h-2.5 border border-black/10 relative">
                <div className="bg-primary h-full transition-all duration-500" style={{ width: `${clientSOV}%` }} />
              </div>
            </div>

            {/* Competitors SOV */}
            {competitorsSOVList.length > 0 ? (
              competitorsSOVList.map((comp, idx) => (
                <div key={idx}>
                  <div className="flex justify-between font-mono text-[10px] uppercase mb-1">
                    <span className="font-medium">{comp.name}</span>
                    <span className="font-bold text-black">{comp.sov}%</span>
                  </div>
                  <div className="w-full bg-[#EAEAEA] h-2.5 border border-black/10 relative">
                    <div className="bg-black/45 h-full transition-all duration-500" style={{ width: `${comp.sov}%` }} />
                  </div>
                </div>
              ))
            ) : isScanning ? (
              <div className="font-mono text-[10px] text-primary animate-pulse py-4">
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
        <div className="md:col-span-6 p-6 md:p-8 flex flex-col justify-between bg-white">
          <div>
            <h3 className="font-mono text-[10px] text-rose-600 uppercase font-bold tracking-widest mb-4 flex items-center gap-1.5 animate-pulse">
              <span className="w-1.5 h-1.5 bg-rose-600 rounded-full"></span>
              AI Executive Summary
            </h3>
            
            <div className="border border-black p-5 bg-[#FAF9F6] relative">
              <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-black/40"></div>
              <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-black/40"></div>
              <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-black/40"></div>
              <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-black/40"></div>

              {isScanning ? (
                <div className="font-mono text-[10px] text-text-muted uppercase animate-pulse">
                  Compiling generative discovery analysis...
                </div>
              ) : (
                <div className="space-y-3">
                  <h4 className={`font-display text-sm font-extrabold uppercase tracking-tight mb-1 leading-none ${
                    clientSOV < 40 ? "text-rose-600" : clientSOV < 75 ? "text-amber-600" : "text-emerald-600"
                  }`}>
                    {clientSOV < 40 ? "Critical Visibility Deficit" : clientSOV < 75 ? "Exposure Vulnerability" : "Dominant Search Moat"}
                  </h4>
                  <p className="font-sans text-xs text-black/80 leading-relaxed font-medium">
                    {summary.executive_summary || `AI search models evaluated your online presence. Currently, you capture a ${clientSOV}% Share of Voice while competitors are actively occupying key digital queries.`}
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-black/10 font-mono text-[9px] text-text-muted leading-normal">
            *Executive consensus compiled over a simulated database of all active model queries.
          </div>
        </div>
      </div>


      {/* ── PLACEMENT 4: SIMPLIFIED STRATEGY RECOMMENDATIONS (ACTIONABLE BLUEPRINTS) ── */}
      <div className="p-6 md:p-8 bg-[#FAF9F6] border-b border-black">
        <h3 className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest mb-6">
          AI Optimization Strategy
        </h3>
        {recommendations && recommendations.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {recommendations.map((rec, idx) => (
              <div key={idx} className="border border-black bg-white p-5 flex flex-col justify-between min-h-[140px] relative">
                <div className="absolute top-2 left-2 w-1.5 h-1.5 border-t border-l border-black/30"></div>
                <div className="absolute top-2 right-2 w-1.5 h-1.5 border-t border-r border-black/30"></div>
                <div className="absolute bottom-2 left-2 w-1.5 h-1.5 border-b border-l border-black/30"></div>
                <div className="absolute bottom-2 right-2 w-1.5 h-1.5 border-b border-r border-black/30"></div>

                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-[9px] font-bold text-text-muted uppercase">ISSUE_{idx + 1}</span>
                    <span className={`font-mono text-[8px] font-bold px-2 py-0.5 text-white uppercase ${
                       rec.severity === "high" ? "bg-rose-600" : rec.severity === "medium" ? "bg-amber-500" : "bg-slate-500"
                    }`}>
                      {rec.severity}
                    </span>
                  </div>
                  <h4 className="font-bold text-xs mb-1.5 text-black uppercase leading-tight">{rec.issue}</h4>
                  <p className="font-sans text-[11px] text-text-muted leading-relaxed">{rec.recommendation}</p>
                </div>
              </div>
            ))}
          </div>
        ) : isScanning ? (
          <div className="border border-primary/20 bg-primary/[0.02] p-6 text-center animate-pulse">
            <span className="font-mono text-[11px] text-primary block font-bold mb-1">
              Compiling Strategy Blueprint...
            </span>
          </div>
        ) : (
          <div className="border border-black bg-white p-6 text-center">
            <span className="font-mono text-[11px] text-emerald-600 block font-bold mb-1 uppercase">
              Zero Citation Anomalies Detected
            </span>
            <p className="font-sans text-xs text-text-muted">
              Your business indexes optimally across all active provider configurations.
            </p>
          </div>
        )}
      </div>


      {/* ── ═══════════════════════ PLACEMENT 5: STARK BOTTOM URGENCY CTA (UPSERV.AI) ═══════════════════════ ── */}
      <div 
        ref={bottomRef}
        className={`p-8 md:p-12 transition-all duration-[800ms] ease-in-out border-t border-black text-center relative overflow-hidden rounded-none ${
          scrollReachedBottom 
            ? "bg-black text-white border-t-2 border-primary" 
            : "bg-[#FAF9F6] text-black"
        }`}
      >
        {/* Ambient radial glow overlay */}
        {scrollReachedBottom && (
          <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-primary/10 to-transparent" />
        )}

        <div className="max-w-3xl mx-auto relative z-10 space-y-6">
          <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-[0.25em] block animate-pulse">
            ◆ AI CITATION DEFENSE ALLIANCE ◆
          </span>

          {clientSOV < 40 ? (
            <div className="space-y-4">
              <h2 className="font-display text-[2rem] md:text-[2.6rem] font-bold uppercase tracking-tight leading-none">
                Your Brand is Invisible to Conversational Search.
              </h2>
              <p className={`font-sans text-sm leading-relaxed max-w-2xl mx-auto ${scrollReachedBottom ? "text-zinc-400" : "text-text-muted"}`}>
                Conversational search models are actively recommending alternative businesses while bypassing your domain completely. Every day you delay, high-intent buyers searching ChatGPT, Gemini, and Claude are being routed directly to local rivals.
              </p>
              <p className="font-sans text-xs text-primary font-bold uppercase tracking-wide">
                Upserv.ai resolves visibility gaps instantly. Secure your digital share today.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <h2 className="font-display text-[2rem] md:text-[2.6rem] font-bold uppercase tracking-tight leading-none">
                AI Citation Permanence Does Not Exist.
              </h2>
              <p className={`font-sans text-sm leading-relaxed max-w-2xl mx-auto ${scrollReachedBottom ? "text-zinc-400" : "text-text-muted"}`}>
                While you currently capture visibility, this standing is highly volatile. AI search indexes are updated continuously. Competitors are aggressively deploying optimization updates to hog your search share. Defend your brand.
              </p>
              <p className="font-sans text-xs text-primary font-bold uppercase tracking-wide">
                That is why Upserv.ai exists — to shield your rankings and block replacement.
              </p>
            </div>
          )}

          <div className="pt-6">
            <button
              onClick={() => alert("Connecting to Upserv.ai Core: Defend/Claim your conversational footprint instantly.")}
              className={`font-mono text-xs px-8 py-4 border font-black uppercase tracking-widest cursor-pointer hover:scale-105 active:scale-95 transition-all w-full sm:w-auto ${
                scrollReachedBottom 
                  ? "bg-primary text-white border-primary hover:bg-transparent hover:text-primary" 
                  : "bg-black text-white border-black hover:bg-transparent hover:text-black"
              }`}
            >
              {clientSOV < 40 ? "Claim My AI Share of Voice with Upserv.ai" : "Defend My AI Search Dominance with Upserv.ai"}
            </button>
          </div>
        </div>
      </div>

    </div>
  );
}
