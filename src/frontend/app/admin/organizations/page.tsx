"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

interface Organization {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function OrganizationCRUD() {
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pagination & Filtering
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<Organization | null>(null);
  
  // Form fields
  const [formName, setFormName] = useState("");
  
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const consoleEndRef = useRef<HTMLDivElement>(null);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setConsoleLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  useEffect(() => {
    if (consoleEndRef.current) {
      consoleEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [consoleLogs]);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const loadOrganizations = async () => {
    setLoading(true);
    addLog("LOAD: Loading organizations from database...");
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/organizations?limit=100`);
      if (!response.ok) throw new Error("Failed to load organizations");
      const data = await response.json();
      setOrganizations(data);
      addLog(`LOAD: Successfully loaded ${data.length} organization profiles.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load organizations directory.");
      addLog(`[ERROR] LOAD: Failed to load organizations. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadOrganizations();
  }, []);

  const handleOpenCreateModal = () => {
    setEditingOrg(null);
    setFormName("");
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: Organization) => {
    setEditingOrg(org);
    setFormName(org.name);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName) {
      addLog("[WARNING] SAVE: Name cannot be empty.");
      return;
    }

    const isCreate = !editingOrg;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} organization [${formName}]...`);

    try {
      const url = isCreate 
        ? `${BACKEND_URL}/api/v1/organizations`
        : `${BACKEND_URL}/api/v1/organizations/${editingOrg.id}`;
      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: formName }),
      });

      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Database write failed");
      }

      const saved = await res.json();
      addLog(`[SUCCESS] SAVE: Organization [${saved.name}] successfully saved.`);
      setIsModalOpen(false);
      loadOrganizations();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] SAVE: Failed to save organization: ${err.message}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (id === "00000000-0000-0000-0000-000000000000") {
      addLog("[PROTECTED] DELETE: Default Organization is protected and cannot be deleted.");
      return;
    }

    if (!confirm(`Are you sure you want to delete ${name}? All linked business locations and scans will be deleted.`)) return;

    addLog(`DELETE: Deleting organization [${name}]...`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/organizations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Failed to delete organization");
      }
      addLog(`[SUCCESS] DELETE: Organization [${name}] and all associated data successfully deleted.`);
      loadOrganizations();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] DELETE: Failed to delete organization: ${err.message}`);
    }
  };

  const filteredOrgs = organizations.filter((o) =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const paginatedOrgs = filteredOrgs.slice(offset, offset + limit);

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
            Admin / Organizations
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
                ORGANIZATIONS
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Organizations Directory
              </h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all"
            >
              [+] Create Organization
            </button>
          </div>

          {/* Search Filter */}
          <div className="border border-foreground/10 bg-background p-4 mb-6">
            <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Search Org Name</label>
            <input
              type="text"
              placeholder="Search by name..."
              value={searchTerm}
              onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }}
              className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
            />
          </div>

          {/* Organizations List */}
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block">
                ● Loading database records...
              </span>
            </div>
          ) : paginatedOrgs.length === 0 ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs text-text-muted uppercase block">
                No matching organization profiles found.
              </span>
            </div>
          ) : (
            <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
              <table className="w-full border-collapse font-sans text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                    <th className="p-4 font-bold">Organization ID</th>
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Created At</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedOrgs.map((org) => {
                    const isDefault = org.id === "00000000-0000-0000-0000-000000000000";
                    return (
                      <tr key={org.id} className="border-b border-foreground/5 hover:bg-surface-container-lowest">
                        <td className="p-4 font-mono text-foreground/80">{org.id}</td>
                        <td className="p-4 font-bold text-foreground">
                          {org.name}
                          {isDefault && (
                            <span className="ml-2 font-mono text-[9px] bg-primary/10 text-primary border border-primary/20 px-1 py-0.5 uppercase font-bold">
                              DEFAULT
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-foreground/60">{new Date(org.created_at).toLocaleDateString()}</td>
                        <td className="p-4 text-right flex justify-end gap-3">
                          <button
                            onClick={() => handleOpenEditModal(org)}
                            className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Edit]
                          </button>
                          <button
                            onClick={() => handleDelete(org.id, org.name)}
                            disabled={isDefault}
                            className={`font-mono text-[10px] border px-3 py-1 uppercase font-bold transition-all ${
                              isDefault 
                                ? "border-foreground/5 text-foreground/25 cursor-not-allowed" 
                                : "border-rose-600/30 hover:border-rose-600 text-rose-600"
                            }`}
                          >
                            {isDefault ? "[🔒 Protected]" : "[Delete]"}
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
          {filteredOrgs.length > limit && (
            <div className="flex justify-between items-center mb-12">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [← Previous]
              </button>
              <span className="font-mono text-xs text-text-muted uppercase">
                SHOWING {offset + 1}-{Math.min(offset + limit, filteredOrgs.length)} OF {filteredOrgs.length}
              </span>
              <button
                disabled={offset + limit >= filteredOrgs.length}
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
                {editingOrg ? "Edit Organization" : "Create Organization"}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Organization Name</label>
                  <input
                    type="text"
                    required
                    value={formName}
                    onChange={(e) => setFormName(e.target.value)}
                    className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    placeholder="e.g. Acme Corp"
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
                    Save Organization
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

            {/* Retro Blueprint Log Console */}
            <div className="font-mono text-[10px] p-4 bg-background text-foreground border border-foreground/10 h-32 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none">
              {consoleLogs.map((log, index) => (
                <div key={index} className="mb-1 border-b border-foreground/5 pb-0.5">
                  {log}
                </div>
              ))}
              <div ref={consoleEndRef}></div>
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
