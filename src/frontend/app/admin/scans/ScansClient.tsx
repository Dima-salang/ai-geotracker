"use client";

import type { Scan, Business } from "@/lib/api/types";
import { deleteScan, saveScan } from "@/app/admin/actions";
import { useAdminRefresh } from "@/lib/admin/refresh";
import { useSyncProp } from "@/lib/admin/sync-props";
import { AdminConsole } from "@/components/admin/AdminConsole";
import { AdminFooter } from "@/components/admin/AdminFooter";
import { useAdminConsole } from "@/components/admin/useAdminConsole";

import React from "react";
import { useEffect, useState } from "react";

interface ScansClientProps {
  initialScans: Scan[];
  initialBusinesses: Business[];
}

export function ScansClient({initialScans, initialBusinesses}: ScansClientProps) {
  const [scans, setScans] = useState<Scan[]>(initialScans);
  const [businesses, setBusinesses] = useState<Business[]>(initialBusinesses);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const [expandedScanIds, setExpandedScanIds] = useState<Record<string, boolean>>({});
  
  // Pagination & Filtering
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  // Modal States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingScan, setEditingScan] = useState<Scan | null>(null);

  // Form Fields
  const [formBizId, setFormBizId] = useState("");
  const [formScore, setFormScore] = useState("");
  const [formStatus, setFormStatus] = useState("pending");
  const [formSummaryJson, setFormSummaryJson] = useState("");
  const [formRecsJson, setFormRecsJson] = useState("");

  const { consoleLogs, consoleContainerRef, addLog } = useAdminConsole();
  const { refresh, pending } = useAdminRefresh();

  useSyncProp(initialScans, setScans);
  useSyncProp(initialBusinesses, setBusinesses);

  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  useEffect(() => {
    addLog("LOAD: Data supplied by server (cached).");
  }, []);

  const handleOpenCreateModal = () => {
    setEditingScan(null);
    setFormBizId(businesses[0]?.id || "");
    setFormScore("");
    setFormStatus("pending");
    setFormSummaryJson("{}");
    setFormRecsJson("[]");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (scan: Scan) => {
    setEditingScan(scan);
    setFormBizId(scan.business_id);
    setFormScore(scan.overall_score !== null ? String(scan.overall_score) : "");
    setFormStatus(scan.status);
    setFormSummaryJson(JSON.stringify(scan.summary || {}, null, 2));
    setFormRecsJson(JSON.stringify(scan.recommendations || [], null, 2));
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBizId) {
      addLog("[WARNING] SAVE: A valid business profile is required.");
      return;
    }

    // JSON parsing verification
    let parsedSummary = {};
    let parsedRecs = [];
    try {
      parsedSummary = JSON.parse(formSummaryJson || "{}");
    } catch (err: any) {
      addLog(`[WARNING] SAVE: Summary field contains invalid JSON: ${err.message}`);
      alert(`Invalid Summary JSON: ${err.message}`);
      return;
    }

    try {
      parsedRecs = JSON.parse(formRecsJson || "[]");
      if (!Array.isArray(parsedRecs)) {
        throw new Error("Recommendations must be a JSON array.");
      }
    } catch (err: any) {
      addLog(`[WARNING] SAVE: Recommendations field contains invalid JSON: ${err.message}`);
      alert(`Invalid Recommendations JSON: ${err.message}`);
      return;
    }

    const isCreate = !editingScan;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} visibility scan record...`);

    const scoreNum = formScore !== "" ? Number(formScore) : null;

    try {
      await saveScan({
        isCreate,
        id: editingScan?.id,
        business_id: formBizId,
        overall_score: scoreNum,
        status: formStatus,
        summary: parsedSummary,
        recommendations: parsedRecs,
      });
      addLog(`[SUCCESS] SAVE: Scan saved.`);
      setIsModalOpen(false);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] SAVE: ${err instanceof Error ? err.message : "Save failed"}`);
    }
  };

  const handleDelete = async (id: string, bizName: string) => {
    if (!confirm(`Are you sure you want to delete scan record for ${bizName}? This will delete all associated provider results.`)) return;

    addLog(`DELETE: Deleting scan record [${id}]...`);

    try {
      await deleteScan(id);
      addLog(`[SUCCESS] DELETE: Scan deleted.`);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] DELETE: ${err instanceof Error ? err.message : "Delete failed"}`);
    }
  };

  const filteredScans = scans.filter((s) => {
    const matchesSearch = 
      (s.business_name || "").toLowerCase().includes(searchTerm.toLowerCase()) || 
      (s.business_domain || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus ? s.status === filterStatus : true;
    return matchesSearch && matchesStatus;
  });

  const paginatedScans = filteredScans.slice(offset, offset + limit);
  const isCreate = !editingScan;

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {/* Header Section */}
          <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                SCANS HISTORY
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Scans Directory
              </h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all"
            >
              [+] Register Manual Scan
            </button>
          </div>

          {/* Filters & Search */}
          <div className="border border-foreground/10 bg-background p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Search business name or domain</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }}
                className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Scan Status</label>
              <select
                value={filterStatus}
                onChange={(e) => { setFilterStatus(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="complete">Complete</option>
                <option value="failed">Failed</option>
              </select>
            </div>
          </div>

          {/* Table */}
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block">
                ● Loading scans directory...
              </span>
            </div>
          ) : paginatedScans.length === 0 ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs text-text-muted uppercase block">
                No matching scan records found.
              </span>
            </div>
          ) : (
            <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
              <table className="w-full border-collapse font-sans text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                    <th className="p-4 font-bold">Scan ID</th>
                    <th className="p-4 font-bold">Business Target</th>
                    <th className="p-4 font-bold">Overall Score</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Created At</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedScans.map((s) => (
                    <React.Fragment key={s.id}>
                      <tr className="border-b border-foreground/5 hover:bg-surface-container-lowest">
                        <td className="p-4 font-mono text-foreground/80">{s.id}</td>
                        <td className="p-4 font-bold text-foreground">
                          <div>{s.business_name}</div>
                          <div className="font-mono text-[10px] text-text-muted normal-case font-normal mt-0.5">{s.business_domain}</div>
                        </td>
                        <td className="p-4 font-mono">
                          {s.overall_score !== null ? (
                            <span className={`px-2 py-0.5 font-bold ${
                              s.overall_score >= 80 ? "bg-emerald-600/10 text-emerald-600 border border-emerald-600/20" :
                              s.overall_score >= 50 ? "bg-amber-600/10 text-amber-600 border border-amber-600/20" :
                              "bg-rose-600/10 text-rose-600 border border-rose-600/20"
                            }`}>
                              {s.overall_score} / 100
                            </span>
                          ) : "N/A"}
                        </td>
                        <td className="p-4 font-mono">
                          <span className={`px-2 py-0.5 font-bold uppercase ${
                            s.status === "complete" ? "bg-emerald-600/10 text-emerald-600 border border-emerald-600/20" :
                            s.status === "pending" ? "bg-primary/10 text-primary border border-primary/20 animate-pulse" :
                            "bg-rose-600/10 text-rose-600 border border-rose-600/20"
                          }`}>
                            {s.status}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-foreground/60">{new Date(s.created_at).toLocaleString()}</td>
                        <td className="p-4 text-right flex justify-end gap-3">
                          <button
                            onClick={() => setExpandedScanIds(prev => ({ ...prev, [s.id]: !prev[s.id] }))}
                            className="font-mono text-[10px] bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-3 py-1 uppercase font-bold transition-all"
                          >
                            {expandedScanIds[s.id] ? "[Hide]" : "[Inspect]"}
                          </button>
                          <button
                            onClick={() => handleOpenEditModal(s)}
                            className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Edit]
                          </button>
                          <button
                            onClick={() => handleDelete(s.id, s.business_name || "scan")}
                            className="font-mono text-[10px] border border-rose-600/30 hover:border-rose-600 text-rose-600 px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Delete]
                          </button>
                        </td>
                      </tr>
                      {expandedScanIds[s.id] && (
                        <tr className="bg-[#FAF9F6] border-b border-foreground/10 animate-in fade-in duration-200">
                          <td colSpan={6} className="p-6">
                            <div className="border border-foreground/10 bg-background p-6 space-y-6">
                              {/* 1. Summary Metrics */}
                              <div>
                                <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest block mb-3">
                                  ◆ Consensual Summary Metrics
                                </span>
                                {s.summary ? (
                                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                                    <div className="border border-foreground/10 p-3 bg-[#FAF9F6] flex flex-col justify-center items-center text-center">
                                      <span className="font-mono text-[10px] text-emerald-600 font-bold block mb-1 uppercase">Optimal Engines</span>
                                      <span className="font-display text-2xl font-bold">{Number((s.summary as Record<string, number>)?.green ?? 0)}</span>
                                    </div>
                                    <div className="border border-foreground/10 p-3 bg-[#FAF9F6] flex flex-col justify-center items-center text-center">
                                      <span className="font-mono text-[10px] text-amber-600 font-bold block mb-1 uppercase">Warning Engines</span>
                                      <span className="font-display text-2xl font-bold">{Number((s.summary as Record<string, number>)?.yellow ?? 0)}</span>
                                    </div>
                                    <div className="border border-foreground/10 p-3 bg-[#FAF9F6] flex flex-col justify-center items-center text-center">
                                      <span className="font-mono text-[10px] text-rose-600 font-bold block mb-1 uppercase">Critical Deficit Engines</span>
                                      <span className="font-display text-2xl font-bold">{Number((s.summary as Record<string, number>)?.red ?? 0)}</span>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="font-sans text-xs text-text-muted italic">No summary statistics computed.</span>
                                )}
                              </div>

                              {/* 2. Recommendations */}
                              <div>
                                <span className="font-mono text-[10px] text-primary uppercase font-bold tracking-widest block mb-3">
                                  ◆ Actionable Strategy Blueprint ({s.recommendations?.length || 0} issues)
                                </span>
                                {s.recommendations && s.recommendations.length > 0 ? (
                                  <div className="space-y-3">
                                    {s.recommendations.map((rec: any, idx: number) => (
                                      <div key={idx} className="border border-foreground/5 bg-[#FAF9F6] p-4 flex gap-4">
                                        <div className="flex-shrink-0 animate-in fade-in duration-300">
                                          <span className={`font-mono text-[9px] font-bold px-2 py-0.5 text-white ${
                                            rec.severity === "high" ? "bg-rose-600" : rec.severity === "medium" ? "bg-amber-500" : "bg-slate-500"
                                          }`}>
                                            {rec.severity?.toUpperCase()}
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
                                  <span className="font-sans text-xs text-text-muted italic">No recommendations registered.</span>
                                )}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredScans.length > limit && (
            <div className="flex justify-between items-center mb-12">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [← Previous]
              </button>
              <span className="font-mono text-xs text-text-muted uppercase">
                SHOWING {offset + 1}-{Math.min(offset + limit, filteredScans.length)} OF {filteredScans.length}
              </span>
              <button
                disabled={offset + limit >= filteredScans.length}
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
            <div className="w-full max-w-2xl border border-foreground bg-background p-6 md:p-8 relative max-h-[90vh] overflow-y-auto">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 font-mono text-xs hover:text-primary uppercase font-bold"
              >
                [Close X]
              </button>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight mb-6 text-foreground border-b border-foreground/10 pb-2">
                {editingScan ? "Edit Visibility Scan Record" : "Register Manual Scan"}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                {isCreate ? (
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Select Business Target</label>
                    <select
                      value={formBizId}
                      onChange={(e) => setFormBizId(e.target.value)}
                      className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    >
                      {businesses.map((biz) => (
                        <option key={biz.id} value={biz.id}>{biz.name}</option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Overall Score (0-100)</label>
                        <input
                          type="number"
                          value={formScore}
                          onChange={(e) => setFormScore(e.target.value)}
                          className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                          min={0}
                          max={100}
                          placeholder="e.g. 75"
                        />
                      </div>
                      <div>
                        <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Audit Status</label>
                        <select
                          value={formStatus}
                          onChange={(e) => setFormStatus(e.target.value)}
                          className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                        >
                          <option value="pending">PENDING</option>
                          <option value="complete">COMPLETE</option>
                          <option value="failed">FAILED</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold">Summary Metrics (JSON)</label>
                      <textarea
                        rows={4}
                        value={formSummaryJson}
                        onChange={(e) => setFormSummaryJson(e.target.value)}
                        className="w-full bg-surface-container-low border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs p-3 text-foreground"
                        placeholder='{ "score": 85 }'
                      />
                    </div>

                    <div>
                      <label className="font-mono text-[10px] text-text-muted uppercase block mb-1.5 font-bold">Scan Recommendations (JSON Array)</label>
                      <textarea
                        rows={6}
                        value={formRecsJson}
                        onChange={(e) => setFormRecsJson(e.target.value)}
                        className="w-full bg-surface-container-low border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs p-3 text-foreground"
                        placeholder='[ { "issue": "No schema markup", "recommendation": "Add LocalBusiness schema" } ]'
                      />
                    </div>
                  </>
                )}

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
                    Save Scan Record
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
