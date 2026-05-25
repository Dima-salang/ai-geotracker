"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

interface Team {
  id: string;
  name: string;
  leader_id: string | null;
  created_at: string;
}

interface User {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: string;
  team_id: string | null;
}

export default function TeamCRUD() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Pagination & Filtering
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  // Form fields
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formLeaderId, setFormLeaderId] = useState("");

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

  const loadData = async () => {
    setLoading(true);
    addLog("LOAD: Fetching teams & users lists...");
    try {
      // Load teams
      const teamResponse = await fetch(`${BACKEND_URL}/api/v1/teams?limit=100`);
      if (!teamResponse.ok) throw new Error("Failed to load teams");
      const teamData = await teamResponse.json();
      setTeams(teamData);

      // Load users to select leader/assign
      const userResponse = await fetch(`${BACKEND_URL}/api/v1/users?limit=100`);
      if (!userResponse.ok) throw new Error("Failed to load users");
      const userData = await userResponse.json();
      setUsers(userData);

      addLog(`LOAD_SUCCESS: Synchronized ${teamData.length} teams and ${userData.length} users.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load teams administration directory.");
      addLog(`[ERROR] LOAD_FAIL: Unable to sync teams database. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingTeam(null);
    setFormId(crypto.randomUUID());
    setFormName("");
    setFormLeaderId("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (team: Team) => {
    setEditingTeam(team);
    setFormId(team.id);
    setFormName(team.name);
    setFormLeaderId(team.leader_id || "");
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      addLog("[WARN] SAVE_BLOCKED: Team name is required.");
      return;
    }

    const payload = {
      name: formName,
      leader_id: formLeaderId || null,
    };

    const isCreate = !editingTeam;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} team [${formName}]...`);

    try {
      const url = isCreate
        ? `${BACKEND_URL}/api/v1/teams`
        : `${BACKEND_URL}/api/v1/teams/${formId}`;
      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Database write failed");
      }

      addLog(`[SUCCESS] SYNC: Team [${formName}] successfully saved.`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] SYNC_FAIL: Save failed: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete team '${name}'? This will nullify all member links.`)) return;

    addLog(`DELETE: Removing team [${name}]...`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/teams/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Delete operation failed");
      }
      addLog(`[SUCCESS] DELETE: Team [${name}] successfully deleted.`);
      loadData();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] DELETE_FAIL: Delete failed: ${err.message}`);
    }
  };

  // Filtering
  const filteredTeams = teams.filter((t) =>
    t.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedTeams = filteredTeams.slice(offset, offset + limit);

  // Eligible leaders are user role agent or team_leader or admin
  const eligibleLeaders = users.filter((u) =>
    ["agent", "team_leader", "admin"].includes(u.role)
  );

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
            Operator Settings / Teams
          </span>
        </div>
        <Link
          href="/admin"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
        >
          [← RETURN TO PORTAL]
        </Link>
      </nav>

      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {/* Header Section */}
          <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                ADMINISTRATION & GROUPS
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Franchise Teams
              </h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all"
            >
              [+] Register New Team
            </button>
          </div>

          {/* Filters & Search */}
          <div className="border border-foreground/10 bg-background p-4 mb-6">
            <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Search Team Name</label>
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }}
              className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
            />
          </div>

          {/* Teams Table */}
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block">
                ● FETCHING TEAMS DIRECTORY...
              </span>
            </div>
          ) : paginatedTeams.length === 0 ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs text-text-muted uppercase block">
                No matching franchise teams found in database.
              </span>
            </div>
          ) : (
            <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
              <table className="w-full border-collapse font-sans text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                    <th className="p-4 font-bold">Team Name</th>
                    <th className="p-4 font-bold">Team Leader</th>
                    <th className="p-4 font-bold">Member Count</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTeams.map((t) => {
                    const leader = users.find((u) => u.id === t.leader_id);
                    const members = users.filter((u) => u.team_id === t.id);
                    return (
                      <tr key={t.id} className="border-b border-foreground/5 hover:bg-surface-container-lowest">
                        <td className="p-4 font-bold text-foreground">{t.name}</td>
                        <td className="p-4 font-mono text-foreground/80">
                          {leader ? (
                            <span className="font-bold text-foreground">
                              {leader.first_name || leader.last_name ? `${leader.first_name || ""} ${leader.last_name || ""}` : "Unnamed"} ({leader.email})
                            </span>
                          ) : (
                            <span className="text-text-muted">None Assigned</span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-foreground/60">{members.length} Agents</td>
                        <td className="p-4 text-right flex justify-end gap-3">
                          <button
                            onClick={() => handleOpenEditModal(t)}
                            className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Edit]
                          </button>
                          <button
                            onClick={() => handleDelete(t.id, t.name)}
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

          {/* Pagination Controls */}
          {filteredTeams.length > limit && (
            <div className="flex justify-between items-center mb-12">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [← Previous]
              </button>
              <span className="font-mono text-xs text-text-muted uppercase">
                SHOWING {offset + 1}-{Math.min(offset + limit, filteredTeams.length)} OF {filteredTeams.length}
              </span>
              <button
                disabled={offset + limit >= filteredTeams.length}
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
            <div className="w-full max-w-xl border border-foreground bg-background p-6 md:p-8 relative">
              <button
                onClick={() => setIsModalOpen(false)}
                className="absolute top-4 right-4 font-mono text-xs hover:text-primary uppercase font-bold"
              >
                [Close X]
              </button>
              <h2 className="font-display text-2xl font-black uppercase tracking-tight mb-6 text-foreground border-b border-foreground/10 pb-2">
                {editingTeam ? "Edit Franchise Team" : "Register New Team"}
              </h2>

              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Team ID (ReadOnly UUID)</label>
                  <input
                    type="text"
                    value={formId}
                    readOnly
                    className="w-full bg-surface-container-low border border-foreground/10 font-mono text-xs px-3 py-2 text-foreground/50 select-none"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Team Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                  />
                </div>

                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Assign Team Leader</label>
                  <select
                    value={formLeaderId}
                    onChange={(e) => setFormLeaderId(e.target.value)}
                    className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                  >
                    <option value="">NO LEADER ASSIGNED</option>
                    {eligibleLeaders.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}` : "Unnamed"} ({u.email} - {u.role})
                      </option>
                    ))}
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
                    SAVE_TEAM_DATA
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

            <div
              ref={consoleContainerRef}
              className="font-mono text-[10px] p-4 bg-background text-foreground border border-foreground/10 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none"
            >
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
            ©2024 GeoTracker Admin
          </div>
        </footer>
      </main>
    </>
  );
}
