"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

interface User {
  id: string;
  organization_id: string | null;
  role: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  email: string | null;
  auth_provider: string | null;
  tier: string;
  created_at: string;
  last_scan_at: string | null;
  team_id: string | null;
  is_verified: boolean;
}

interface Organization {
  id: string;
  name: string;
}

interface Team {
  id: string;
  name: string;
}

export default function UserCRUD() {
  const [users, setUsers] = useState<User[]>([]);
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  
  // Pagination & Filtering
  const [limit] = useState(10);
  const [offset, setOffset] = useState(0);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterTier, setFilterTier] = useState("");

  // Modal / Form States
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  
  // Form fields
  const [formId, setFormId] = useState("");
  const [formFirstName, setFormFirstName] = useState("");
  const [formLastName, setFormLastName] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formTier, setFormTier] = useState("free");
  const [formOrgId, setFormOrgId] = useState("");
  const [formRole, setFormRole] = useState("user");
  const [formTeamId, setFormTeamId] = useState("");
  const [formIsVerified, setFormIsVerified] = useState(true);
  
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
    addLog("LOAD: Fetching users, teams & organization directories...");
    try {
      // Load organizations for dropdown
      const orgResponse = await fetch(`${BACKEND_URL}/api/v1/organizations?limit=100`);
      if (!orgResponse.ok) throw new Error("Failed to load organizations");
      const orgData = await orgResponse.json();
      setOrganizations(orgData);

      // Load teams for dropdown
      const teamResponse = await fetch(`${BACKEND_URL}/api/v1/teams?limit=100`);
      if (!teamResponse.ok) throw new Error("Failed to load teams");
      const teamData = await teamResponse.json();
      setTeams(teamData);

      // Load users
      const userResponse = await fetch(`${BACKEND_URL}/api/v1/users?limit=100&offset=0`);
      if (!userResponse.ok) throw new Error("Failed to load users");
      const userData = await userResponse.json();
      setUsers(userData);

      addLog(`LOAD_SUCCESS: Loaded ${userData.length} users, ${teamData.length} teams, and ${orgData.length} organizations.`);
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to load users directory data.");
      addLog(`[ERROR] LOAD_FAIL: Unable to sync users. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);


  const handleOpenCreateModal = () => {
    setEditingUser(null);
    // Generate random UUID for new user
    setFormId(crypto.randomUUID());
    setFormFirstName("");
    setFormLastName("");
    setFormEmail("");
    setFormPhone("");
    setFormTier("free");
    setFormOrgId(organizations[0]?.id || "");
    setFormRole("user");
    setFormTeamId("");
    setFormIsVerified(true);
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (user: User) => {
    setEditingUser(user);
    setFormId(user.id);
    setFormFirstName(user.first_name || "");
    setFormLastName(user.last_name || "");
    setFormEmail(user.email || "");
    setFormPhone(user.phone || "");
    setFormTier(user.tier);
    setFormOrgId(user.organization_id || "");
    setFormRole(user.role || "user");
    setFormTeamId(user.team_id || "");
    setFormIsVerified(user.is_verified);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formEmail) {
      addLog("[WARN] SAVE_BLOCKED: Email is required.");
      return;
    }

    const payload = {
      id: formId,
      first_name: formFirstName || null,
      last_name: formLastName || null,
      email: formEmail,
      phone: formPhone || null,
      tier: formTier,
      organization_id: formOrgId || null,
      role: formRole,
      team_id: formTeamId || null,
      is_verified: formIsVerified,
    };

    const isCreate = !editingUser;
    addLog(`SAVE: Saving ${isCreate ? "new" : "updated"} user profile [${formEmail}]...`);

    try {
      const url = isCreate 
        ? `${BACKEND_URL}/api/v1/users`
        : `${BACKEND_URL}/api/v1/users/${formId}`;
      const method = isCreate ? "POST" : "PUT";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(isCreate ? payload : {
          first_name: payload.first_name,
          last_name: payload.last_name,
          email: payload.email,
          phone: payload.phone,
          tier: payload.tier,
          role: payload.role,
          team_id: payload.team_id,
          is_verified: payload.is_verified
        }),
      });

      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Database write failed");
      }

      addLog(`[SUCCESS] SYNC: User profile [${formEmail}] successfully saved.`);
      setIsModalOpen(false);
      loadData();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] SYNC_FAIL: Save failed: ${err.message}`);
    }
  };


  const handleDelete = async (id: string, email: string) => {
    if (id === "00000000-0000-0000-0000-000000000001") {
      addLog("[BLOCKED] DELETE_FAILED: Cannot delete default manager profile!");
      return;
    }

    if (!confirm(`Are you sure you want to delete user ${email}?`)) return;

    addLog(`DELETE: Removing user profile [${email}]...`);

    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const errorDetail = await res.json();
        throw new Error(errorDetail.detail || "Delete operation collapsed");
      }
      addLog(`[SUCCESS] DELETE: User profile [${email}] successfully deleted.`);
      loadData();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] DELETE_FAIL: Delete failed: ${err.message}`);
    }
  };


  const handleApproveAgent = async (id: string, email: string) => {
    addLog(`APPROVE: Activating and verifying agent profile [${email}]...`);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_verified: true }),
      });
      if (!res.ok) {
        throw new Error("Activation update failed");
      }
      addLog(`[SUCCESS] ACTIVATE: Agent [${email}] successfully activated.`);
      loadData();
    } catch (err: any) {
      console.error(err);
      addLog(`[ERROR] ACTIVATE_FAIL: Activation failed: ${err.message}`);
    }
  };


  // Filtered lists
  const filteredUsers = users.filter((u) => {
    const fullName = `${u.first_name || ""} ${u.last_name || ""}`.toLowerCase();
    const matchesSearch = 
      fullName.includes(searchTerm.toLowerCase()) || 
      (u.email || "").toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTier = filterTier ? u.tier === filterTier : true;
    return matchesSearch && matchesTier;
  });

  const paginatedUsers = filteredUsers.slice(offset, offset + limit);

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
            Operator Settings / Users
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
                ADMINISTRATION & ACCESS
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Users Directory
              </h1>
            </div>
            <button
              onClick={handleOpenCreateModal}
              className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all"
            >
              [+] Register New User
            </button>
          </div>


          {/* Filters & Search */}
          <div className="border border-foreground/10 bg-background p-4 mb-6 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="w-full md:w-1/2">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Search Name or Email</label>
              <input
                type="text"
                placeholder="Search..."
                value={searchTerm}
                onChange={(e) => { setSearchTerm(e.target.value); setOffset(0); }}
                className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              />
            </div>
            <div className="w-full md:w-1/4">
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Access Tier</label>
              <select
                value={filterTier}
                onChange={(e) => { setFilterTier(e.target.value); setOffset(0); }}
                className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              >
                <option value="">ALL TIERS</option>
                <option value="free">FREE</option>
                <option value="premium">PREMIUM</option>
                <option value="enterprise">ENTERPRISE</option>
              </select>
            </div>
          </div>

          {/* Users Table */}
          {loading ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs tracking-widest text-primary animate-pulse uppercase font-bold block">
                ● FETCHING USERS DIRECTORY...
              </span>
            </div>
          ) : paginatedUsers.length === 0 ? (
            <div className="w-full border border-foreground/10 bg-background p-12 text-center">
              <span className="font-mono text-xs text-text-muted uppercase block">
                No matching user profiles found in database.
              </span>
            </div>
          ) : (

            <div className="border border-foreground/10 bg-background overflow-x-auto mb-6">
              <table className="w-full border-collapse font-sans text-xs text-left">
                <thead>
                  <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
                    <th className="p-4 font-bold">Name</th>
                    <th className="p-4 font-bold">Email</th>
                    <th className="p-4 font-bold">Role</th>
                    <th className="p-4 font-bold">Status</th>
                    <th className="p-4 font-bold">Access Tier</th>
                    <th className="p-4 font-bold">Organization</th>
                    <th className="p-4 font-bold">Team</th>
                    <th className="p-4 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedUsers.map((u) => {
                    const org = organizations.find((o) => o.id === u.organization_id);
                    const linkedTeam = teams.find((t) => t.id === u.team_id);
                    const isDefault = u.id === "00000000-0000-0000-0000-000000000001";
                    return (
                      <tr key={u.id} className="border-b border-foreground/5 hover:bg-surface-container-lowest">
                        <td className="p-4 font-bold text-foreground">
                          {u.first_name || u.last_name ? `${u.first_name || ""} ${u.last_name || ""}` : "Unnamed"}
                          {isDefault && (
                            <span className="ml-2 font-mono text-[9px] bg-amber-600/10 text-amber-600 border border-amber-600/20 px-1 py-0.5 uppercase font-bold">
                              DEFAULT MANAGER
                            </span>
                          )}
                        </td>
                        <td className="p-4 font-mono text-foreground/80">{u.email}</td>
                        <td className="p-4 font-mono">
                          <span className={`px-2 py-0.5 font-bold uppercase ${
                            u.role === "admin" ? "bg-amber-600/10 text-amber-600 border border-amber-600/20" :
                            u.role === "team_leader" ? "bg-sky-600/10 text-sky-600 border border-sky-600/20" :
                            u.role === "agent" ? "bg-indigo-600/10 text-indigo-600 border border-indigo-600/20" :
                            u.role === "client" ? "bg-teal-600/10 text-teal-600 border border-teal-600/20" :
                            "bg-foreground/5 text-text-muted border border-foreground/10"
                          }`}>
                            {u.role || "user"}
                          </span>
                        </td>
                        <td className="p-4 font-mono">
                          {["agent", "team_leader"].includes(u.role) ? (
                            u.is_verified ? (
                              <span className="px-2 py-0.5 font-bold uppercase bg-emerald-600/10 text-emerald-600 border border-emerald-600/20">
                                ACTIVE
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 font-bold uppercase bg-amber-600/10 text-amber-600 border border-amber-600/20 animate-pulse">
                                PENDING
                              </span>
                            )
                          ) : (
                            <span className="text-text-muted">—</span>
                          )}
                        </td>
                        <td className="p-4 font-mono">
                          <span className={`px-2 py-0.5 font-bold uppercase ${
                            u.tier === "enterprise" ? "bg-primary/10 text-primary border border-primary/20" :
                            u.tier === "premium" ? "bg-emerald-600/10 text-emerald-600 border border-emerald-600/20" :
                            "bg-foreground/5 text-text-muted border border-foreground/10"
                          }`}>
                            {u.tier}
                          </span>
                        </td>
                        <td className="p-4 font-mono text-foreground/60">{org ? org.name : "None (Individual)"}</td>
                        <td className="p-4 font-mono text-foreground/60">{linkedTeam ? linkedTeam.name : "None"}</td>
                        <td className="p-4 text-right flex justify-end gap-3">
                          {!u.is_verified && ["agent", "team_leader"].includes(u.role) && (
                            <button
                              onClick={() => handleApproveAgent(u.id, u.email || "")}
                              className="font-mono text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 uppercase font-bold transition-all"
                            >
                              [Approve]
                            </button>
                          )}
                          <button
                            onClick={() => handleOpenEditModal(u)}
                            className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold transition-all"
                          >
                            [Edit]
                          </button>
                          <button
                            onClick={() => handleDelete(u.id, u.email || "")}
                            disabled={isDefault}
                            className={`font-mono text-[10px] border px-3 py-1 uppercase font-bold transition-all ${
                              isDefault 
                                ? "border-foreground/5 text-foreground/25 cursor-not-allowed" 
                                : "border-rose-600/30 hover:border-rose-600 text-rose-600"
                            }`}
                          >
                            {isDefault ? "[🔒 LOCK]" : "[Delete]"}
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
          {filteredUsers.length > limit && (
            <div className="flex justify-between items-center mb-12">
              <button
                disabled={offset === 0}
                onClick={() => setOffset(Math.max(0, offset - limit))}
                className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30 hover:border-foreground transition-all"
              >
                [← Previous]
              </button>
              <span className="font-mono text-xs text-text-muted uppercase">
                SHOWING {offset + 1}-{Math.min(offset + limit, filteredUsers.length)} OF {filteredUsers.length}
              </span>
              <button
                disabled={offset + limit >= filteredUsers.length}
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
                {editingUser ? "Edit User Profile" : "Register New User"}
              </h2>
              
              <form onSubmit={handleSave} className="space-y-4">
                <div>
                  <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Profile ID (ReadOnly UUID)</label>
                  <input
                    type="text"
                    value={formId}
                    readOnly
                    className="w-full bg-surface-container-low border border-foreground/10 font-mono text-xs px-3 py-2 text-foreground/50 select-none"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">First Name</label>
                    <input
                      type="text"
                      value={formFirstName}
                      onChange={(e) => setFormFirstName(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Last Name</label>
                    <input
                      type="text"
                      value={formLastName}
                      onChange={(e) => setFormLastName(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Email Address</label>
                    <input
                      type="email"
                      required
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    />
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Phone Number</label>
                    <input
                      type="text"
                      value={formPhone}
                      onChange={(e) => setFormPhone(e.target.value)}
                      className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Access Tier</label>
                    <select
                      value={formTier}
                      onChange={(e) => setFormTier(e.target.value)}
                      className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    >
                      <option value="free">FREE</option>
                      <option value="premium">PREMIUM</option>
                      <option value="enterprise">ENTERPRISE</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Franchise Org linkage</label>
                    <select
                      value={formOrgId}
                      onChange={(e) => setFormOrgId(e.target.value)}
                      className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    >
                      <option value="">INDIVIDUAL ACCESS (NO ORG)</option>
                      {organizations.map((org) => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">User Role</label>
                    <select
                      value={formRole}
                      onChange={(e) => setFormRole(e.target.value)}
                      className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    >
                      <option value="user">USER</option>
                      <option value="client">CLIENT</option>
                      <option value="agent">AGENT</option>
                      <option value="team_leader">TEAM LEADER</option>
                      <option value="admin">ADMIN</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Agent Team Assignment</label>
                    <select
                      value={formTeamId}
                      onChange={(e) => setFormTeamId(e.target.value)}
                      className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                    >
                      <option value="">NO TEAM ASSIGNMENT</option>
                      {teams.map((t) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {["agent", "team_leader"].includes(formRole) && (
                  <div className="flex items-center gap-2 border border-foreground/10 bg-surface-container-low p-3">
                    <input
                      type="checkbox"
                      id="form-is-verified"
                      checked={formIsVerified}
                      onChange={(e) => setFormIsVerified(e.target.checked)}
                      className="w-4 h-4 accent-primary"
                    />
                    <label htmlFor="form-is-verified" className="font-mono text-[10px] text-foreground uppercase font-bold cursor-pointer select-none">
                      Verify & Activate Operator Profile
                    </label>
                  </div>
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
                    SAVE_USER_PROFILE
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
