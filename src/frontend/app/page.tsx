"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import DitheredParticles from "../components/DitheredParticles";
import ResultsDashboard, { ProviderResult, ScanRecommendation, ResearchedDetails } from "../components/ResultsDashboard";

/* ── Nav Links ── */
const NAV_LINKS = [
  { label: "AUDIT", href: "/", active: true },
  { label: "SERVICES", href: "#" },
  { label: "PRICING", href: "#" },
  { label: "FAQS", href: "#" },
  { label: "ADMIN", href: "/admin" },
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

/* ── Floating positions for real-time fact popups orbiting the central blob ── */
const FLOATING_POSITIONS = [
  { top: "-25%", left: "-45%", right: undefined, bottom: undefined },
  { top: "10%", right: "-55%", left: undefined, bottom: undefined },
  { bottom: "-25%", left: "-30%", right: undefined, top: undefined },
  { top: "-35%", right: "-25%", left: undefined, bottom: undefined },
  { bottom: "30%", left: "-55%", right: undefined, top: undefined },
  { bottom: "-25%", right: "-35%", left: undefined, top: undefined },
  { top: "50%", left: "-60%", right: undefined, bottom: undefined },
  { bottom: "45%", right: "-55%", left: undefined, top: undefined },
] as const;

export default function LandingPage() {
  const [domain, setDomain] = useState("");
  const [inputFocused, setInputFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const [progressStage, setProgressStage] = useState("");
  const [isVirtualDetected, setIsVirtualDetected] = useState<boolean | null>(null);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState("");
  const [isRateLimited, setIsRateLimited] = useState(false);
  const [streamingProviders, setStreamingProviders] = useState<ProviderResult[]>([]);
  const [providerCount, setProviderCount] = useState(0);

  // Grounding metrics states
  const [researchedCategory, setResearchedCategory] = useState("");
  const [footprintRadius, setFootprintRadius] = useState<number | null>(null);
  const [promptsGenerated, setPromptsGenerated] = useState<number | null>(null);

  const [scanResult, setScanResult] = useState<{
    overallScore: number;
    summary: { green: number; yellow: number; red: number };
    recommendations: ScanRecommendation[];
    details: ResearchedDetails;
    providerResults: ProviderResult[];
    scanId?: string;
  } | null>(null);

  const [showDashboard, setShowDashboard] = useState(false);
  const [researchedFacts, setResearchedFacts] = useState<Array<{ id: string; label: string; value: string }>>([]);
  const [liveDetails, setLiveDetails] = useState<ResearchedDetails | null>(null);
  const [mockUserSession, setMockUserSession] = useState<{ id: string; email: string; tier: string } | null>(null);

  // Live computed results for real-time streaming inside ResultsDashboard
  const activeResults = loading ? streamingProviders : (scanResult?.providerResults || []);
  const completedProviders = streamingProviders.filter(p => p.status !== "loading");
  
  const liveOverallScore = loading
    ? (completedProviders.length > 0
        ? Math.round(completedProviders.reduce((acc, curr) => acc + (curr.score || 0), 0) / completedProviders.length)
        : 0)
    : (scanResult?.overallScore || 0);

  const liveSummary = loading
    ? {
        green: completedProviders.filter(p => p.status === "green").length,
        yellow: completedProviders.filter(p => p.status === "yellow").length,
        red: completedProviders.filter(p => p.status === "red").length,
      }
    : (scanResult?.summary || { green: 0, yellow: 0, red: 0 });

  const liveRecommendations = loading ? [] : (scanResult?.recommendations || []);
  
  const liveResearchedDetails = liveDetails || {
    business_name: (domain || "").split(".")[0]?.toUpperCase() || "Unresolved",
    domain: domain,
    industry: researchedCategory || "Classifying...",
    primary_city: "Global Focus",
    primary_state: "",
    country: "US",
    service_focuses: isVirtualDetected ? ["Virtual Operations"] : [],
    is_virtual: isVirtualDetected ?? false,
  };

  const consoleContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (consoleContainerRef.current) {
      consoleContainerRef.current.scrollTop = consoleContainerRef.current.scrollHeight;
    }
  }, [terminalLogs]);

  useEffect(() => {
    if (showDashboard) {
      setTimeout(() => {
        document.getElementById("results-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 150);
    }
  }, [showDashboard]);

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
    setIsRateLimited(false);
    setScanResult(null);
    setIsVirtualDetected(null);
    setProgressStage("initiated");
    setTerminalLogs([]);
    setStreamingProviders([]);
    setProviderCount(0);
    setResearchedCategory("");
    setFootprintRadius(null);
    setPromptsGenerated(null);
    setShowDashboard(false);
    setResearchedFacts([]);
    setLiveDetails(null);

    // Smoothly scroll down to the scan progress section
    setTimeout(() => {
      document.getElementById("scan-progress-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);

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
          user_id: mockUserSession ? mockUserSession.id : undefined,
        }),
      });

      if (!response.ok) {
        if (response.status === 403) {
          const errBody = await response.json().catch(() => ({ detail: "" }));
          setIsRateLimited(true);
          addLog("CRITICAL_BLOCK: Abuse detection threshold activated. Scan sequence terminated.");
          addLog(`[WARN] ${errBody.detail || "Rate limit exceeded. Paid subscription required."}`);
          setLoading(false);
          return;
        }
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
                  setResearchedFacts((prev) => [
                    ...prev,
                    { id: "init", label: "Registry Protocol", value: "Node Handshake Successful" },
                  ]);
                } else if (data.stage === "validated") {
                  setProgressStage("validated");
                  addLog("SYS_VAL: Input sanitization verified. Domain constraints resolved.");
                  setResearchedFacts((prev) => {
                    if (prev.some((f) => f.id === "val")) return prev;
                    return [
                      ...prev,
                      { id: "val", label: "Domain Verification", value: "Sanitized & Constraints Met" },
                    ];
                  });
                } else if (data.stage === "classification") {
                  setProgressStage("classification");
                  setIsVirtualDetected(data.is_virtual);
                  setResearchedCategory(data.industry || "");
                  setFootprintRadius(data.radius_miles ?? null);
                  setPromptsGenerated(data.prompts_generated ?? null);
                  addLog("LLM_NODE: Online business classification finished.");
                  addLog(`LLM_NODE: Researched category: "${data.industry.toUpperCase()}"`);
                  addLog(`LLM_NODE: Virtual storefront operation detected: ${data.is_virtual ? "TRUE" : "FALSE"}`);
                  addLog(`LLM_NODE: Search footprint index: radius of ${data.radius_miles} miles`);
                  addLog(`LLM_NODE: Injected query space: ${data.prompts_generated} specialized prompts.`);
                  
                  setResearchedFacts((prev) => {
                    const newFacts = [...prev];
                    if (!newFacts.some((f) => f.id === "ind")) {
                      newFacts.push({ id: "ind", label: "Researched Category", value: (data.industry || "Unresolved").toUpperCase() });
                    }
                    if (!newFacts.some((f) => f.id === "foot")) {
                      newFacts.push({ 
                        id: "foot", 
                        label: "Footprint Vector", 
                        value: data.is_virtual ? "Global Location-Free Space" : "Local Proximity Index" 
                      });
                    }
                    if (!newFacts.some((f) => f.id === "rad") && data.radius_miles != null) {
                      newFacts.push({ 
                        id: "rad", 
                        label: "Radial Footprint", 
                        value: `${data.radius_miles} Mile Proximity` 
                      });
                    }
                    if (!newFacts.some((f) => f.id === "prom")) {
                      newFacts.push({ 
                        id: "prom", 
                        label: "Scenarios Compiled", 
                        value: `${data.prompts_generated || 8} Context Scenarios` 
                      });
                    }
                    return newFacts;
                  });

                  // Trigger early detail fetch for business name and service focuses in background
                  (async () => {
                    try {
                      const detailsRes = await fetch(`${BACKEND_URL}/api/v1/scans/${data.scan_id || activeScanId}`);
                      if (detailsRes.ok) {
                        const fullScan = await detailsRes.json();
                        setLiveDetails({
                          business_name: fullScan.business_name,
                          domain: fullScan.business_domain,
                          industry: fullScan.business_industry,
                          primary_city: fullScan.business_city,
                          primary_state: fullScan.business_state,
                          country: "US",
                          service_focuses: fullScan.business_service_focuses || [],
                          is_virtual: fullScan.is_virtual ?? data.is_virtual ?? false,
                        });

                        setResearchedFacts((prev) => {
                          const newFacts = [...prev];
                          if (fullScan.business_name && !newFacts.some((f) => f.id === "name")) {
                            newFacts.unshift({ 
                              id: "name", 
                              label: "Resolved Entity", 
                              value: fullScan.business_name.toUpperCase() 
                            });
                          }
                          if (fullScan.business_service_focuses && fullScan.business_service_focuses.length > 0 && !newFacts.some((f) => f.id === "svc")) {
                            newFacts.push({ 
                              id: "svc", 
                              label: "Identified Offering", 
                              value: fullScan.business_service_focuses[0].toUpperCase() 
                            });
                          }
                          return newFacts;
                        });
                      }
                    } catch (e) {
                      console.error("Early details fetch error", e);
                    }
                  })();
                } else if (data.stage === "geocoding") {
                  setProgressStage("geocoding");
                  addLog("GEO_CO: Bypassing regional coordinates (using location-free vectors)...");
                  setResearchedFacts((prev) => {
                    if (prev.some((f) => f.id === "geo")) return prev;
                    return [
                      ...prev,
                      { id: "geo", label: "Geographic Expansion", value: "Indexed Location Proximity Vector" },
                    ];
                  });
                } else if (data.stage === "querying_providers") {
                  setProgressStage("querying_providers");
                  setProviderCount(data.provider_count ?? 0);
                  
                  addLog(`ENGINE: Dispatching ${data.prompt_count} prompts × ${data.provider_count} AI engines in parallel...`);
                  addLog("ENGINE: Results will stream in as each engine responds.");
                  
                  // Seed the engines with "loading" status instantly for instant visual loaders
                  if (data.providers && Array.isArray(data.providers)) {
                    const initial = data.providers.map((name: string) => ({
                      provider: name,
                      status: "loading",
                      score: 0,
                      mentioned: false,
                      actionable: false,
                      domain_match: false,
                      rank_position: null,
                      error: null,
                    }));
                    setStreamingProviders(initial);
                  }

                  // 6-second premium transition delay so the user can enjoy the orbiting text pills!
                  setTimeout(() => {
                    setShowDashboard(true);
                  }, 6000);
                }
              } else if (eventType === "provider_result") {
                setProgressStage("querying_providers");
                // Dashboard visibility is handled smoothly by the scheduled 3-second timer above
                const providerColor = data.status === "green" ? "🟢" : data.status === "yellow" ? "🟡" : "🔴";
                addLog(`ENGINE: ${data.provider.toUpperCase()} → ${providerColor} score=${data.score}/100, rank=${data.rank_position ?? "N/A"}`);
                if (data.error) {
                  addLog(`[WARN] ${data.provider.toUpperCase()} node error: ${data.error}`);
                }
                
                // Live incremental provider results update
                setStreamingProviders((prev) => {
                  const exists = prev.some((p) => p.provider === data.provider);
                  if (exists) {
                    return prev.map((p) => (p.provider === data.provider ? (data as ProviderResult) : p));
                  } else {
                    return [...prev, data as ProviderResult];
                  }
                });
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
          onClick={() => {
            if (mockUserSession) {
              setMockUserSession(null);
              alert("Logged out from simulated premium session. Free guest limits apply.");
            } else {
              setMockUserSession({
                id: "00000000-0000-0000-0000-000000000001",
                email: "manager@corporatefranchise.com",
                tier: "enterprise"
              });
              alert("Logged in as premium manager Alex Manager. Infinite scans unlocked!");
            }
          }}
          className="font-mono text-xs tracking-tighter bg-primary text-white px-6 py-2 hover:bg-primary-container transition-all uppercase"
        >
          {mockUserSession ? `[ ${mockUserSession.email.split("@")[0].toUpperCase()} (PREMIUM) / LOGOUT ]` : "SIGN_IN"}
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

              <div className="flex flex-col gap-4 w-full">
                <div className={`relative border p-[1px] bg-background transition-all duration-300 ${
                  inputFocused ? "border-primary" : "border-foreground"
                } ${loading ? "opacity-60 cursor-not-allowed" : ""}`}>
                  <input
                    id="hero-business-url"
                    type="text"
                    value={domain}
                    onChange={(e) => setDomain(e.target.value)}
                    placeholder="ENTER YOUR DOMAIN (E.G. HTTPS://YOURCOMPANY.COM)"
                    className="w-full bg-transparent border-none focus:outline-none font-mono text-xs py-4 px-5 uppercase placeholder:text-foreground/30 text-foreground disabled:cursor-not-allowed"
                    onFocus={() => setInputFocused(true)}
                    onBlur={() => setInputFocused(false)}
                    disabled={loading}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !loading) handleStartScan();
                    }}
                  />
                </div>
                <button
                  id="cta-check-visibility"
                  onClick={handleStartScan}
                  disabled={loading}
                  className={`w-full font-mono text-xs py-4 border transition-all uppercase font-bold tracking-widest cursor-pointer ${
                    loading 
                      ? "bg-foreground/5 text-text-muted border-foreground/10 cursor-not-allowed" 
                      : "bg-primary text-white border-primary hover:bg-transparent hover:text-primary"
                  }`}
                >
                  {loading ? "SCANNING_IN_PROGRESS..." : "Check My Visibility Score"}
                </button>
                {errorMsg && (
                  <span className="font-mono text-[10px] text-rose-600 uppercase font-bold">
                    [ERR] {errorMsg}
                  </span>
                )}
              </div>

              {scanResult && !loading && (
                <div className="mt-4">
                  <button
                    onClick={() => {
                      setScanResult(null);
                      setDomain("");
                      setProgressStage("");
                      setShowDashboard(false);
                      document.getElementById("top-nav")?.scrollIntoView({ behavior: "smooth" });
                    }}
                    className="font-mono text-[10px] bg-foreground text-background px-5 py-2.5 border border-foreground hover:bg-transparent hover:text-foreground transition-all uppercase font-bold cursor-pointer"
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

        {/* ── SSE REAL-TIME SCANS & DISPATCH PROGRESS SECTION ── */}
        {progressStage !== "" && (
          <section
            id="scan-progress-section"
            className={`px-6 md:px-10 border-b border-border bg-[#FAF9F6] relative overflow-hidden transition-all duration-[800ms] ease-in-out flex flex-col items-center justify-center ${
              showDashboard 
                ? "opacity-0 -translate-y-12 scale-95 max-h-0 py-0 overflow-hidden pointer-events-none border-b-0"
                : "opacity-100 translate-y-0 scale-100 max-h-[1200px] py-32 pointer-events-auto"
            }`}
          >
            {isRateLimited ? (
              <div className="w-full max-w-2xl flex flex-col items-center justify-center z-10">
                {/* Premium Glassmorphic Card */}
                <div className="w-full bg-white/40 backdrop-blur-xl border border-rose-500/20 p-8 md:p-12 flex flex-col items-center text-center shadow-2xl relative overflow-hidden mb-8">
                  {/* Subtle Red Grid Glow overlay */}
                  <div className="absolute inset-0 pointer-events-none bg-radial-gradient from-rose-500/5 to-transparent" />
                  
                  {/* Pulsing Shield Lock Icon */}
                  <div className="w-16 h-16 bg-rose-500/10 border border-rose-500/30 rounded-full flex items-center justify-center mb-6 animate-pulse">
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#f43f5e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
                      <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                    </svg>
                  </div>

                  <span className="font-mono text-xs text-rose-500 font-bold uppercase tracking-[0.2em] mb-3 block">
                    ◆ ACCESS BLOCKED — 3 GUEST SCAN LIMIT EXCEEDED ◆
                  </span>

                  <h2 className="font-display text-[1.8rem] md:text-[2.2rem] font-bold uppercase tracking-tight leading-tight mb-4 text-foreground">
                    Scan Limit Reached for {domain}
                  </h2>

                  <p className="font-sans text-sm text-text-muted max-w-lg mb-8 leading-relaxed">
                    AI engines like Gemini, ChatGPT, and Claude are actively ranking your competitors instead of you. Don't let your business get left behind in the LLM search race! Upgrade now to run comprehensive parity audits and unlock the Schema Recommendation Engine.
                  </p>

                  <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
                    <button
                      onClick={() => alert("Prototype Checkout: Complete paid subscription flow ($49/mo) to unlock infinite audits.")}
                      className="font-mono text-xs px-6 py-4 bg-primary text-white border border-primary font-bold hover:bg-transparent hover:text-primary transition-all uppercase tracking-widest cursor-pointer"
                    >
                      Unlock Full Audits ($49/mo)
                    </button>
                    <button
                      onClick={() => {
                        setIsRateLimited(false);
                        setDomain("");
                        setProgressStage("");
                        document.getElementById("top-nav")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="font-mono text-xs px-6 py-4 bg-transparent text-foreground border border-foreground/20 font-bold hover:bg-foreground hover:text-background transition-all uppercase tracking-widest cursor-pointer"
                    >
                      Audit New Domain
                    </button>
                  </div>
                </div>

                {/* Retro Blueprint Terminal Log Console */}
                <div className="w-full bg-[#0d1117] text-[#58a6ff] border border-[#21262d] rounded-lg p-6 font-mono text-[11px] leading-relaxed shadow-xl text-left">
                  <div className="flex justify-between items-center border-b border-[#21262d] pb-2 mb-3">
                    <span className="text-[#f0883e] font-bold uppercase tracking-wider animate-pulse flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 bg-[#f0883e] rounded-full"></span>
                      SYSTEM CORE CONSOLE — ERROR SYNC LOGS
                    </span>
                    <span className="text-text-muted text-[9px] uppercase">
                      CONNECTION TERMINATED
                    </span>
                  </div>
                  <div
                    ref={consoleContainerRef}
                    className="h-32 overflow-y-auto whitespace-pre-wrap select-text scrollbar-thin scrollbar-thumb-zinc-800"
                  >
                    {terminalLogs.map((log, index) => (
                      <div key={index} className="mb-1 text-rose-400">
                        {log}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <>
                {/* The Morphing & Spinning Ethereal Blob */}
                <div className="relative w-[240px] h-[240px] md:w-[320px] md:h-[320px] flex items-center justify-center mb-16 mt-8">
                  <div className="absolute inset-0 ethereal-blob transition-all duration-700"></div>
                  
                  {/* Overlay Grid Line Effect for premium look */}
                  <div className="absolute inset-0 pointer-events-none" style={{
                    backgroundImage: 'radial-gradient(var(--foreground) 1px, transparent 0)',
                    backgroundSize: '16px 16px',
                    opacity: 0.03
                  }}></div>

                  {/* FLOATING TEXT PILLS STREAMING LIVE */}
                  {researchedFacts.map((fact, idx) => {
                    const pos = FLOATING_POSITIONS[idx % FLOATING_POSITIONS.length];
                    return (
                      <div
                        key={fact.id}
                        className={`floating-pill floating-fact-enter-${(idx % 8) + 1} select-none`}
                        style={{
                          top: pos.top,
                          left: pos.left,
                          right: pos.right,
                          bottom: pos.bottom,
                        }}
                      >
                        <span className="font-mono text-[9px] text-primary/80 uppercase tracking-widest block mb-1 font-bold">
                          {fact.label}
                        </span>
                        <span className="font-sans text-xs font-black text-foreground uppercase tracking-tight whitespace-nowrap">
                          {fact.value}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Elegant Minimal Typography */}
                <div className="text-center max-w-2xl relative z-10">
                  <span className="font-mono text-xs text-primary font-bold uppercase tracking-[0.2em] mb-4 block animate-pulse">
                    Auditing AI Visibility
                  </span>
                  
                  <h2 className="font-display text-[2rem] md:text-[2.5rem] font-bold uppercase tracking-tight leading-tight mb-4">
                    Analyzing {domain}
                  </h2>
                  
                  <p className="font-mono text-[10px] text-text-muted uppercase tracking-widest leading-relaxed">
                    {progressStage === "initiated" && "Initializing secure node audit..."}
                    {progressStage === "validated" && "Validating input parameters..."}
                    {progressStage === "classification" && "Grounding service footprint & category constraints..."}
                    {progressStage === "geocoding" && "Mapping global proximity search indexes..."}
                    {progressStage === "querying_providers" && `Querying ${providerCount || 8} AI engines in parallel...`}
                    {progressStage === "complete" && "Generating search visibility report..."}
                  </p>
                </div>
              </>
            )}
          </section>
        )}

        {/* ── DETAILED RESULTS DASHBOARD (TEMPORARY DISPLAY SECTION) ── */}
        {(showDashboard || scanResult) && (
          <section 
            id="results-section" 
            className={`px-6 md:px-10 border-b border-border bg-surface-container-low transition-all duration-[1000ms] ease-in-out ${
              showDashboard 
                ? "opacity-100 translate-y-0 scale-100 max-h-[4000px] pointer-events-auto py-16" 
                : "opacity-0 translate-y-12 scale-95 max-h-0 py-0 overflow-hidden pointer-events-none border-b-0"
            }`}
          >
            <div className="max-w-7xl mx-auto mb-8 flex flex-col sm:flex-row justify-between items-start sm:items-end border-b border-foreground/10 pb-4 gap-4">
              <div>
                <span className="font-mono text-xs text-primary mb-2 uppercase tracking-[0.2em] block">
                  {loading ? "◆ AUDIT CURRENTLY RUNNING" : "REAL-TIME RESULTS DASHBOARD"}
                </span>
                <h2 className="font-display text-[2rem] font-bold tracking-tight uppercase leading-none">
                  Discovery Scorecard
                </h2>
              </div>
              <span className="font-mono text-[10px] text-text-muted mb-1 uppercase tracking-widest">
                {loading ? "◆ STREAMING PARALLEL NODES..." : "SYSTEM_NODE: ONLINE"}
              </span>
            </div>
            <ResultsDashboard
              overallScore={liveOverallScore}
              summary={liveSummary}
              recommendations={liveRecommendations}
              details={liveResearchedDetails}
              providerResults={activeResults}
              scanId={scanResult?.scanId}
              isScanning={loading}
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
