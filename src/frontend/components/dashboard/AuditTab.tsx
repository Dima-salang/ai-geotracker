"use client";

import React from "react";
import ResultsDashboard, { ProviderResult } from "../ResultsDashboard";
import StageTracker from "./StageTracker";

interface AuditTabProps {
  scanDomain: string;
  setScanDomain: (domain: string) => void;
  scanLoading: boolean;
  scanProgressStage: string;
  scanError: string;
  showActiveDashboardReport: boolean;
  scanResult: any;
  scanStreamingProviders: ProviderResult[];
  handleStartScan: (e: React.FormEvent) => void;
  activeBusiness: {
    id: string;
    name: string;
    domain: string;
    industry: string;
    primary_city: string;
    primary_state: string;
    country: string;
    service_focuses: string[];
  } | null;
}

export default function AuditTab({
  scanDomain,
  setScanDomain,
  scanLoading,
  scanProgressStage,
  scanError,
  showActiveDashboardReport,
  scanResult,
  scanStreamingProviders,
  handleStartScan,
  activeBusiness,
}: AuditTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Tab Header */}
      <div className="border-b border-foreground/10 pb-6">
        <span className="font-mono text-xs text-[#0055FF] mb-2 uppercase tracking-[0.2em] block">
          ◆ AI SEARCH CHECK
        </span>
        <h2 className="font-display text-[2.2rem] md:text-[2.6rem] font-bold tracking-tight uppercase leading-none text-black">
          AI Visibility Audit
        </h2>
      </div>

      {/* Main Scan Trigger Panel */}
      <div className="border border-foreground/10 p-6 md:p-8 bg-white shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] space-y-6">
        <div>
          <span className="font-mono text-[9px] text-[#0055FF] block uppercase tracking-widest mb-1 font-bold">
            ◆ AI STANDING CHECKER
          </span>
          <h3 className="font-display text-xl font-black uppercase tracking-tight text-black">
            Check Your AI Visibility
          </h3>
        </div>

        <form onSubmit={handleStartScan} className="flex flex-col sm:flex-row gap-4 items-center">
          <div className="w-full relative">
            <input
              type="text"
              required
              value={scanDomain}
              onChange={(e) => setScanDomain(e.target.value)}
              placeholder="Your business website (e.g. clinicdomain.com)"
              className="w-full font-mono text-xs border border-foreground/20 px-4 py-3.5 bg-[#FAF9F6] focus:outline-none focus:border-primary font-bold rounded-none uppercase"
              disabled={scanLoading}
            />
          </div>
          <button
            type="submit"
            disabled={scanLoading || !scanDomain.trim()}
            className="w-full sm:w-auto font-mono text-xs bg-primary text-white px-8 py-3.5 hover:bg-primary-hover transition-all font-black uppercase tracking-widest disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer shadow-[2px_2px_0px_0px_rgba(0,0,0,0.15)] border border-black/10 rounded-none"
          >
            {scanLoading ? "CHECKING..." : "CHECK MY AI STANDING"}
          </button>
        </form>

        {scanError && (
          <div className="p-4 border border-rose-600 bg-rose-600/5 text-rose-600 font-mono text-[10px] font-bold uppercase">
            [ERROR]: {scanError}
          </div>
        )}
      </div>

      {/* Stage Tracker */}
      {scanLoading && (
        <div className="animate-in fade-in duration-300">
          <StageTracker stage={scanProgressStage} />
        </div>
      )}

      {/* Active Scorecard Result */}
      {showActiveDashboardReport && (
        <div id="active-report-display" className="space-y-4 animate-in fade-in duration-500 pt-4">
          <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-foreground/10 pb-4 gap-4">
            <div>
              <span className="font-mono text-xs text-[#0055FF] mb-2 uppercase tracking-[0.2em] block">
                ◆ LIVE RESULTS
              </span>
              <h2 className="font-display text-xl font-black uppercase leading-none text-black">
                Your AI Visibility Report
              </h2>
            </div>
          </div>

          <ResultsDashboard
            overallScore={scanResult ? scanResult.overall_score : (scanStreamingProviders.length > 0 ? Math.round(scanStreamingProviders.filter(p => p.status !== "loading").reduce((acc, curr) => acc + (curr.score || 0), 0) / Math.max(1, scanStreamingProviders.filter(p => p.status !== "loading").length)) : 0)}
            summary={scanResult ? scanResult.summary : {
              green: scanStreamingProviders.filter(p => p.status === "green").length,
              yellow: scanStreamingProviders.filter(p => p.status === "yellow").length,
              red: scanStreamingProviders.filter(p => p.status === "red").length,
            }}
            recommendations={scanResult ? scanResult.recommendations : []}
            details={{
              business_name: scanResult ? scanResult.business_name : (activeBusiness?.name || ""),
              domain: scanDomain,
              industry: scanResult ? scanResult.business_industry : (activeBusiness?.industry || ""),
              primary_city: activeBusiness?.primary_city || "",
              primary_state: activeBusiness?.primary_state || "",
              country: activeBusiness?.country || "",
              service_focuses: activeBusiness?.service_focuses || [],
              is_virtual: false
            }}
            providerResults={scanResult ? scanResult.results : scanStreamingProviders}
            scanId={scanResult ? scanResult.id : undefined}
            isScanning={scanLoading}
          />
        </div>
      )}

    </div>
  );
}
