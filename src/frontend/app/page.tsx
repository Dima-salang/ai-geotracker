"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import DitheredParticles from "../components/DitheredParticles";
import ResultsDashboard, { ProviderResult, ScanRecommendation, ResearchedDetails } from "../components/ResultsDashboard";

/* ── Nav Links ── */
const NAV_LINKS = [
  { label: "MAPS", href: "#", active: true },
  { label: "LOGS", href: "#" },
  { label: "AUDITS", href: "#" },
  { label: "SATELLITE", href: "#" },
  { label: "SETTINGS", href: "/admin" },
] as const;

/* ── Stats ── */
const STATS = [
  { value: "582,000+", label: "Scans Performed" },
  { value: "99.9%", label: "System Uptime" },
  { value: "12", label: "LLM Audit Nodes" },
] as const;

/* ── Bento Value Cards ── */
const BENTO_CARDS = {
  lead: {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
      </svg>
    ),
    title: "Lead Generation",
    body: "Identify high-intent users asking AI for services in your category. Convert model citations into direct customer acquisition.",
    cta: "Optimize Conversion",
  },
  sentiment: {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    title: "Sentiment Analysis",
    body: "Deep-dive into the semantic weighting of your brand across 20+ transformer models.",
  },
  aeo: {
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-text-muted">
        <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
      </svg>
    ),
    title: "AEO Scaling",
    body: "Answer Engine Optimization (AEO) is the new SEO. We provide the technical blueprints.",
  },
  competitive: {
    icon: (
      <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="text-primary">
        <path d="M3 3v18h18" /><path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    title: "Competitive Benchmarking",
    body: "See how you stack up against competitors when users ask for \"Best [Your Category] in [Your City]\". Real-time parity auditing across all major model updates.",
  },
};

export default function LandingPage() {
  const [domain, setDomain] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [isVirtualDetected, setIsVirtualDetected] = useState<boolean | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");

  const [scanResult, setScanResult] = useState<{
    overallScore: number;
    summary: { green: number; yellow: number; red: number };
    recommendations: ScanRecommendation[];
    details: ResearchedDetails;
    providerResults: ProviderResult[];
    scanId?: string;
  } | null>(null);

  const terminalEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [terminalLogs]);

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTerminalLogs((prev) => [...prev, `[${timestamp}] ${message}`]);
  };

  const handleStartScan = async () => {
    if (!domain.trim()) {
      setErrorMsg("Please enter a valid domain");
      return;
    }

    // Clean domain format
    let cleanDomain = domain.trim().toLowerCase();
    cleanDomain = cleanDomain.replace(/^(https?:\/\/)?(www\.)?/, "");
    cleanDomain = cleanDomain.split("/")[0];

    setLoading(true);
    setErrorMsg("");
    setScanResult(null);
    setIsVirtualDetected(null);
    setProgressStage("initiated");
    setTerminalLogs([]);

    addLog(`SYS_LOAD: Initializing secure node scan for ${cleanDomain}...`);
    addLog("SYS_VAL: Connecting to search routing system...");

    const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/scan`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          domain: cleanDomain,
          business_name: "",
          industry: "",
          primary_city: "",
          primary_state: "",
          country: "",
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP network error: status ${response.status}`);
      }

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      if (!reader) {
        throw new Error("ReadableStream not supported by client browser");
      }

      let buffer = "";
      let activeScanId = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const blocks = buffer.split("\n\n");
        buffer = blocks.pop() || "";

        for (const block of blocks) {
          if (!block.trim()) continue;

          let eventType = "message";
          let dataStr = "";

          const lines = block.split("\n");
          for (const line of lines) {
            if (line.startsWith("event: ")) {
              eventType = line.substring(7).trim();
            } else if (line.startsWith("data: ")) {
              dataStr = line.substring(6).trim();
            }
          }

          if (dataStr) {
            try {
              const data = JSON.parse(dataStr);

              if (eventType === "progress") {
                if (data.stage === "initiated") {
                  setProgressStage("initiated");
                  activeScanId = data.scan_id;
                  addLog(`SYS_INFO: Registration complete. SCAN_ID = ${activeScanId}`);
                  addLog("SYS_LOAD: Beginning LangGraph workflow execution...");
                } else if (data.stage === "validated") {
                  setProgressStage("validated");
                  addLog("SYS_VAL: Input sanitization verified. Domain constraints resolved.");
                } else if (data.stage === "classification") {
                  setProgressStage("classification");
                  setIsVirtualDetected(data.is_virtual);
                  addLog("LLM_NODE: Online business classification finished.");
                  addLog(`LLM_NODE: Researched category: "${data.industry.toUpperCase()}"`);
                  addLog(`LLM_NODE: Virtual storefront operation detected: ${data.is_virtual ? "TRUE" : "FALSE"}`);
                  addLog(`LLM_NODE: Search footprint index: radius of ${data.radius_miles} miles`);
                  addLog(`LLM_NODE: Injected query space: ${data.prompts_generated} specialized prompts.`);
                } else if (data.stage === "geocoding") {
                  setProgressStage("geocoding");
                  addLog("GEO_CO: Bypassing regional coordinates (using location-free vectors)...");
                }
              } else if (eventType === "provider_result") {
                setProgressStage("query_providers");
                const providerColor = data.status === "green" ? "🟢" : data.status === "yellow" ? "🟡" : "🔴";
                addLog(`ENGINE: ${data.provider.toUpperCase()} index: ${providerColor} score = ${data.score}/100, rank = ${data.rank_position || "N/A"}`);
                if (data.error) {
                  addLog(`[WARN] Engine node error: ${data.error}`);
                }
              } else if (eventType === "complete") {
                setProgressStage("complete");
                addLog("SYS_SUCCESS: Coverage matrices resolved! Compiling visibility score card...");

                // Fetch full finalized scan details from backend database to ensure consistency
                if (activeScanId) {
                  const detailsRes = await fetch(`${BACKEND_URL}/api/v1/scans/${activeScanId}`);
                  if (detailsRes.ok) {
                    const fullScan = await detailsRes.json();
                    
                    setScanResult({
                      overallScore: fullScan.overall_score,
                      summary: fullScan.summary,
                      recommendations: fullScan.recommendations,
                      details: {
                        business_name: fullScan.business_name,
                        domain: fullScan.business_domain,
                        industry: fullScan.business_industry,
                        primary_city: fullScan.business_city,
                        primary_state: fullScan.business_state,
                        country: "US", // Default placeholder
                        service_focuses: fullScan.business_service_focuses || [],
                        is_virtual: fullScan.is_virtual ?? isVirtualDetected ?? false,
                      },
                      providerResults: fullScan.results,
                      scanId: activeScanId,
                    });
                  }
                }
                setLoading(false);
              } else if (eventType === "error") {
                addLog(`CRITICAL: Node validation fail! ${data.message}`);
                setErrorMsg(data.message);
                setLoading(false);
              }
            } catch (err) {
              console.error("Error decoding streamed response chunk:", err);
            }
          }
        }
      }
    } catch (err: any) {
      addLog(`CRITICAL_NETWORK_FAILURE: ${err.message}`);
      setErrorMsg(err.message || "Unable to establish connection to scan server.");
      setLoading(false);
    }
  };

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
          <div className="hidden md:flex gap-6">
            {NAV_LINKS.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className={`font-mono text-xs tracking-tighter uppercase transition-colors duration-150
                  ${"active" in link && link.active
                    ? "text-primary font-bold border-b-2 border-primary pb-1"
                    : "text-text-muted font-medium hover:text-primary-container"
                  }`}
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>
        <button
          id="sign-in-btn"
          className="font-mono text-xs tracking-tighter bg-primary text-white px-6 py-2 hover:bg-primary-container transition-all"
        >
          SIGN_IN
        </button>
      </nav>

      <main className="pt-16">
        {/* ═══════════════════════ HERO ═══════════════════════ */}
        <section
          id="hero-section"
          className="relative min-h-screen blueprint-bg flex items-start justify-center overflow-hidden border-b border-border pt-20 md:pt-32 pb-16"
        >
          {/* Performant dynamic background particles */}
          <DitheredParticles />

          {/* Desktop absolute Earth container (direct child of section to touch bottom/right viewport edges) */}
          <div className="hidden md:block absolute right-[-11vw] lg:right-[-13vw] bottom-0 w-[75%] lg:w-[85%] h-full pointer-events-none z-0">
            <div className="w-full h-full relative">
              <Image
                src="/ai-earth-removebg-preview-dithered.svg"
                alt="Dithered Earth"
                fill
                priority
                className="object-contain object-right-bottom"
              />
            </div>
          </div>

          {/* Two-column hero grid */}
          <div className="relative z-10 w-full max-w-[85rem] lg:max-w-[90rem] mx-auto px-6 md:px-12 lg:px-16 grid grid-cols-1 md:grid-cols-2 gap-12 md:gap-16 items-center py-12 md:py-6">
            {/* LEFT — copy & CTA Input (Order 1 on mobile & desktop) */}
            <div className="flex flex-col justify-center order-1 md:order-1 text-center md:text-left md:max-w-[440px] lg:max-w-[480px] w-full md:-translate-x-6 lg:-translate-x-12 xl:-translate-x-16">
              <h1 className="font-display text-[clamp(2.4rem,5vw,4.2rem)] font-bold uppercase mb-6 tracking-tight leading-[1.05]">
                Is your business invisible to AI?
              </h1>

              <p className="font-sans text-base text-text-muted mb-8 leading-relaxed max-w-lg">
                Customers are no longer just searching Google—they’re asking ChatGPT, Gemini, and Claude who to trust, hire, and buy from. GeoTracker shows whether AI is recommending your business or sending customers to your competitors.
              </p>

              {!scanResult && !loading && (
                <div className="flex flex-col gap-4 w-full">
                  <div className={`relative border p-[1px] bg-background transition-colors ${inputFocused ? "border-primary" : "border-foreground"
                    }`}>
                    <input
                      id="hero-business-url"
                      type="text"
                      value={domain}
                      onChange={(e) => setDomain(e.target.value)}
                      placeholder="ENTER YOUR DOMAIN (E.G. HTTPS://YOURCOMPANY.COM)"
                      className="w-full bg-transparent border-none focus:outline-none font-mono text-xs py-4 px-5 uppercase placeholder:text-foreground/30 text-foreground"
                      onFocus={() => setInputFocused(true)}
                      onBlur={() => setInputFocused(false)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") handleStartScan();
                      }}
                    />
                  </div>
                  <button
                    id="cta-check-visibility"
                    onClick={handleStartScan}
                    className="w-full bg-primary text-white font-mono text-xs py-4 border border-primary hover:bg-transparent hover:text-primary transition-all uppercase font-bold tracking-widest cursor-pointer"
                  >
                    Check My Visibility Score
                  </button>
                  {errorMsg && (
                    <span className="font-mono text-[10px] text-rose-600 uppercase font-bold">
                      [ERR] {errorMsg}
                    </span>
                  )}
                </div>
              )}

              {/* ── SSE REAL-TIME TERMINAL PROGRESS LOADER ── */}
              {loading && (
                <div className="w-full border border-foreground/10 bg-background p-5 mt-4 transition-all duration-300">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-mono text-[10px] text-primary font-bold uppercase tracking-wider animate-pulse">
                      ● AUDITING ENGINE STAGES
                    </span>
                    <span className="font-mono text-[9px] text-text-muted">
                      {progressStage.toUpperCase()}
                    </span>
                  </div>

                  {/* Elegant bento-style step loader */}
                  <div className="grid grid-cols-5 gap-1.5 mb-4">
                    <div className={`h-1.5 transition-colors duration-300 ${["initiated", "validated", "classification", "geocoding", "query_providers", "complete"].includes(progressStage) ? "bg-primary" : "bg-foreground/10"}`}></div>
                    <div className={`h-1.5 transition-colors duration-300 ${["validated", "classification", "geocoding", "query_providers", "complete"].includes(progressStage) ? "bg-primary" : "bg-foreground/10"}`}></div>
                    <div className={`h-1.5 transition-colors duration-300 ${["classification", "geocoding", "query_providers", "complete"].includes(progressStage) ? "bg-primary" : "bg-foreground/10"}`}></div>
                    <div className={`h-1.5 transition-colors duration-300 ${["geocoding", "query_providers", "complete"].includes(progressStage) ? "bg-primary" : "bg-foreground/10"}`}></div>
                    <div className={`h-1.5 transition-colors duration-300 ${["query_providers", "complete"].includes(progressStage) ? "bg-primary" : "bg-foreground/10"}`}></div>
                  </div>

                  {/* Retro Blueprint Terminal Log Console */}
                  <div className="font-mono text-[9px] p-3.5 bg-foreground text-background h-36 overflow-y-auto whitespace-pre-wrap leading-relaxed select-none">
                    {terminalLogs.map((log, index) => (
                      <div key={index} className="mb-1 border-b border-background/5 pb-0.5">
                        {log}
                      </div>
                    ))}
                    <div ref={terminalEndRef}></div>
                  </div>
                </div>
              )}

              {/* Reset button when viewing dashboard */}
              {scanResult && !loading && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setDomain("");
                    }}
                    className="font-mono text-[10px] bg-foreground text-background px-5 py-2.5 hover:bg-primary hover:text-white transition-all uppercase font-bold"
                  >
                    ← AUDIT NEW DOMAIN
                  </button>
                </div>
              )}
            </div>

            {/* RIGHT — big dithered globe (Only visible on mobile/tablet flow, desktop uses the absolute block above) */}
            <div className="order-2 md:hidden flex items-center justify-center w-full max-w-[600px] mx-auto">
              <div className="w-full aspect-[677/369] relative">
                <Image
                  src="/ai-earth-removebg-preview-dithered.svg"
                  alt="Dithered Earth"
                  fill
                  priority
                  className="object-contain"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── DETAILED RESULTS DASHBOARD (TEMPORARY DISPLAY SECTION) ── */}
        {scanResult && (
          <section id="results-section" className="py-16 px-6 md:px-10 border-b border-border bg-surface-container-low animate-in fade-in zoom-in-95 duration-500">
            <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-foreground/10 pb-4 gap-4">
              <div>
                <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                  REAL-TIME RESULTS DASHBOARD
                </span>
                <h2 className="font-display text-[2rem] font-bold tracking-tight uppercase leading-none">
                  Discovery Scorecard
                </h2>
              </div>
              <span className="font-mono text-[10px] text-text-muted mb-1">
                SYSTEM_NODE: 0x9812A
              </span>
            </div>
            <ResultsDashboard
              overallScore={scanResult.overallScore}
              summary={scanResult.summary}
              recommendations={scanResult.recommendations}
              details={scanResult.details}
              providerResults={scanResult.providerResults}
              scanId={scanResult.scanId}
            />
          </section>
        )}

        {/* ═══════════════════════ NETWORK STATS ═══════════════════════ */}
        <section id="stats-section" className="border-b border-border reveal-on-scroll">
          <div className="grid grid-cols-1 md:grid-cols-3" style={{ background: "rgba(0,0,0,0.06)" }}>
            {STATS.map((stat, i) => (
              <div
                key={stat.label}
                className={`bg-background py-16 px-10 flex flex-col items-center justify-center text-center border-b border-border md:border-b-0 ${i < STATS.length - 1 ? "md:border-r border-border" : "border-b-0"
                  }`}
              >
                <span className="font-display text-[2.2rem] font-bold mb-2">
                  {stat.value}
                </span>
                <span className="font-mono text-xs text-text-muted uppercase tracking-widest">
                  {stat.label}
                </span>
              </div>
            ))}
          </div>
        </section>

        {/* ═══════════════════════ BENTO VALUE GRID ═══════════════════════ */}
        <section id="value-section" className="py-24 px-6 md:px-10 bg-surface-container-low reveal-on-scroll">
          {/* Section Header */}
          <div className="mb-16 max-w-7xl mx-auto">
            <h2 className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em]">
              Value Extraction
            </h2>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-foreground/10 pb-4 gap-4">
              <p className="font-display text-[2rem] font-bold max-w-xl leading-tight tracking-tight">
                Actionable intelligence for the generative era.
              </p>
              <span className="font-mono text-[10px] text-outline mb-2">
                REF_ID: 0x8273645
              </span>
            </div>
          </div>

          {/* Bento Grid with perfect 1px border share styling */}
          <div className="grid grid-cols-1 md:grid-cols-12 max-w-7xl mx-auto border border-border" style={{ background: "rgba(0,0,0,0.06)" }}>
            {/* Lead Gen — large card */}
            <div className="md:col-span-8 bg-background p-8 md:p-12 hover:bg-primary/[0.03] transition-all group border-b md:border-b-0 md:border-r border-border">
              <div className="flex flex-col h-full">
                {BENTO_CARDS.lead.icon}
                <h3 className="font-display text-[2rem] font-bold mt-6 mb-4 tracking-tight">
                  {BENTO_CARDS.lead.title}
                </h3>
                <p className="font-sans text-base text-text-muted max-w-lg mb-8 leading-relaxed">
                  {BENTO_CARDS.lead.body}
                </p>
                <div className="mt-auto pt-8 border-t border-border flex justify-between items-center">
                  <span className="font-mono text-xs uppercase text-primary">
                    {BENTO_CARDS.lead.cta}
                  </span>
                  <svg
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="group-hover:translate-x-2 transition-transform"
                  >
                    <path d="M5 12h14" /><path d="m12 5 7 7-7 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Sentiment — small card */}
            <div className="md:col-span-4 bg-surface-container-low p-8 md:p-10 flex flex-col border-b md:border-b-0 border-border">
              {BENTO_CARDS.sentiment.icon}
              <h4 className="font-mono text-xs font-bold uppercase mt-4 mb-4">
                {BENTO_CARDS.sentiment.title}
              </h4>
              <p className="font-mono text-[10px] text-text-muted leading-relaxed">
                {BENTO_CARDS.sentiment.body}
              </p>
            </div>

            {/* AEO — medium card */}
            <div className="md:col-span-4 bg-surface-container-high p-8 md:p-10 border-b md:border-b-0 md:border-r border-border">
              {BENTO_CARDS.aeo.icon}
              <h3 className="font-display text-[2rem] font-bold mt-4 mb-4 tracking-tight">
                {BENTO_CARDS.aeo.title}
              </h3>
              <p className="font-sans text-base text-text-muted mb-6 leading-relaxed">
                {BENTO_CARDS.aeo.body}
              </p>
              <a href="#" className="font-mono text-[10px] underline uppercase tracking-tighter">
                Read Whitepaper
              </a>
            </div>

            {/* Competitive — large card */}
            <div className="md:col-span-8 bg-background p-8 md:p-12 group hover:bg-surface-container-low/50 transition-all">
              <div className="flex justify-between items-start mb-6">
                {BENTO_CARDS.competitive.icon}
                <div className="font-mono text-[10px] bg-primary text-white px-3 py-1">
                  CORE_MODULE
                </div>
              </div>
              <h3 className="font-display text-[2rem] font-bold mb-4 tracking-tight">
                {BENTO_CARDS.competitive.title}
              </h3>
              <p className="font-sans text-base text-text-muted max-w-lg leading-relaxed">
                {BENTO_CARDS.competitive.body}
              </p>
            </div>
          </div>
        </section>
      </main>

      {/* ═══════════════════════ FOOTER ═══════════════════════ */}
      <footer
        id="site-footer"
        className="w-full py-2 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center bg-surface-container-low border-t border-border h-16 gap-2"
      >
        <div className="font-mono text-xs font-bold text-foreground">
          GEOTRACKER_CORE
        </div>
        <div className="flex gap-6 flex-wrap justify-center">
          <a href="#" className="font-mono text-[10px] uppercase text-text-muted hover:text-primary transition-colors terminal-flicker">
            DOCS
          </a>
          <a href="#" className="font-mono text-[10px] uppercase text-text-muted hover:text-primary transition-colors terminal-flicker">
            API_REF
          </a>
          <a href="#" className="font-mono text-[10px] uppercase text-text-muted hover:text-primary transition-colors terminal-flicker">
            NETWORK_STATUS
          </a>
          <span className="font-mono text-[10px] uppercase text-primary font-bold">
            SYSTEM_UPTIME: 99.9%
          </span>
        </div>
        <div className="font-mono text-[10px] uppercase text-text-muted">
          ©2024 GEOTRACKER_CORE [VER_8.1.0]
        </div>
      </footer>
    </>
  );
}
