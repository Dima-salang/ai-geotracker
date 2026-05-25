"use client";

import React, { useState, useEffect, useRef } from "react";

interface Lead {
  id: string;
  business_id: string;
  business_name?: string;
  business_domain?: string;
  team_id: string | null;
  assigned_agent_id: string | null;
  agent_name?: string | null;
  visibility_score: number;
  status: string;
  created_at: string;
}

interface TeamAgent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
}

interface LeadsTabProps {
  authToken: string | null;
  userRole: string;
}

export default function LeadsTab({ authToken, userRole }: LeadsTabProps) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [teamAgents, setTeamAgents] = useState<TeamAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [updatingLeadId, setUpdatingLeadId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [agentAssigningId, setAgentAssigningId] = useState<string | null>(null);
  
  // Note Log state for lead followups (stored in client-side localStorage to simulate CRM notes logs)
  const [leadNotes, setLeadNotes] = useState<Record<string, string>>({});
  const [currentNote, setCurrentNote] = useState("");

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchLeads = async () => {
    if (!authToken) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads`, {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (!res.ok) {
        throw new Error("Unable to retrieve team leads directory.");
      }
      const data = await res.json();
      setLeads(data);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load leads.");
    } finally {
      setLoading(false);
    }
  };

  const fetchTeamAgents = async () => {
    if (!authToken || userRole !== "team_leader") return;
    try {
      // Load all users to filter team members
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (res.ok) {
        const users: TeamAgent[] = await res.json();
        // Keep only users who are agents (or team leaders)
        setTeamAgents(users.filter(u => ["agent"].includes(u.role)));
      }
    } catch (err) {
      console.error("Failed to fetch team agents:", err);
    }
  };

  useEffect(() => {
    if (authToken) {
      fetchLeads();
      fetchTeamAgents();
    }
    // Load notes logs from localStorage
    const saved = localStorage.getItem("geotracker_lead_notes");
    if (saved) {
      try {
        setLeadNotes(JSON.parse(saved));
      } catch (e) {
        console.error(e);
      }
    }
  }, [authToken, userRole]);

  const handleUpdateStatus = async (leadId: string, newStatus: string) => {
    if (!authToken) return;
    setUpdatingLeadId(leadId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${leadId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          status: newStatus
        })
      });
      if (!res.ok) throw new Error("Failed to update status.");
      
      // Update local state
      setLeads(prev => prev.map(l => l.id === leadId ? { ...l, status: newStatus } : l));
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, status: newStatus } : null);
      }
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setUpdatingLeadId(null);
    }
  };

  const handleAssignAgent = async (leadId: string, agentId: string) => {
    if (!authToken) return;
    setAgentAssigningId(leadId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${leadId}/assign?agent_id=${agentId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (!res.ok) throw new Error("Failed to assign agent.");
      const updatedLead = await res.json();
      
      // Refresh leads list
      fetchLeads();
      if (selectedLead && selectedLead.id === leadId) {
        setSelectedLead(prev => prev ? { ...prev, assigned_agent_id: agentId, status: "assigned" } : null);
      }
      alert("Lead successfully assigned to agent.");
    } catch (err: any) {
      alert("Error: " + err.message);
    } finally {
      setAgentAssigningId(null);
    }
  };

  const handleSaveNote = () => {
    if (!selectedLead || !currentNote.trim()) return;
    const nextNotes = {
      ...leadNotes,
      [selectedLead.id]: currentNote.trim()
    };
    setLeadNotes(nextNotes);
    localStorage.setItem("geotracker_lead_notes", JSON.stringify(nextNotes));
    setCurrentNote("");
  };

  if (loading) {
    return (
      <div className="py-12 text-center border border-foreground/10 bg-[#FAF9F6]">
        <span className="font-mono text-xs text-primary tracking-widest uppercase animate-pulse font-bold block mb-2">
          ◆ FETCHING LEAD PIPELINE DATA...
        </span>
        <p className="font-sans text-[11px] text-text-muted">Resolving franchise boundaries.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tab Header */}
      <div className="border-b border-foreground/10 pb-4 flex justify-between items-end">
        <div>
          <span className="font-mono text-[9px] text-primary tracking-widest uppercase block mb-1 font-bold">
            Franchise sales workflow
          </span>
          <h2 className="font-display text-2xl font-black uppercase text-black">
            Team Leads Directory ({leads.length})
          </h2>
        </div>
        <button
          onClick={fetchLeads}
          className="font-mono text-[10px] border border-foreground/20 hover:border-foreground px-4 py-2 uppercase font-bold transition-all bg-white"
        >
          [ ↻ Refresh leads ]
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 border border-rose-600 bg-rose-600/5 text-rose-600 font-mono text-xs font-bold uppercase">
          [SYNC ERROR]: {errorMsg}
        </div>
      )}

      {leads.length === 0 ? (
        <div className="border border-dashed border-foreground/20 p-16 text-center bg-white">
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto text-text-muted mb-4">
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
          </svg>
          <span className="font-mono text-xs text-text-muted uppercase block font-bold">
            No pipeline leads assigned to your team.
          </span>
          <p className="font-sans text-[10px] text-text-muted mt-1">New deficit scans (&lt; 70 score) automatically distribute to this folder.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* LEFT — Leads List Bento */}
          <div className="lg:col-span-7 space-y-4">
            {leads.map((ld) => {
              const isSelected = selectedLead?.id === ld.id;
              const hasNotes = !!leadNotes[ld.id];
              return (
                <div
                  key={ld.id}
                  onClick={() => setSelectedLead(ld)}
                  className={`border p-5 transition-all select-none cursor-pointer flex justify-between items-center bg-white rounded-none ${
                    isSelected
                      ? "border-primary bg-primary/[0.01] shadow-[4px_4px_0px_0px_rgba(0,85,255,0.15)]"
                      : "border-foreground/10 hover:border-foreground/30 hover:bg-black/[0.005]"
                  }`}
                >
                  <div className="space-y-2 flex-grow pr-4">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[9px] text-[#666] tracking-tighter uppercase">
                        LEAD_{ld.id.slice(0, 8).toUpperCase()}
                      </span>
                      {hasNotes && (
                        <span className="font-mono text-[8px] bg-primary text-white px-1.5 font-bold uppercase">
                          NOTES_LOGGED
                        </span>
                      )}
                    </div>
                    <h3 className="font-display text-lg font-bold uppercase text-black leading-tight">
                      {ld.business_name || "Unresolved Storefront"}
                    </h3>
                    <div className="font-mono text-[10px] text-text-muted lowercase truncate max-w-sm">
                      {ld.business_domain}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 flex-shrink-0">
                    {/* Deficit Score Badge */}
                    <div className="text-right">
                      <span className="font-mono text-[9px] text-text-muted uppercase block mb-0.5">
                        Deficit
                      </span>
                      <span className={`font-mono text-[11px] font-black uppercase px-2 py-0.5 border ${
                        ld.visibility_score >= 80
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : ld.visibility_score >= 50
                          ? "bg-amber-500/10 text-amber-600 border-amber-500/20"
                          : "bg-rose-500/10 text-rose-600 border-rose-500/20"
                      }`}>
                        {ld.visibility_score}/100
                      </span>
                    </div>

                    {/* Status Badge */}
                    <span className={`font-mono text-[9px] px-2 py-1 uppercase font-bold border ${
                      ld.status === "converted"
                        ? "bg-emerald-600 text-white border-emerald-600"
                        : ld.status === "new"
                        ? "bg-rose-600 text-white border-rose-600 animate-pulse"
                        : "bg-zinc-100 text-black border-foreground/10"
                    }`}>
                      {ld.status}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* RIGHT — Active Lead CRM Panel */}
          <div className="lg:col-span-5">
            {selectedLead ? (
              <div className="border border-foreground bg-[#FAF9F6] p-6 space-y-6 shadow-[6px_6px_0px_0px_rgba(0,0,0,1)] relative">
                {/* Header metadata */}
                <div className="border-b border-foreground/10 pb-4 space-y-1">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-[8px] text-[#0055FF] font-black tracking-widest uppercase">
                      ◆ SECURE SALES DIRECTORY
                    </span>
                    <button
                      onClick={() => setSelectedLead(null)}
                      className="font-mono text-[9px] text-[#666] hover:text-black uppercase font-bold"
                    >
                      [ Close ✗ ]
                    </button>
                  </div>
                  <h3 className="font-display text-xl font-black uppercase text-black truncate" title={selectedLead.business_name}>
                    {selectedLead.business_name}
                  </h3>
                  <a
                    href={`https://${selectedLead.business_domain}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-[10px] text-primary hover:underline lowercase block"
                  >
                    visit website: {selectedLead.business_domain} ↗
                  </a>
                </div>

                {/* Lead Deficit Information */}
                <div className="grid grid-cols-2 gap-4 border border-foreground/10 bg-white p-4 font-mono text-[10px] leading-relaxed">
                  <div>
                    <span className="text-[#666] uppercase block">Visibility Score</span>
                    <span className="text-rose-600 font-bold text-sm block mt-0.5">{selectedLead.visibility_score} / 100</span>
                  </div>
                  <div>
                    <span className="text-[#666] uppercase block">Lead Status</span>
                    <span className="text-black font-bold uppercase block mt-0.5">{selectedLead.status}</span>
                  </div>
                  <div className="col-span-2 border-t border-foreground/5 pt-2 mt-2">
                    <span className="text-[#666] uppercase block">Distribution Date</span>
                    <span className="text-black font-bold block mt-0.5">
                      {new Date(selectedLead.created_at).toLocaleDateString()} at {new Date(selectedLead.created_at).toLocaleTimeString()}
                    </span>
                  </div>
                </div>

                {/* Pipeline Actions */}
                <div className="space-y-3">
                  <label className="font-mono text-[9px] text-primary uppercase block font-bold">
                    ◆ UPDATE PIPELINE STATUS
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {["new", "contacted", "converted", "lost"].map((st) => {
                      const isActive = selectedLead.status === st;
                      return (
                        <button
                          key={st}
                          disabled={updatingLeadId === selectedLead.id}
                          onClick={() => handleUpdateStatus(selectedLead.id, st)}
                          className={`font-mono text-[9px] py-2 uppercase font-black border transition-all cursor-pointer rounded-none ${
                            isActive
                              ? "bg-black text-white border-black"
                              : "bg-white text-black border-foreground/10 hover:bg-black/5"
                          }`}
                        >
                          {st}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Franchise Team Leader Assignment controls */}
                {userRole === "team_leader" && (
                  <div className="space-y-3 pt-4 border-t border-foreground/10">
                    <label className="font-mono text-[9px] text-primary uppercase block font-bold">
                      ◆ ASSIGN SALES REPRESENTATIVE
                    </label>
                    <div className="flex gap-2">
                      <select
                        disabled={agentAssigningId === selectedLead.id}
                        value={selectedLead.assigned_agent_id || ""}
                        onChange={(e) => handleAssignAgent(selectedLead.id, e.target.value)}
                        className="flex-1 font-mono text-xs border border-foreground/20 px-3 py-2 bg-white focus:outline-none focus:border-primary font-bold rounded-none"
                      >
                        <option value="">UNASSIGNED (LEADER OWNED)</option>
                        {teamAgents.map((ag) => (
                          <option key={ag.id} value={ag.id}>
                            {`${ag.first_name || ""} ${ag.last_name || ""}`.trim() || ag.email}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {/* Note logs */}
                <div className="space-y-3 pt-4 border-t border-foreground/10">
                  <label className="font-mono text-[9px] text-primary uppercase block font-bold">
                    ◆ CRITICAL INTERACTION LOG
                  </label>
                  {leadNotes[selectedLead.id] ? (
                    <div className="p-3 border border-[#eeeee9] bg-white font-sans text-xs text-black leading-relaxed select-text italic">
                      "{leadNotes[selectedLead.id]}"
                    </div>
                  ) : (
                    <span className="font-mono text-[9px] text-[#888] uppercase block">No CRM logs recorded for this lead storefront.</span>
                  )}

                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="ENTER NOTES (E.G. CONTACTED VIA EMAIL...)"
                      value={currentNote}
                      onChange={(e) => setCurrentNote(e.target.value)}
                      className="flex-1 font-mono text-[10px] border border-foreground/20 px-3 py-2 bg-white focus:outline-none focus:border-primary uppercase rounded-none"
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleSaveNote();
                      }}
                    />
                    <button
                      onClick={handleSaveNote}
                      disabled={!currentNote.trim()}
                      className="font-mono text-[10px] bg-primary text-white border border-primary px-4 py-2 hover:bg-primary-hover font-bold uppercase transition-all rounded-none cursor-pointer disabled:opacity-50"
                    >
                      LOG
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="border border-dashed border-foreground/20 p-16 text-center bg-white min-h-[300px] flex flex-col justify-center items-center">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-text-muted mb-4 animate-bounce">
                  <circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" />
                </svg>
                <span className="font-mono text-xs text-text-muted uppercase font-bold block">
                  Select a lead from the registry folder to review pipeline scorecards and log activity.
                </span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
