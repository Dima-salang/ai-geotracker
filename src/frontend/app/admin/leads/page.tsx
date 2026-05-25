"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

interface Lead {
  id: string;
  business_id: string;
  business_name?: string;
  business_domain?: string;
  team_id: string | null;
  team_name?: string | null;
  assigned_agent_id: string | null;
  agent_name?: string | null;
  visibility_score: number;
  status: string;
  created_at: string;
}

interface Business {
  id: string;
  name: string;
  domain: string;
}

interface Team {
  id: string;
  name: string;
}

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  role: string;
}

export default function LeadsCRUD() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [agents, setAgents] = useState<User[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pagination & Filtering
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | null>(null);
  
  // Form fields
  const [formBusinessId, setFormBusinessId] = useState("");
  const [formTeamId, setFormTeamId] = useState("");
  const [formAgentId, setFormAgentId] = useState("");
  const [formScore, setFormScore] = useState(0);
  const [formStatus, setFormStatus] = useState("new");
  
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleContainerRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [consoleLogs]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const loadDependencies = async () => {
    try {
      addLog("LOAD: Retrieving dropdown dependency indices...");
      const [bizRes, teamRes, userRes] = await Promise.all([
        fetch(`${BACKEND_URL}/api/v1/businesses?limit=100`),
        fetch(`${BACKEND_URL}/api/v1/teams?limit=100`),
        fetch(`${BACKEND_URL}/api/v1/users?limit=200`),
      ]);

      if (bizRes.ok && teamRes.ok && userRes.ok) {
        const bizData = await bizRes.json();
        const teamData = await teamRes.json();
        const userData = await userRes.json();

        setBusinesses(bizData);
        setTeams(teamData);
        setAgents(userData.filter((u: User) => ["agent", "team_leader", "admin"].includes(u.role)));
        
        addLog(`LOAD: Dependencies cached. Businesses:${bizData.length} Teams:${teamData.length} Agents:${userData.length}`);
      }
    } catch (err: any) {
      addLog(`[ERROR] DEPENDENCIES: Failed to cache dropdown options. ${err.message}`);
    }
  };

  const loadLeads = async () => {
    setLoading(true);
    addLog("LOAD: Loading sales leads from database...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/leads`);
      if (!response.ok) throw new Error("Failed to load leads");
      const rawLeads: Lead[] = await response.json();
      
      // Enriched lead records with cached dependencies for visual clarity
      const enriched = rawLeads.map((ld) => {
        const biz = businesses.find((b) => b.id === ld.business_id);
        const tm = teams.find((t) => t.id === ld.team_id);
        const ag = agents.find((a) => a.id === ld.assigned_agent_id);

        return {
          ...ld,
          business_name: biz ? biz.name : ld.business_name || "Unknown Storefront",
          business_domain: biz ? biz.domain : ld.business_domain || "",
          team_name: tm ? tm.name : ld.team_id ? "Unknown Team" : "Unassigned",
          agent_name: ag ? `${ag.first_name || ""} ${ag.last_name || ""}`.trim() || ag.email : ld.assigned_agent_id ? "Unknown Agent" : "Unassigned"
        };
      });

      setLeads(enriched);
      addLog(`LOAD: Successfully loaded ${enriched.length} lead profiles.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load leads directory.");
      addLog(`[ERROR] LOAD: Failed to load leads. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDependencies();
  }, []);

  // Reload leads once dependencies are populated
  useEffect(() => {
    if (businesses.length > 0 || teams.length > 0) {
      loadLeads();
    }
  }, [businesses, teams, agents]);

  const handleOpenCreateModal = () => {
    setEditingLead(null);
    setFormBusinessId(businesses.length > 0 ? businesses[0].id : "");
    setFormTeamId("");
    setFormAgentId("");
    setFormScore(50);
    setFormStatus("new");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (lead: Lead) => {
    setEditingLead(lead);
    setFormBusinessId(lead.business_id);
    setFormTeamId(lead.team_id || "");
    setFormAgentId(lead.assigned_agent_id || "");
    setFormScore(lead.visibility_score);
    setFormStatus(lead.status);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formBusinessId) {
      addLog("[WARNING] SAVE: Business entity target must be selected.");
      return;
    }

    const isCreate = !editingLead;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} sales lead...`);

    try {
      const url = isCreate 
        ? `${BACKEND_URL}/api/v1/leads`
        : `${BACKEND_URL}/api/v1/leads/${editingLead.id}`;
      const method = isCreate ? "POST" : "PUT";

      const payload = {
        business_id: formBusinessId,
        team_id: formTeamId ? formTeamId : null,
        assigned_agent_id: formAgentId ? formAgentId : null,
        visibility_score: Number(formScore),
        status: formStatus,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Database write failed");
      }

      const saved = await res.json();
      addLog(`[SUCCESS] SAVE: Lead ID [${saved.id.slice(0, 8)}] successfully saved.`);
      setIsModalOpen(false);
      loadLeads();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] SAVE: Failed to save lead: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this sales lead? All historical tracking for this lead will be cleared.")) return;

    addLog(`DELETE: Deleting lead [${id.slice(0, 8)}]...`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/leads/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Failed to delete lead");
      }
      addLog(`[SUCCESS] DELETE: Lead [${id.slice(0, 8)}] successfully deleted.`);
      loadLeads();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] DELETE: Failed to delete lead: ${err.message}`);
    }
  };

  const filteredLeads = leads.filter((l) => {
    const bizMatches = l.business_name?.toLowerCase().includes(searchTerm.toLowerCase()) || 
                       l.business_domain?.toLowerCase().includes(searchTerm.toLowerCase());
    const statusMatches = !statusFilter || l.status === statusFilter;
    return bizMatches && statusMatches;
  });

  const paginatedLeads = filteredLeads.slice(offset, offset + limit);

  return (
    <>
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav
        id="top-nav"
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border"
      >
        <div className="flex items-center gap-8">
          <Link href="/admin" className="font-display text-2xl font-bold tracking-tight text-foreground hover:text-primary transition-colors">
            GeoTracker
          </Link>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
            Admin / Sales Leads
          </span>
        </div>
        <Link
          href="/admin"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
        >
          [← Return to Admin Dashboard]
        </Link>
      </nav>

      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {/* Header Section */}
          <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                SALES PIPELINE
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Sales Leads Directory
              </h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all"
            >
              [+] Register Sales Lead
            </button>
          </div>

          {/* Search Filter Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border border-foreground/10 bg-background p-4 mb-6">
            <div>
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Search Storefront / Domain</label>
              <input
                type="text"
                placeholder="Search by business name or website..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }}
                className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              />
            </div>
            <div>
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Filter By Status</label>
              <select
                value={statusFilter}
                onChange={(e) => { setStatusFilter(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              >
                <option value="">ALL STATUSES</option>
                <option value="new">NEW (UNCLAIMED)</option>
                <option value="assigned">ASSIGNED</option>
                <option value="contacted">CONTACTED</option>
                <option value="converted">CONVERTED</option>
                <option value="lost">LOST</option>
              </select>
            </div>
          </div>

          {/* Leads List */}
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block">
                ● Loading database lead pipeline...
              </span>
            </div>
          ) : paginatedLeads.length === 0 ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs text-text-muted uppercase block">
                No matching sales leads found.
              </span>
            </div>
          ) : (
            <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
              <table className="w-full border-collapse font-sans text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                    <th className="p-4 font-bold">Lead ID</th>
                    <th className="p-4 font-bold">Business Target</th>
                    <th className="p-4 font-bold">Franchise Team</th>
                    <th className="p-4 font-bold">Assigned Agent</th>
                    <th className="p-4 font-bold text-center">Deficit Score</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((ld) => {
                    const isNew = ld.status === "new";
                    const isConverted = ld.status === "converted";
                    
                    return (
                      <tr key={ld.id} className="border-b border-foreground/5 hover:bg-surface-container-lowest">
                        <td className="p-4 font-mono text-foreground/80">{ld.id.slice(0, 8).toUpperCase()}</td>
                        <td className="p-4">
                          <div className="font-bold text-foreground uppercase">{ld.business_name}</div>
                          <div className="font-mono text-[10px] text-zinc-500 lowercase select-all">{ld.business_domain}</div>
                        </td>
                        <td className="p-4 font-mono text-foreground/80">{ld.team_name}</td>
                        <td className="p-4 text-foreground font-bold">{ld.agent_name}</td>
                        <td className="p-4 text-center">
                          <span className={`font-mono text-[10px] font-black uppercase px-2 py-0.5 ${
                            ld.visibility_score >= 80
                              ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                              : ld.visibility_score >= 50
                              ? "bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              : "bg-rose-500/10 text-rose-600 border border-rose-500/20"
                          }`}>
                            {ld.visibility_score} / 100
                          </span>
                        </td>
                        <td className="p-4 font-mono text-[9px] uppercase font-bold">
                          <span className={`px-2 py-0.5 border rounded-none ${
                            isConverted
                              ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20 animate-pulse"
                              : isNew
                              ? "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse font-black"
                              : "bg-blue-500/10 text-blue-600 border-blue-500/20"
                          }`}>
                            {ld.status}
                          </span>
                        </td>
                        <td className="p-4 text-right flex justify-end gap-3">
                          <button
                            onClick={() => handleOpenEditModal(ld)}
                            className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Edit]
                          </button>
                          <button
                            onClick={() => handleDelete(ld.id)}
                            className="font-mono text-[10px] border border-rose-600/30 hover:border-rose-600 text-rose-600 px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Delete]
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination */}
          {filteredLeads.length > limit && (
            <div className="flex justify-between items-center mb-12">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [← Previous]
              </button>
              <span className="font-mono text-xs text-text-muted uppercase">
                SHOWING {offset + 1}-{Math.min(offset + limit, filteredLeads.length)} OF {filteredLeads.length}
              </span>
              <button
                disabled={offset + limit >= filteredLeads.length}
                onClick={() => setOffset(offset + limit)}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [Next →]
              </button>
            </div>
          )}
        </div>

        {/* ═══════════════════════ MODAL CONTAINER ═══════════════════════ */}
        {isModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
            <div className="w-full max-w-md border border-foreground bg-background p-6 md:p-8 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 font-mono text-xs hover:text-primary uppercase font-bold"
              >
                [Close X]
              </button>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight mb-6 text-foreground border-b border-foreground/10 pb-2">
                {editingLead ? "Edit Sales Lead" : "Register Sales Lead"}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                {/* 1. Target Business selection (Disabled during edit) */}
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Audited Business Target</label>
                  <select
                    disabled={!!editingLead}
                    value={formBusinessId}
                    onChange={(e) => setFormBusinessId(e.target.value)}
                    className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground disabled:opacity-50"
                  >
                    {businesses.length === 0 && (
                      <option value="">NO BUSINESSES REGISTERED</option>
                    )}
                    {businesses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name.toUpperCase()} ({b.domain})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 2. Franchise Team selection */}
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Franchise Assignment Team</label>
                  <select
                    value={formTeamId}
                    onChange={(e) => setFormTeamId(e.target.value)}
                    className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                  >
                    <option value="">UNASSIGNED</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name.toUpperCase()}
                      </option>
                    ))}
                  </select>
                </div>

                {/* 3. Assigned Agent selection */}
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Assigned Sales Agent</label>
                  <select
                    value={formAgentId}
                    onChange={(e) => setFormAgentId(e.target.value)}
                    className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                  >
                    <option value="">UNASSIGNED</option>
                    {agents.map((a) => (
                      <option key={a.id} value={a.id}>
                        {`${a.first_name || ""} ${a.last_name || ""}`.trim() || a.email} ({a.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* 4. Visibility Score */}
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Visibility Deficit Score (0-100)</label>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    required
                    value={formScore}
                    onChange={(e) => setFormScore(Number(e.target.value))}
                    className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                  />
                </div>

                {/* 5. Pipeline Status */}
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Pipeline Lead Status</label>
                  <select
                    value={formStatus}
                    onChange={(e) => setFormStatus(e.target.value)}
                    className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                  >
                    <option value="new">NEW (UNCLAIMED)</option>
                    <option value="assigned">ASSIGNED</option>
                    <option value="contacted">CONTACTED</option>
                    <option value="converted">CONVERTED</option>
                    <option value="lost">LOST</option>
                  </select>
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
                    Save Sales Lead
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ═══════════════════════ CONSOLE TERMINAL PANEL ═══════════════════════ */}
        <section className="w-full border-t border-foreground/10 bg-foreground text-background py-6 px-6 md:px-10">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-3">
              <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 bg-primary"></span>
                Console & Sync Logs
              </span>
              <span className="font-mono text-[9px] text-text-muted uppercase">
                System Status: Secure
              </span>
            </div>

            <div ref={consoleContainerRef} className="font-mono text-[10px] p-4 bg-background text-foreground border border-foreground/10 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none">
              {consoleLogs.map((log, index) => (
                <div key={index} className="mb-1 border-b border-foreground/5 pb-0.5">
                  {log}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ═══════════════════════ FOOTER ═══════════════════════ */}
        <footer
          id="site-footer"
          className="w-full py-2 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center bg-surface-container-low border-t border-border h-16 gap-2"
        >
          <div className="font-mono text-xs font-bold text-foreground">
            GeoTracker Admin
          </div>
          <div className="font-mono text-[10px] uppercase text-text-muted">
            © 2024 GeoTracker Admin
          </div>
        </footer>
      </main>
    </>
  );
}
