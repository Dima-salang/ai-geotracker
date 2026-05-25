"use client";

import React from "react";
import ResultsDashboard from "../ResultsDashboard";

interface HistoryTabProps {
  scansHistory: any[];
  historyLoading: boolean;
  selectedHistoricalScan: any;
  handleSelectHistoricalScan: (scanId: string) => void;
  setSelectedHistoricalScan: (scan: any) => void;
}

export default function HistoryTab({
  scansHistory,
  historyLoading,
  selectedHistoricalScan,
  handleSelectHistoricalScan,
  setSelectedHistoricalScan,
}: HistoryTabProps) {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* Tab Header */}
      <div className="border-b border-foreground/10 pb-6">
        <span className="font-mono text-xs text-[#0055FF] mb-2 uppercase tracking-[0.2em] block">
          ◆ PAST REPORTS
        </span>
        <h2 className="font-display text-[2.2rem] md:text-[2.6rem] font-bold tracking-tight uppercase leading-none text-black">
          Audit History
        </h2>
      </div>

      {/* Scans History Table */}
      <div className="border border-foreground/10 bg-white p-6 md:p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,0.05)] space-y-6">
        <div>
          <span className="font-mono text-[9px] text-[#0055FF] block uppercase tracking-widest mb-1 font-bold">
            ◆ YOUR SCAN HISTORY
          </span>
          <h3 className="font-display text-xl font-black uppercase tracking-tight text-black">
            Past AI Visibility Audits
          </h3>
        </div>

        {historyLoading ? (
          <div className="font-mono text-[10px] text-zinc-500 italic py-6">
            Loading your past reports...
          </div>
        ) : scansHistory.length === 0 ? (
          <div className="font-mono text-[10px] text-text-muted italic py-6">
            No past audits found. Run your first AI visibility check to see results here.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-xs min-w-[700px]">
              <thead>
                <tr className="border-b border-foreground/10 font-mono text-[9px] text-[#0055FF] uppercase font-black">
                  <th className="pb-3 w-[20%]">Scan ID</th>
                  <th className="pb-3 w-[25%]">Business Name</th>
                  <th className="pb-3 w-[25%]">Website</th>
                  <th className="pb-3 w-[12%] text-center">Score</th>
                  <th className="pb-3 w-[18%] text-right">Date</th>
                </tr>
              </thead>
              <tbody>
                {scansHistory.map((hScan) => {
                  const isSelected = selectedHistoricalScan?.id === hScan.id;
                  return (
                    <tr
                      key={hScan.id}
                      className={`border-b border-black/5 hover:bg-[#FAF9F6] cursor-pointer transition-colors duration-150 ${
                        isSelected ? "bg-primary/[0.03] font-bold" : ""
                      }`}
                      onClick={() => handleSelectHistoricalScan(hScan.id)}
                    >
                      <td className="py-4 font-mono text-[10px] font-bold text-black uppercase">
                        {hScan.id.slice(0, 8)}
                      </td>
                      <td className="py-4 font-sans text-xs text-black font-bold uppercase truncate max-w-[200px]" title={hScan.business_name}>
                        {hScan.business_name}
                      </td>
                      <td className="py-4 font-mono text-[10px] text-zinc-500 font-bold lowercase select-all">
                        {hScan.business_domain}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 ${
                          hScan.overall_score >= 80
                            ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                            : hScan.overall_score >= 50
                            ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                        }`}>
                          {hScan.overall_score} / 100
                        </span>
                      </td>
                      <td className="py-4 font-mono text-[9px] text-text-muted text-right font-medium">
                        {new Date(hScan.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Historical Report Display */}
      {selectedHistoricalScan && (
        <div id="history-report-display" className="space-y-4 animate-in fade-in duration-500 pt-4">
          <div className="mb-4 flex flex-col md:flex-row justify-between items-start md:items-end border-b border-foreground/10 pb-4 gap-4">
            <div>
              <span className="font-mono text-xs text-[#0055FF] mb-2 uppercase tracking-[0.2em] block">
                ◆ PAST REPORT
              </span>
              <h2 className="font-display text-xl font-black uppercase leading-none text-black">
                Report for: {selectedHistoricalScan.business_name}
              </h2>
            </div>
            <button
              onClick={() => setSelectedHistoricalScan(null)}
              className="font-mono text-[10px] text-primary hover:text-rose-600 uppercase font-bold cursor-pointer border border-foreground/10 px-4 py-2 bg-white rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)] transition-all"
            >
              [CLOSE]
            </button>
          </div>

          <ResultsDashboard
            overallScore={selectedHistoricalScan.overall_score || 0}
            summary={selectedHistoricalScan.summary || { green: 0, yellow: 0, red: 0 }}
            recommendations={selectedHistoricalScan.recommendations || []}
            details={{
              business_name: selectedHistoricalScan.business_name,
              domain: selectedHistoricalScan.business_domain,
              industry: selectedHistoricalScan.business_industry,
              primary_city: selectedHistoricalScan.business_city,
              primary_state: selectedHistoricalScan.business_state,
              country: selectedHistoricalScan.business_country || "",
              service_focuses: selectedHistoricalScan.business_service_focuses || [],
              is_virtual: selectedHistoricalScan.is_virtual ?? false,
            }}
            providerResults={selectedHistoricalScan.results || []}
            scanId={selectedHistoricalScan.id}
            isScanning={false}
          />
        </div>
      )}

    </div>
  );
}
