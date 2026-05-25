"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";

interface SystemStats {
  providers: number;
  users: number;
  organizations: number;
  businesses: number;
  scans: number;
  results: number;
  teams: number;
  leads: number;
}

interface ObservabilityStats {
  success_rate: number;
  average_score: number;
  tokens_by_provider: Array<{ provider: string; tokens: number }>;
  latency_by_provider: Array<{ provider: string; latency_ms: number }>;
  scans_by_date: Array<{ date: string; count: number }>;
}

export default function OperatorHub() {
  const [stats, setStats] = useState<SystemStats>({
    providers: 0,
    users: 0,
    organizations: 0,
    businesses: 0,
    scans: 0,
    results: 0,
    teams: 0,
    leads: 0,
  });
  const [obsStats, setObsStats] = useState<ObservabilityStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
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

  const fetchStats = async () => {
    setLoading(true);
    addLog("SYNC: Fetching central stats aggregator...");
    
    try {
      const res = await fetch(`${BACKEND_URL}/api/v1/admin/stats`);
      if (!res.ok) {
        throw new Error("Stats service returned an error");
      }
      const data = await res.json();

      setStats({
        providers: data.providers || 0,
        users: data.users || 0,
        organizations: data.organizations || 0,
        businesses: data.businesses || 0,
        scans: data.scans || 0,
        results: data.results || 0,
        teams: data.teams || 0,
        leads: data.leads || 0,
      });

      // Fetch Observability Telemetry
      const obsRes = await fetch(`${BACKEND_URL}/api/v1/observability/stats`);
      if (obsRes.ok) {
        const obsData = await obsRes.json();
        setObsStats(obsData);
        addLog("OBSERVABILITY: Live system telemetry and metrics loaded.");
      } else {
        addLog("[WARNING] OBSERVABILITY: Failed to load system performance metrics.");
      }

      addLog(`STATS: Dashboard metrics synchronized. Total Scans: ${data.scans}, Total Citations: ${data.results}`);
      addLog("DASHBOARD: Operator Dashboard fully operational.");
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Failed to sync backend operator stats.");
      addLog(`[ERROR] DASHBOARD_FAIL: Aggregator synchronization failed. ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    addLog("INIT: Starting central operator settings dashboard...");
    fetchStats();
  }, []);


  return (
    <>
      {/* ═══════════════════════ NAV ═══════════════════════ */}
      <nav
        id="top-nav"
        className="fixed top-0 w-full z-50 flex justify-between items-center px-6 md:px-10 h-16 bg-background/90 backdrop-blur-md border-b border-border"
      >
        <div className="flex items-center gap-8">
          <span className="font-display text-2xl font-bold tracking-tight text-foreground">
            GeoTracker
          </span>
          <span className="font-mono text-xs bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter animate-pulse">
            OPERATOR CENTRAL
          </span>
        </div>
        <Link
          href="/"
          className="font-mono text-xs tracking-tighter bg-foreground text-background px-6 py-2 hover:bg-primary hover:text-white transition-all uppercase font-bold"
        >
          [← RETURN TO AUDIT PORTAL]
        </Link>
      </nav>

      <main className="pt-16 min-h-screen blueprint-bg flex flex-col justify-between">
        <div className="w-full max-w-7xl mx-auto px-6 md:px-10 py-12 flex-grow">
          {/* Header Description Section */}
          <div className="mb-12 border-b border-foreground/10 pb-6 flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                ADMINISTRATION DATABASES
              </span>
              <h1 className="font-display text-4xl font-extrabold tracking-tight uppercase leading-none">
                Operator Dashboard
              </h1>
            </div>
            <p className="font-sans text-sm text-text-muted max-w-md leading-relaxed">
              Operator-only portal for administrative settings. Manage access tiers, organizational profiles, stores directories, audits, and search engine configurations.
            </p>
          </div>

          {errorMsg && (
            <div className="w-full border border-rose-600/30 bg-rose-600/5 p-6 text-center my-4">
              <span className="font-mono text-xs font-bold text-rose-600 block uppercase mb-2">
                [SYNC ERROR] {errorMsg}
              </span>
              <button
                onClick={() => fetchStats()}
                className="font-mono text-[10px] bg-rose-600 text-white px-4 py-2 hover:bg-rose-700 transition-all font-bold uppercase"
              >
                Retry Sync
              </button>
            </div>
          )}


          {/* Bento Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
            
            {/* Card 1: Providers */}
            <Link
              href="/admin/providers"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    AI CONFIG
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">01</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  AI Providers
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  Manage API keys, active model versions, and connection settings used by AI search agents during visibility audits.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">ACTIVE_MODELS</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.providers} ENGINES
                </span>
              </div>
            </Link>

            {/* Card 2: Users */}
            <Link
              href="/admin/users"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    DIRECTORY
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">02</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  Users
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  Manage operator profiles, franchise team members, access tiers (free, premium, enterprise), and organization associations.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">TOTAL_USERS</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.users} ACCOUNTS
                </span>
              </div>
            </Link>

            {/* Card 3: Organizations */}
            <Link
              href="/admin/organizations"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    STRUCTURE
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">03</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  Organizations
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  Manage parent franchise groups and corporate organizations that contain and configure storefront locations.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">ORGANIZATIONS</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.organizations} ENTITIES
                </span>
              </div>
            </Link>


            {/* Card 4: Businesses */}
            <Link
              href="/admin/businesses"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    DIRECTORY
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">04</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  Businesses
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  Manage storefront location profiles. Define industry categories, target suburbs, primary services, and organizational groups.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">STOREFRONTS</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.businesses} STORES
                </span>
              </div>
            </Link>

            {/* Card 5: Scans */}
            <Link
              href="/admin/scans"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    AUDITS
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">05</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  Scans
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  List and manage historical AI search visibility audits. Modify overall scores, status cycles, and recommended actions.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">AUDITS_RUN</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.scans} RUNS
                </span>
              </div>
            </Link>

            {/* Card 6: Results */}
            <Link
              href="/admin/results"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    SCORES
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">06</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  Scan Results
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  Deep dive into raw AI search engine citations, rank positions, search engine mentions, and AI-generated reasons.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">TOTAL_RESULTS</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.results} CITATIONS
                </span>
              </div>
            </Link>

            {/* Card 7: Teams */}
            <Link
              href="/admin/teams"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    OPERATION
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">07</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  Franchise Teams
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  Manage agent franchise teams, assign team leaders, monitor member sizes, and configure potential lead load balancing.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">TOTAL_TEAMS</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.teams} TEAMS
                </span>
              </div>
            </Link>

            {/* Card 8: Leads */}
            <Link
              href="/admin/leads"
              className="border border-foreground/10 bg-background p-6 flex flex-col justify-between transition-all duration-300 hover:border-primary hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)] group cursor-pointer"
            >
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[10px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    PIPELINE
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20 group-hover:text-primary transition-colors">08</span>
                </div>
                <h3 className="font-display text-xl font-bold uppercase tracking-tight mb-2 text-foreground group-hover:text-primary transition-colors">
                  Sales Leads
                </h3>
                <p className="font-sans text-xs text-text-muted leading-relaxed">
                  Monitor the sales pipeline generated from visibility deficits. Track lead status, assign leads to franchise teams and active sales agents.
                </p>
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 flex justify-between items-center">
                <span className="font-mono text-[10px] text-text-muted uppercase">TOTAL_LEADS</span>
                <span className="font-mono text-xs font-bold text-foreground">
                  {loading ? "●●" : stats.leads} LEADS
                </span>
              </div>
            </Link>


          </div>

          {/* ═══════════════════════ OBSERVABILITY SECTION ═══════════════════════ */}
          <div className="pt-4 border-t border-foreground/10 mt-12 mb-6">
            <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
              REAL-TIME PLATFORM METRICS
            </span>
            <h2 className="font-display text-2xl font-bold uppercase tracking-tight text-foreground">
              Observability & Engine Performance
            </h2>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-12">
            {/* Card A: LLM Success & Quality */}
            <div className="border border-foreground/20 bg-background/80 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    QUALITY ASSURANCE
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20">A</span>
                </div>
                <h3 className="font-display text-lg font-bold uppercase tracking-tight mb-4 text-foreground">
                  Audit Execution Integrity
                </h3>
                
                {obsStats ? (
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span>SCAN SUCCESS RATE</span>
                        <span className="font-bold">{obsStats.success_rate}%</span>
                      </div>
                      <div className="w-full bg-foreground/10 h-6 border border-foreground relative">
                        <div 
                          className="bg-emerald-500 h-full border-r border-foreground transition-all duration-500" 
                          style={{ width: `${obsStats.success_rate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span>AVERAGE VISIBILITY SCORE</span>
                        <span className="font-bold">{obsStats.average_score}/100</span>
                      </div>
                      <div className="w-full bg-foreground/10 h-6 border border-foreground relative">
                        <div 
                          className="bg-[#00e5ff] h-full border-r border-foreground transition-all duration-500" 
                          style={{ width: `${obsStats.average_score}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 font-mono text-[10px] text-text-muted animate-pulse">
                    ● TELEMETRY OFFLINE / LOADING...
                  </div>
                )}
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 text-[10px] font-mono text-text-muted uppercase">
                CRITICAL SYSTEM HEALTH CHECKS
              </div>
            </div>

            {/* Card B: Latency by AI Provider */}
            <div className="border border-foreground/20 bg-background/80 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    LATENCY DISPATCH
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20">B</span>
                </div>
                <h3 className="font-display text-lg font-bold uppercase tracking-tight mb-4 text-foreground">
                  Response Latency (ms)
                </h3>
                
                {obsStats && obsStats.latency_by_provider.length > 0 ? (
                  <div className="space-y-4">
                    {obsStats.latency_by_provider.map((lp, idx) => {
                      const maxLat = Math.max(...obsStats.latency_by_provider.map(l => l.latency_ms), 1000);
                      const pct = Math.min((lp.latency_ms / maxLat) * 100, 100);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-[11px] font-mono mb-1">
                            <span className="font-bold">{lp.provider}</span>
                            <span>{lp.latency_ms} ms</span>
                          </div>
                          <div className="w-full bg-foreground/10 h-4 border border-foreground">
                            <div 
                              className="bg-primary h-full border-r border-foreground transition-all duration-500" 
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : obsStats ? (
                  <div className="text-center py-8 font-mono text-[10px] text-text-muted italic">
                    NO COMPLETED SCAN RESULTS LOGGED
                  </div>
                ) : (
                  <div className="text-center py-6 font-mono text-[10px] text-text-muted animate-pulse">
                    ● TELEMETRY OFFLINE / LOADING...
                  </div>
                )}
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 text-[10px] font-mono text-text-muted uppercase">
                LATENCY PROFILES PER ENGINE
              </div>
            </div>

            {/* Card C: Token Consumption */}
            <div className="border border-foreground/20 bg-background/80 backdrop-blur-sm p-6 flex flex-col justify-between hover:border-primary transition-all duration-300">
              <div>
                <div className="flex justify-between items-center mb-4">
                  <span className="font-mono text-[9px] bg-primary/10 text-primary border border-primary/20 px-2 py-0.5 uppercase font-bold tracking-tighter">
                    COST & COMPUTE
                  </span>
                  <span className="font-mono text-2xl font-black text-foreground/20">C</span>
                </div>
                <h3 className="font-display text-lg font-bold uppercase tracking-tight mb-4 text-foreground">
                  Token Consumed by Provider
                </h3>
                
                {obsStats && obsStats.tokens_by_provider.length > 0 ? (
                  <div className="space-y-4">
                    {obsStats.tokens_by_provider.map((tp, idx) => {
                      const maxTokens = Math.max(...obsStats.tokens_by_provider.map(t => t.tokens), 1000);
                      const pct = Math.min((tp.tokens / maxTokens) * 100, 100);
                      return (
                        <div key={idx}>
                          <div className="flex justify-between text-[11px] font-mono mb-1">
                            <span className="font-bold">{tp.provider}</span>
                            <span>{tp.tokens.toLocaleString()} tokens</span>
                          </div>
                          <div className="w-full bg-foreground/10 h-4 border border-foreground">
                            <div 
                              className="bg-yellow-500 h-full border-r border-foreground transition-all duration-500" 
                              style={{ width: `${pct}%` }}
                            ></div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : obsStats ? (
                  <div className="text-center py-8 font-mono text-[10px] text-text-muted italic">
                    NO TOKENS LOGGED YET
                  </div>
                ) : (
                  <div className="text-center py-6 font-mono text-[10px] text-text-muted animate-pulse">
                    ● TELEMETRY OFFLINE / LOADING...
                  </div>
                )}
              </div>
              <div className="mt-8 pt-4 border-t border-foreground/5 text-[10px] font-mono text-text-muted uppercase">
                COMPUTE UTILITY PROFILE
              </div>
            </div>
          </div>
        </div>

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

            {/* Retro Blueprint Terminal Log Console */}
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
          <div className="flex gap-6 flex-wrap justify-center">
            <a href="#" className="font-mono text-[10px] uppercase text-text-muted hover:text-primary transition-colors terminal-flicker">
              DOCS
            </a>
            <a href="#" className="font-mono text-[10px] uppercase text-text-muted hover:text-primary transition-colors terminal-flicker">
              API_REF
            </a>
            <span className="font-mono text-[10px] uppercase text-primary font-bold">
              Uptime: 100%
            </span>
          </div>
          <div className="font-mono text-[10px] uppercase text-text-muted">
            ©2024 GeoTracker Admin
          </div>
        </footer>

      </main>
    </>
  );
}
