"use client";

import type { ScanResult, Scan } from "@/lib/api/types";
import { deleteScanResult, saveScanResult } from "@/app/admin/actions";
import { useAdminRefresh } from "@/lib/admin/refresh";
import { useSyncProp } from "@/lib/admin/sync-props";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { AdminFooter } from "@/components/admin/AdminFooter";
import { useAdminConsole } from "@/components/admin/useAdminConsole";

import React, { useEffect, useState } from "react";

interface ResultsClientProps {
  initialScanResults: ScanResult[];
  initialScans: Scan[];
}

export function ResultsClient({
  initialScanResults,
  initialScans,
}: ResultsClientProps) {
  const [results, setResults] = useState<ScanResult[]>(initialScanResults);
  const [scans, setScans] = useState<Scan[]>(initialScans);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedResultIds, setExpandedResultIds] = useState<Record<string, boolean>>({});
  
  // Pagination & Filtering
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [filterProvider, setFilterProvider] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingResult, setEditingResult] = useState<ScanResult | null>(null);

  // Form Fields
  const [formScanId, setFormScanId] = useState("");
  const [formProvider, setFormProvider] = useState("gemini");
  const [formStatus, setFormStatus] = useState("green");
  const [formScore, setFormScore] = useState("");
  const [formRank, setFormRank] = useState("");
  const [formMentioned, setFormMentioned] = useState(false);
  const [formActionable, setFormActionable] = useState(false);
  const [formDomainMatch, setFormDomainMatch] = useState(false);
  const [formReason, setFormReason] = useState("");
  const [formError, setFormError] = useState("");

  const { consoleLogs, consoleContainerRef, addLog } = useAdminConsole();
  const { refresh, pending } = useAdminRefresh();

  useSyncProp(initialScanResults, setResults);
  useSyncProp(initialScans, setScans);

  useEffect(() => {
    addLog("LOAD: Data supplied by server (cached).");
  }, []);

  const handleOpenCreateModal = () => {
    setEditingResult(null);
    setFormScanId(scans[0]?.id || "");
    setFormProvider("gemini");
    setFormStatus("green");
    setFormScore("");
    setFormRank("");
    setFormMentioned(false);
    setFormActionable(false);
    setFormDomainMatch(false);
    setFormReason("");
    setFormError("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (res: ScanResult) => {
    setEditingResult(res);
    setFormScanId(res.scan_id);
    setFormProvider(res.provider);
    setFormStatus(res.status);
    setFormScore(res.score !== null ? String(res.score) : "");
    setFormRank(res.rank_position !== null ? String(res.rank_position) : "");
    setFormMentioned(res.mentioned);
    setFormActionable(res.actionable);
    setFormDomainMatch(res.domain_match);
    setFormReason(res.reason || "");
    setFormError(res.error || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formScanId || !formProvider) {
      addLog("[WARNING] SAVE: Scan Target and AI Provider are required.");
      return;
    }

    const isCreate = !editingResult;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} AI engine result...`);

    const scoreNum = formScore !== "" ? Number(formScore) : null;
    const rankNum = formRank !== "" ? Number(formRank) : null;

    try {
      await saveScanResult({
        isCreate,
        id: editingResult?.id,
        scan_id: formScanId,
        provider: formProvider,
        model: editingResult?.model ?? null,
        display_name: editingResult?.display_name ?? null,
        status: formStatus,
        score: scoreNum,
        rank_position: rankNum,
        mentioned: formMentioned,
        actionable: formActionable,
        domain_match: formDomainMatch,
        reason: formReason || null,
        error: formError || null,
      });
      addLog(`[SUCCESS] SAVE: Scan result successfully saved.`);
      setIsModalOpen(false);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] SAVE: ${err instanceof Error ? err.message : "Save failed"}`);
    }
  };

  const handleDelete = async (id: string, provider: string) => {
    if (!confirm(`Are you sure you want to delete this raw ${provider} result?`)) return;

    addLog(`DELETE: Deleting scan result [${id}]...`);

    try {
      await deleteScanResult(id);
      addLog(`[SUCCESS] DELETE: Scan result [${id}] successfully deleted.`);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] DELETE: ${err instanceof Error ? err.message : "Delete failed"}`);
    }
  };

  const filteredResults = results.filter((r) => {
    const matchesProvider = filterProvider ? r.provider === filterProvider : true;
    const matchesStatus = filterStatus ? r.status === filterStatus : true;
    return matchesProvider && matchesStatus;
  });

  const paginatedResults = filteredResults.slice(offset, offset + limit);
  const isCreate = !editingResult;

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {/* Header Section */}
          <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                AI ENGINE RESULTS
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Scan Results Directory
              </h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all"
            >
              [+] Add Scan Result
            </button>
          </div>

          {/* Filters & Search */}
          <div className="border border-foreground/10 bg-background p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Filter By AI Search Model</label>
              <select
                value={filterProvider}
                onChange={(e) => { setFilterProvider(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              >
                <option value="">All AI Models</option>
                <option value="gemini">Google Gemini</option>
                <option value="perplexity">Perplexity AI</option>
                <option value="groq">Groq (Llama)</option>
                <option value="deepseek">DeepSeek AI</option>
                <option value="mistral">Mistral AI</option>
              </select>
            </div>
            <div className="w-full md:w-1/2">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Filter By Scan Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              >
                <option value="">All Statuses</option>
                <option value="green">Green (Optimal)</option>
                <option value="yellow">Yellow (Warning)</option>
                <option value="red">Red (Critical)</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block">
                ● Loading citation metrics...
              </span>
            </div>
          ) : paginatedResults.length === 0 ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs text-text-muted uppercase block">
                No matching scan results found.
              </span>
            </div>
          ) : (
            <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
              <table className="w-full border-collapse font-sans text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                    <th className="p-4 font-bold">Result ID</th>
                    <th className="p-4 font-bold">AI Provider</th>
                    <th className="p-4 font-bold">Score</th>
                    <th className="p-4 font-bold">Metrics</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Scan ID</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedResults.map((r) => {
                    let parsedPrompts: any[] = [];
                    if (r.raw_response) {
                      try {
                        parsedPrompts = JSON.parse(r.raw_response);
                      } catch (e) {
                        console.error(e);
                      }
                    }

                    return (
                      <React.Fragment key={r.id}>
                        <tr className="border-b border-foreground/5 hover:bg-surface-container-lowest">
                          <td className="p-4 font-mono text-foreground/60">{r.id.slice(0, 8)}...</td>
                          <td className="p-4 font-bold text-foreground uppercase">
                            {r.display_name || r.provider}
                            {r.model && !r.display_name && (
                              <span className="block font-mono text-[9px] text-text-muted lowercase tracking-tighter normal-case font-medium mt-1 select-all bg-foreground/5 px-1.5 py-0.5 rounded border border-foreground/5 max-w-[140px] truncate">
                                {r.model.replace(/^openrouter\//, "").replace(/^openrouter_/, "")}
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono">
                            {r.score !== null ? `${r.score} / 100` : "N/A"}
                            {r.rank_position !== null && (
                              <span className="ml-2 font-mono text-[10px] bg-foreground/5 text-text-muted px-1.5 py-0.5 border border-foreground/10 font-bold">
                                Rank #{r.rank_position}
                              </span>
                            )}
                          </td>
                          <td className="p-4 font-mono text-foreground/75">
                            <div className="flex gap-2">
                              <span className={r.mentioned ? "text-emerald-600 font-bold" : "text-text-muted"}>[Mention: {r.mentioned ? "Yes" : "No"}]</span>
                              <span className={r.domain_match ? "text-emerald-600 font-bold" : "text-text-muted"}>[Domain Match: {r.domain_match ? "Yes" : "No"}]</span>
                              <span className={r.actionable ? "text-primary font-bold" : "text-text-muted"}>[Actionable: {r.actionable ? "Yes" : "No"}]</span>
                            </div>
                          </td>
                          <td className="p-4 font-mono">
                            <span className={`px-2 py-0.5 font-bold uppercase ${
                              r.status === "green" ? "bg-emerald-600/10 text-emerald-600 border border-emerald-600/20" :
                              r.status === "yellow" ? "bg-amber-600/10 text-amber-600 border border-amber-600/20" :
                              "bg-rose-600/10 text-rose-600 border border-rose-600/20"
                            }`}>
                              {r.status}
                            </span>
                          </td>
                          <td className="p-4 font-mono text-foreground/60">{r.scan_id.slice(0, 8)}...</td>
                          <td className="p-4 text-right flex justify-end gap-3">
                            <button
                              onClick={() => setExpandedResultIds(prev => ({ ...prev, [r.id]: !prev[r.id] }))}
                              className="font-mono text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1 uppercase font-bold transition-all"
                            >
                              {expandedResultIds[r.id] ? "[Hide]" : "[Inspect]"}
                            </button>
                            <button
                              onClick={() => handleOpenEditModal(r)}
                              className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                            >
                              [Edit]
                            </button>
                            <button
                              onClick={() => handleDelete(r.id, r.provider)}
                              className="font-mono text-[10px] border border-rose-600/30 hover:border-rose-600 text-rose-600 px-3 py-1 uppercase font-bold transition-all"
                            >
                              [Delete]
                            </button>
                          </td>
                        </tr>
                        {expandedResultIds[r.id] && (
                          <tr className="bg-[#FAF9F6] border-b border-foreground/10 animate-in fade-in duration-200">
                            <td colSpan={7} className="p-6">
                              <div className="border border-foreground/10 bg-background p-6 space-y-4">
                                <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest block mb-2">
                                  ◆ Parsed Prompt Outcomes ({parsedPrompts.length} scenarios)
                                </span>
                                
                                {parsedPrompts.length > 0 ? (
                                  <div className="overflow-x-auto">
                                    <table className="w-full text-xs text-left border-collapse">
                                      <thead>
                                        <tr className="border-b border-foreground/10 font-mono text-[9px] text-text-muted uppercase">
                                          <th className="pb-2 w-[30%]">Prompt Statement</th>
                                          <th className="pb-2 text-center">Mentioned</th>
                                          <th className="pb-2 text-center">Rank</th>
                                          <th className="pb-2 text-center">Web Match</th>
                                          <th className="pb-2 text-center">Actionable</th>
                                          <th className="pb-2">Competitors Cited</th>
                                          <th className="pb-2 w-[25%]">AI Reasoning</th>
                                        </tr>
                                      </thead>
                                      <tbody>
                                        {parsedPrompts.map((p: any, pIdx: number) => (
                                          <tr key={pIdx} className="border-b border-foreground/5 py-2 hover:bg-surface-container-lowest transition-all">
                                            <td className="py-2.5 font-mono text-[10px] pr-2 text-foreground font-semibold">{p.prompt}</td>
                                            <td className="py-2.5 text-center">
                                              <span className={`px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                                p.mentioned ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                              }`}>
                                                {p.mentioned ? "YES" : "NO"}
                                              </span>
                                            </td>
                                            <td className="py-2.5 text-center font-mono font-bold">
                                              {p.rank_position != null ? `#${p.rank_position}` : "-"}
                                            </td>
                                            <td className="py-2.5 text-center">
                                              <span className={`px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                                p.domain_match ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                              }`}>
                                                {p.domain_match ? "YES" : "NO"}
                                              </span>
                                            </td>
                                            <td className="py-2.5 text-center">
                                              <span className={`px-1.5 py-0.5 font-mono text-[9px] font-bold ${
                                                p.actionable ? "bg-primary/10 text-primary border border-primary/20" : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                                              }`}>
                                                {p.actionable ? "YES" : "NO"}
                                              </span>
                                            </td>
                                            <td className="py-2.5 font-mono text-[10px] text-text-muted">
                                              {p.competitors && p.competitors.length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                  {p.competitors.map((comp: string, cIdx: number) => (
                                                    <span key={cIdx} className="bg-foreground/5 border border-foreground/10 px-1 py-0.5 text-foreground uppercase text-[9px]">
                                                      {comp}
                                                    </span>
                                                  ))}
                                                </div>
                                              ) : "-"}
                                            </td>
                                            <td className="py-2.5 font-sans text-[11px] leading-relaxed text-text-muted pr-2">{p.reason || p.reasoning || "-"}</td>
                                          </tr>
                                        ))}
                                      </tbody>
                                    </table>
                                  </div>
                                ) : (
                                  <span className="font-mono text-xs text-text-muted italic">No raw prompt details mapped in response payload.</span>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredResults.length > limit && (
            <div className="flex justify-between items-center mb-12">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [← Previous]
              </button>
              <span className="font-mono text-xs text-text-muted uppercase">
                SHOWING {offset + 1}-{Math.min(offset + limit, filteredResults.length)} OF {filteredResults.length}
              </span>
              <button
                disabled={offset + limit >= filteredResults.length}
                onClick={() => setOffset(offset + limit)}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [Next →]
              </button>
            </div>
          )}

        {/* ═══════════════════════ MODAL CONTAINER ═══════════════════════ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-xl border border-foreground bg-background p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 font-mono text-xs hover:text-primary uppercase font-bold"
              >
                [Close X]
              </button>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight mb-6 text-foreground border-b border-foreground/10 pb-2">
                {editingResult ? "Edit Scan Result" : "Add Scan Result"}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                {isCreate ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Select Scan Target</label>
                      <select
                        value={formScanId}
                        onChange={(e) => setFormScanId(e.target.value)}
                        className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                      >
                        {scans.map((scan) => (
                          <option key={scan.id} value={scan.id}>
                            {scan.business_name} ({scan.id.slice(0, 8)})
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">AI Provider</label>
                      <select
                        value={formProvider}
                        onChange={(e) => setFormProvider(e.target.value)}
                        className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                      >
                        <option value="gemini">gemini</option>
                        <option value="perplexity">perplexity</option>
                        <option value="groq">groq</option>
                        <option value="deepseek">deepseek</option>
                        <option value="mistral">mistral</option>
                      </select>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 bg-surface-container-low border border-foreground/10 p-3 font-mono text-xs">
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">Scan Target</span>
                      <span className="text-foreground uppercase block truncate max-w-full">
                        {scans.find(s => s.id === formScanId)?.business_name || formScanId.slice(0, 8)}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">AI Provider</span>
                      <span className="text-foreground uppercase font-bold block">{formProvider}</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-text-muted uppercase font-bold block mb-0.5">AI Search Model</span>
                      <span className="text-foreground uppercase font-bold block truncate max-w-full" title={editingResult?.display_name || "N/A"}>
                        {editingResult?.display_name || editingResult?.provider || "N/A"}
                      </span>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Status</label>
                    <select
                      value={formStatus}
                      onChange={(e) => setFormStatus(e.target.value)}
                      className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    >
                      <option value="green">green</option>
                      <option value="yellow">yellow</option>
                      <option value="red">red</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Score (0-100)</label>
                    <input
                      type="number"
                      value={formScore}
                      onChange={(e) => setFormScore(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                      min={0}
                      max={100}
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Rank Position</label>
                    <input
                      type="number"
                      value={formRank}
                      onChange={(e) => setFormRank(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                      min={1}
                      max={100}
                    />
                  </div>
                </div>

                {/* Boolean Checklist */}
                <div className="bg-surface-container-low border border-foreground/10 p-4 space-y-3">
                  <span className="font-mono text-[10px] text-text-muted uppercase font-bold block mb-1">Citation Metrics</span>
                  <div className="flex flex-wrap gap-6">
                    <label className="flex items-center gap-2 font-mono text-xs text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formMentioned}
                        onChange={(e) => setFormMentioned(e.target.checked)}
                        className="cursor-pointer"
                      />
                      Brand Mentioned
                    </label>

                    <label className="flex items-center gap-2 font-mono text-xs text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formDomainMatch}
                        onChange={(e) => setFormDomainMatch(e.target.checked)}
                        className="cursor-pointer"
                      />
                      Domain URL Match
                    </label>

                    <label className="flex items-center gap-2 font-mono text-xs text-foreground cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={formActionable}
                        onChange={(e) => setFormActionable(e.target.checked)}
                        className="cursor-pointer"
                      />
                      Actionable Citation
                    </label>
                  </div>
                </div>

                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Reason / Citation Details</label>
                  <input
                    type="text"
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value)}
                    className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    placeholder="e.g. Present in first organic snippet"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Error Message (If failed)</label>
                  <input
                    type="text"
                    value={formError}
                    onChange={(e) => setFormError(e.target.value)}
                    className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground text-rose-600"
                    placeholder="e.g. API Gateway Timeout"
                  />
                </div>

                <div className="pt-4 border-t border-foreground/10 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="font-mono text-xs border border-foreground/20 px-4 py-2.5 uppercase font-bold hover:border-foreground"
                  >
                    [Cancel]
                  </button>
                  <button
                    type="submit"
                    className="font-mono text-xs bg-primary text-white px-6 py-2.5 uppercase font-bold hover:bg-primary-hover"
                  >
                    Save Scan Result
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>

      <AdminConsole logs={consoleLogs} containerRef={consoleContainerRef} />
      <AdminFooter />
    </>
  );
}
