"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getAuthCallbackUrl } from "@/lib/auth/site-url";
import { supabase } from "../../../utils/supabase";

interface Team {
  id: string;
  name: string;
}

export default function AgentRegister() {
  const router = useRouter();
  
  // Auth states
  const [user, setUser] = useState<any>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [authLoading, setAuthLoading] = useState(true);

  // Teams & form states
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamsLoading, setTeamsLoading] = useState(true);

  // Form inputs
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [selectedTeamId, setSelectedTeamId] = useState("");

  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  // Check login session
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setUser(session.user);
        setSessionToken(session.access_token);
        
        // Auto-fill from user email if first/last name not present
        const metadata = session.user.user_metadata;
        if (metadata) {
          if (metadata.full_name) {
            const parts = metadata.full_name.split(" ");
            setFirstName(parts[0] || "");
            setLastName(parts.slice(1).join(" ") || "");
          } else {
            setFirstName(metadata.given_name || "");
            setLastName(metadata.family_name || "");
          }
        }
      }
      setAuthLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setUser(session.user);
        setSessionToken(session.access_token);
      } else {
        setUser(null);
        setSessionToken("");
      }
      setAuthLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Fetch active teams directory
  useEffect(() => {
    const fetchTeams = async () => {
      try {
        const res = await fetch(`${BACKEND_URL}/api/v1/teams?limit=100`);
        if (!res.ok) throw new Error("Could not load franchise teams directory");
        const teamData = await res.json();
        setTeams(teamData);
        if (teamData.length > 0) {
          setSelectedTeamId(teamData[0].id);
        }
      } catch (err: any) {
        console.error(err);
        setErrorMsg("Failed to initialize registration directory. " + err.message);
      } finally {
        setTeamsLoading(false);
      }
    };

    fetchTeams();
  }, [BACKEND_URL]);

  const handleOAuthLogin = async () => {
    setErrorMsg("");
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: getAuthCallbackUrl(),
        },
      });
      if (error) throw error;
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to authenticate via Google Auth. " + err.message);
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName || !lastName || !selectedTeamId) {
      setErrorMsg("First name, Last name, and Team selection are required.");
      return;
    }

    setSaving(true);
    setErrorMsg("");
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/users/register-agent`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          first_name: firstName,
          last_name: lastName,
          phone: phone || null,
          team_id: selectedTeamId
        })
      });

      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to register agent profile");
      }

      setSuccess(true);
      setTimeout(() => {
        router.push("/dashboard");
      }, 2500);
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || "An unexpected error occurred during registration.");
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || teamsLoading) {
    return (
      <main className="min-h-screen blueprint-bg flex items-center justify-center">
        <div className="text-center p-8 bg-background border border-foreground/10 max-w-sm w-full">
          <span className="font-mono text-xs tracking-widest text-primary uppercase font-bold animate-pulse block">
            ● LOADING REGISTRATION GATEWAY...
          </span>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen blueprint-bg flex items-center justify-center p-6">
      <div className="w-full max-w-xl bg-background border border-foreground p-8 md:p-10 relative">
        <span className="font-mono text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter absolute top-4 left-8">
          AGENT ACCESS PORTAL
        </span>

        <h1 className="font-display text-3xl font-black uppercase tracking-tight text-foreground border-b border-foreground/10 pb-4 mb-6 mt-2">
          Register As Agent
        </h1>

        {errorMsg && (
          <div className="border border-rose-600/30 bg-rose-600/5 p-4 mb-6">
            <span className="font-mono text-xs font-bold text-rose-600 uppercase block">
              [REGISTRATION ERROR] {errorMsg}
            </span>
          </div>
        )}

        {success ? (
          <div className="border border-emerald-600/30 bg-emerald-600/5 p-6 text-center space-y-3">
            <span className="font-mono text-sm font-bold text-emerald-600 uppercase block">
              [✓ ACTIVATION SUCCESSFUL]
            </span>
            <p className="font-sans text-xs text-foreground/80">
              Welcome, {firstName}! Your account has been promoted to **Agent**. Redirecting you to your Franchise Dashboard...
            </p>
            <span className="font-mono text-[9px] text-text-muted uppercase animate-pulse block">
              ● Redirection in progress...
            </span>
          </div>
        ) : !user ? (
          <div className="text-center py-6 space-y-6">
            <p className="font-sans text-sm text-text-muted leading-relaxed max-w-md mx-auto">
              Welcome to the Iozera GeoTracker internal network. To self-register as an operational agent, you must first authenticate with your franchise Google account.
            </p>
            <button
              onClick={handleOAuthLogin}
              className="font-mono text-xs tracking-tighter bg-foreground text-background px-8 py-3.5 hover:bg-primary hover:text-white transition-all uppercase font-bold w-full max-w-xs"
            >
              [Authenticate via Google OAuth]
            </button>
          </div>
        ) : (
          <form onSubmit={handleRegister} className="space-y-5">
            <p className="font-sans text-xs text-text-muted leading-relaxed border-b border-foreground/5 pb-4">
              Authorized: <span className="font-mono text-foreground font-bold">{user.email}</span>. Fill out your details below to bind your profile to a franchise team.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">First Name</label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                />
              </div>
              <div>
                <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Last Name</label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                />
              </div>
            </div>

            <div>
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Phone Number</label>
              <input
                type="text"
                placeholder="Optional"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-transparent border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
              />
            </div>

            <div>
              <label className="font-mono text-[10px] text-text-muted uppercase block mb-1 font-bold">Select Franchise Team</label>
              {teams.length === 0 ? (
                <div className="font-mono text-xs text-rose-600 border border-rose-600/20 bg-rose-600/5 p-3">
                  No active teams found. Registration blocked until an admin configures a team.
                </div>
              ) : (
                <select
                  value={selectedTeamId}
                  onChange={(e) => setSelectedTeamId(e.target.value)}
                  className="w-full bg-background border border-foreground/20 focus:border-primary focus:outline-none font-mono text-xs px-3 py-2 text-foreground"
                >
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="pt-4 border-t border-foreground/10 flex flex-col sm:flex-row gap-3 justify-between items-center">
              <Link
                href="/"
                className="font-mono text-xs hover:text-primary uppercase font-bold text-foreground/60 transition-colors"
              >
                [← Back to Portal]
              </Link>
              <button
                type="submit"
                disabled={saving || teams.length === 0}
                className="font-mono text-xs bg-primary text-white px-8 py-3.5 uppercase font-bold hover:bg-primary-hover disabled:opacity-30 transition-all w-full sm:w-auto"
              >
                {saving ? "SAVING_PROFILE..." : "ACTIVATE_AGENT_ACCOUNT"}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
