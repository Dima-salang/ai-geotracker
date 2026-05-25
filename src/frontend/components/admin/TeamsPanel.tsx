"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { deleteTeam, saveTeam } from "@/app/admin/actions";
import type { Team, User } from "@/lib/api/types";
import { AdminConsole } from "./AdminConsole";
import { AdminFooter } from "./AdminFooter";
import { useAdminConsole } from "./useAdminConsole";

interface TeamsPanelProps {
  teams: Team[];
  users: User[];
}

export function TeamsPanel({ teams, users }: TeamsPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { consoleLogs, consoleContainerRef, addLog } = useAdminConsole(
    `[${new Date().toLocaleTimeString()}] LOAD: ${teams.length} teams, ${users.length} users (server cache).`
  );

  const [searchTerm, setSearchTerm] = useState("");
  const [offset, setOffset] = useState(0);
  const limit = 10;
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [formId, setFormId] = useState("");
  const [formName, setFormName] = useState("");
  const [formLeaderId, setFormLeaderId] = useState("");

  const eligibleLeaders = useMemo(
    () => users.filter((u) => ["agent", "team_leader", "admin"].includes(u.role)),
    [users]
  );

  const filteredTeams = useMemo(
    () =>
      teams.filter((t) => t.name.toLowerCase().includes(searchTerm.toLowerCase())),
    [teams, searchTerm]
  );
  const paginatedTeams = filteredTeams.slice(offset, offset + limit);

  const refresh = () => startTransition(() => router.refresh());

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
    try {
      await saveTeam({
        id: editingTeam ? formId : undefined,
        name: formName,
        leader_id: formLeaderId || null,
      });
      addLog(`[SUCCESS] SYNC: Team [${formName}] saved.`);
      setIsModalOpen(false);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] SYNC_FAIL: ${err instanceof Error ? err.message : "Save failed"}`);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete team '${name}'? Member links will be cleared.`)) return;
    try {
      await deleteTeam(id);
      addLog(`[SUCCESS] DELETE: Team [${name}] deleted.`);
      refresh();
    } catch (err: unknown) {
      addLog(`[ERROR] DELETE_FAIL: ${err instanceof Error ? err.message : "Delete failed"}`);
    }
  };

  return (
    <>
      <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
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
            type="button"
            onClick={handleOpenCreateModal}
            disabled={pending}
            className="font-mono text-xs bg-primary hover:bg-primary-hover text-white px-6 py-3 uppercase font-bold transition-all disabled:opacity-50"
          >
            [+] Register New Team
          </button>
        </div>

        <div className="border border-foreground/10 bg-background p-4 mb-6">
          <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">
            Search Team Name
          </label>
          <input
            type="text"
            placeholder="Search..."
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setOffset(0);
            }}
            className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
          />
        </div>

        {paginatedTeams.length === 0 ? (
          <div className="w-full border border-foreground/10 bg-background p-12 text-center">
            <span className="font-mono text-xs text-text-muted uppercase block">
              No matching franchise teams found.
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
                    <tr
                      key={t.id}
                      className="border-b border-foreground/5 hover:bg-surface-container-lowest"
                    >
                      <td className="p-4 font-bold text-foreground">{t.name}</td>
                      <td className="p-4 font-mono text-foreground/80">
                        {leader ? (
                          <span className="font-bold text-foreground">
                            {leader.first_name || leader.last_name
                              ? `${leader.first_name || ""} ${leader.last_name || ""}`
                              : "Unnamed"}{" "}
                            ({leader.email})
                          </span>
                        ) : (
                          <span className="text-text-muted">None Assigned</span>
                        )}
                      </td>
                      <td className="p-4 font-mono text-foreground/60">
                        {members.length} Agents
                      </td>
                      <td className="p-4 text-right flex justify-end gap-3">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(t)}
                          className="font-mono text-[10px] border border-foreground/20 hover:border-foreground text-foreground px-3 py-1 uppercase font-bold"
                        >
                          [Edit]
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(t.id, t.name)}
                          disabled={pending}
                          className="font-mono text-[10px] border border-rose-600/30 hover:border-rose-600 text-rose-600 px-3 py-1 uppercase font-bold"
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

        {filteredTeams.length > limit && (
          <div className="flex justify-between items-center mb-12">
            <button
              type="button"
              disabled={offset === 0}
              onClick={() => setOffset(Math.max(0, offset - limit))}
              className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30"
            >
              [← Previous]
            </button>
            <span className="font-mono text-xs text-text-muted uppercase">
              SHOWING {offset + 1}-{Math.min(offset + limit, filteredTeams.length)} OF{" "}
              {filteredTeams.length}
            </span>
            <button
              type="button"
              disabled={offset + limit >= filteredTeams.length}
              onClick={() => setOffset(offset + limit)}
              className="font-mono text-xs border border-foreground/20 px-4 py-2 uppercase font-bold disabled:opacity-30"
            >
              [Next →]
            </button>
          </div>
        )}
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-xl border border-foreground bg-background p-6 md:p-8 relative">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 font-mono text-xs hover:text-primary uppercase font-bold"
            >
              [Close X]
            </button>
            <h2 className="font-display text-2xl font-black uppercase tracking-tight mb-6 border-b border-foreground/10 pb-2">
              {editingTeam ? "Edit Franchise Team" : "Register New Team"}
            </h2>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">
                  Team ID
                </label>
                <input
                  type="text"
                  value={formId}
                  readOnly
                  className="w-full bg-surface-container-low border border-foreground/10 font-mono text-xs px-3 py-2 text-foreground/50"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">
                  Team Name
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">
                  Assign Team Leader
                </label>
                <select
                  value={formLeaderId}
                  onChange={(e) => setFormLeaderId(e.target.value)}
                  className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                >
                  <option value="">NO LEADER ASSIGNED</option>
                  {eligibleLeaders.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.first_name || u.last_name
                        ? `${u.first_name || ""} ${u.last_name || ""}`
                        : "Unnamed"}{" "}
                      ({u.email} - {u.role})
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 border-t border-foreground/10 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="font-mono text-xs border border-foreground/20 px-4 py-2.5 uppercase font-bold"
                >
                  [Cancel]
                </button>
                <button
                  type="submit"
                  disabled={pending}
                  className="font-mono text-xs bg-primary text-white px-6 py-2.5 uppercase font-bold disabled:opacity-50"
                >
                  SAVE_TEAM_DATA
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <AdminConsole logs={consoleLogs} containerRef={consoleContainerRef} />
      <AdminFooter />
    </>
  );
}
