"use client";

import React, { useState, useEffect } from "react";

interface TeamAgent {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string;
  phone: string | null;
  role: string;
  is_verified: boolean;
  team_id: string | null;
}

interface TeamTabProps {
  authToken: string | null;
  teamId: string | null;
  teamName: string | null;
}

export default function TeamTab({ authToken, teamId, teamName }: TeamTabProps) {
  const [agents, setAgents] = useState<TeamAgent[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [togglingAgentId, setTogglingAgentId] = useState<string | null>(null);

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  const fetchTeamMembers = async () => {
    if (!authToken) return;
    setLoading(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users`, {
        headers: {
          "Authorization": `Bearer ${authToken}`
        }
      });
      if (!res.ok) {
        throw new Error("Unable to retrieve team registry directory.");
      }
      const data: TeamAgent[] = await res.json();
      
      // Filter members belonging to this specific franchise team and are of role agent
      const teamMembers = data.filter(u => 
        u.team_id === teamId && 
        ["agent", "team_leader"].includes(u.role)
      );
      setAgents(teamMembers);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "Failed to load team members.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authToken && teamId) {
      fetchTeamMembers();
    }
  }, [authToken, teamId]);

  const handleToggleVerification = async (agentId: string, currentStatus: boolean) => {
    if (!authToken) return;
    setTogglingAgentId(agentId);
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users/${agentId}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${authToken}`
        },
        body: JSON.stringify({
          is_verified: !currentStatus
        })
      });
      if (!res.ok) throw new Error("Failed to modify verification status.");
      
      // Update local state
      setAgents(prev => prev.map(a => a.id === agentId ? { ...a, is_verified: !currentStatus } : a));
    } catch (err: any) {
      alert("Error updating status: " + err.message);
    } finally {
      setTogglingAgentId(null);
    }
  };

  if (loading) {
    return (
      <div className="py-12 text-center border border-foreground/10 bg-[#FAF9F6]">
        <span className="font-mono text-xs text-primary tracking-widest uppercase animate-pulse font-bold block mb-2">
          ◆ FETCHING TEAM MEMBER INDICES...
        </span>
        <p className="font-sans text-[11px] text-text-muted">Loading secure credential directories.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Tab Header */}
      <div className="border-b border-foreground/10 pb-4 flex justify-between items-end">
        <div>
          <span className="font-mono text-[9px] text-primary tracking-widest uppercase block mb-1 font-bold">
            franchise administration portal
          </span>
          <h2 className="font-display text-2xl font-black uppercase text-black">
            Team Workspace: {teamName || "Unresolved Team"} ({agents.length} members)
          </h2>
        </div>
        <button
          onClick={fetchTeamMembers}
          className="font-mono text-[10px] border border-foreground/20 hover:border-foreground px-4 py-2 uppercase font-bold transition-all bg-white"
        >
          [ ↻ Refresh team list ]
        </button>
      </div>

      {errorMsg && (
        <div className="p-4 border border-rose-600 bg-rose-600/5 text-rose-600 font-mono text-xs font-bold uppercase">
          [SYNC ERROR]: {errorMsg}
        </div>
      )}

      {/* Team Metrics Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="border border-foreground/10 bg-white p-5 space-y-2 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
          <span className="font-mono text-[9px] text-[#666] uppercase block font-bold">Active Representatives</span>
          <span className="font-display text-3xl font-extrabold text-black block">
            {agents.filter(a => a.is_verified).length}
          </span>
        </div>
        <div className="border border-foreground/10 bg-white p-5 space-y-2 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
          <span className="font-mono text-[9px] text-[#666] uppercase block font-bold">Pending Verification Approval</span>
          <span className={`font-display text-3xl font-extrabold block ${
            agents.some(a => !a.is_verified) ? "text-rose-600 animate-pulse" : "text-black"
          }`}>
            {agents.filter(a => !a.is_verified).length}
          </span>
        </div>
        <div className="border border-foreground/10 bg-white p-5 space-y-2 rounded-none shadow-[2px_2px_0px_0px_rgba(0,0,0,0.05)]">
          <span className="font-mono text-[9px] text-[#666] uppercase block font-bold">Secure Location ID</span>
          <span className="font-mono text-xs font-bold text-primary block truncate mt-2 select-all uppercase">
            {teamId || "SYSTEM"}
          </span>
        </div>
      </div>

      {/* Agents Roster Directory */}
      <div className="border border-foreground/10 bg-background overflow-x-auto select-none">
        <table className="w-full border-collapse font-sans text-xs text-left">
          <thead>
            <tr className="bg-surface-container-low border-b border-foreground/10 font-mono uppercase text-text-muted">
              <th className="p-4 font-bold">Member Name</th>
              <th className="p-4 font-bold">Credentials</th>
              <th className="p-4 font-bold">Security Scope</th>
              <th className="p-4 font-bold">Activation Status</th>
              <th className="p-4 font-bold text-right">Approval Actions</th>
            </tr>
          </thead>
          <tbody>
            {agents.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-8 text-center text-text-muted font-mono uppercase">
                  No registered franchise agents found under this team scope.
                </td>
              </tr>
            ) : (
              agents.map((ag) => {
                const isLeader = ag.role === "team_leader";
                return (
                  <tr key={ag.id} className="border-b border-foreground/5 hover:bg-white bg-white">
                    <td className="p-4">
                      <div className="font-bold text-black uppercase">
                        {`${ag.first_name || "PENDING"} ${ag.last_name || "ONBOARDING"}`}
                      </div>
                      <span className="font-mono text-[9px] text-[#888] select-all uppercase block mt-0.5">
                        ID: {ag.id.slice(0, 8).toUpperCase()}
                      </span>
                    </td>
                    <td className="p-4">
                      <div className="font-mono font-bold text-black truncate select-all">{ag.email}</div>
                      <div className="font-sans text-[10px] text-text-muted mt-0.5">{ag.phone || "No phone added"}</div>
                    </td>
                    <td className="p-4">
                      <span className={`font-mono text-[9px] font-black uppercase px-2 py-0.5 border ${
                        isLeader
                          ? "bg-primary/10 text-primary border-primary/20"
                          : "bg-[#eeeee9] text-black border-foreground/10"
                      }`}>
                        {isLeader ? "LEADER" : "AGENT"}
                      </span>
                    </td>
                    <td className="p-4">
                      <span className={`font-mono text-[9px] px-2 py-0.5 border rounded-none font-bold ${
                        ag.is_verified
                          ? "bg-emerald-500/10 text-emerald-600 border-emerald-500/20"
                          : "bg-rose-500/10 text-rose-600 border-rose-500/20 animate-pulse font-black"
                      }`}>
                        {ag.is_verified ? "[✓ VERIFIED / ACTIVE]" : "[✗ PENDING REVIEW]"}
                      </span>
                    </td>
                    <td className="p-4 text-right">
                      {isLeader ? (
                        <span className="font-mono text-[9px] text-[#888] uppercase italic pr-4">Self (Restricted)</span>
                      ) : (
                        <button
                          disabled={togglingAgentId === ag.id}
                          onClick={() => handleToggleVerification(ag.id, ag.is_verified)}
                          className={`font-mono text-[10px] px-4 py-2 border uppercase font-black transition-all cursor-pointer rounded-none ${
                            ag.is_verified
                              ? "border-rose-600/30 text-rose-600 hover:border-rose-600 hover:bg-rose-600/5 bg-white"
                              : "border-emerald-600/30 text-emerald-600 hover:border-emerald-600 hover:bg-emerald-600/5 bg-white"
                          }`}
                        >
                          {ag.is_verified ? "Deactivate" : "[✓ Approve / Activate]"}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
